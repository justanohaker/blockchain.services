import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IService } from '../../../blockchain/common/service.interface';
import { Transaction, BalanceDef, AccountKeyPair } from '../../../blockchain/common/types';
import { IServiceProvider } from '../../../blockchain/common/service.provider';
import {
    bipPrivpubFromMnemonic,
    bipGetAddressFromXPub,
    bipHexPrivFromxPriv,
    bipWIFFromxPriv
} from '../../../libs/helpers/bipHelper';
import { Token, TransactionDirection } from '../../../libs/types';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { Webhook } from '../../../models/user.webhook.model';
import { Account } from '../../../models/accounts.model';
import { Serial } from '../../../models/serial.model';
import { ChainTx, ChainTxIndex } from '../../../models/transactions.model';
import { PushPlatform, PushEventType } from '../../../modules/pusher/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { DespositDto, TransferWithFeeDto } from '../wallet.dto';
import { IChainProvider } from './provider.interface';
import {
    TxDef,
    AddressValidator,
    TxChecker,
    TxAddAction,
    FromChainTxAction,
    ToChainTxAction,
    TransferResult
} from './types';

export class Provider implements IChainProvider, IServiceProvider {
    // BEGIN: override by subclass
    // Token - 用于区分不同的Token
    protected readonly Token: Token;
    // IService - 持有不同Token对于IService的实现，用于与链交易
    protected readonly IService: IService;
    // PushPlatform - 推送平台(Token类型)
    protected readonly PushPlatform: PushPlatform;
    // AddressValidator - 地址验证器
    protected readonly AddressValidator: AddressValidator;
    // TxChecker - 交易检测器
    protected readonly TxChecker: TxChecker;
    // TxAddAction - 交易添加动作
    protected readonly TxAddAction: TxAddAction;
    // FromChainTxAction - 转换器(ChainTx -> TxDef)
    protected readonly FromChainTxAction: FromChainTxAction;
    // ToChainTxAction - 转换器(Transaction -> ChainTx)
    protected readonly ToChainTxAction: ToChainTxAction;
    // Logger - 日志对象
    protected readonly Logger: Logger;
    // PushService - 通知服务
    protected readonly PushService: PusherService;
    // BEGIN: Repository对象
    protected readonly ClientRepo: Repository<Client>;
    protected readonly UserRepo: Repository<User>;
    protected readonly AccountRepo: Repository<Account>;
    protected readonly SerialRepo: Repository<Serial>;
    protected readonly WebHookRepo: Repository<Webhook>;
    protected readonly ChainTxRepo: Repository<ChainTx>;
    protected readonly ChainTxIndexRepo: Repository<ChainTxIndex>;
    // END
    // END 
    constructor() { }

    // IChainProvider
    async addAccount(userRepo: User, secret: string): Promise<Account> {
        const privpub = await bipPrivpubFromMnemonic(secret, this.Token);
        const address = await bipGetAddressFromXPub(privpub.xpub, this.Token);
        const accountIns = new Account();
        accountIns.clientId = userRepo.clientId;
        accountIns.accountId = userRepo.accountId;
        accountIns.privkey = privpub.xpriv;
        accountIns.pubkey = privpub.xpub;
        accountIns.address = address;
        accountIns.balance = '0';
        accountIns.token = this.Token;

        const resultRepo = await this.AccountRepo.save(accountIns);
        // Maybe use cache??
        return resultRepo;
    }

    async retrieveAccount(clientId: string, accountId: string): Promise<Account> {
        const accountRepo = await this.AccountRepo.findOne({
            clientId,
            accountId,
            token: this.Token
        });
        return accountRepo;
    }

    async getTransactions(clientId: string, accountId: string): Promise<string[]> {
        if (!await this.exists(clientId, accountId)) {
            throw new Error('Parameter Error!');
        }
        const accountRepo = await this.retrieveAccount(clientId, accountId);
        const repos = await this.ChainTxIndexRepo.find({
            address: accountRepo.address,
            token: this.Token
        });
        const result: string[] = [];
        for (const repo of repos) {
            if (!result.includes(repo.txId)) {
                result.push(repo.txId);
            }
        }
        return result;
    }

    async getTransaction(clientId: string, accountId: string, txId: string): Promise<TxDef> {
        if (!await this.exists(clientId, accountId)) {
            throw new Error('Parameter Error!');
        }
        const accountRepo = await this.retrieveAccount(clientId, accountId);
        const checkTxExist = await this.ChainTxIndexRepo.count({
            address: accountRepo.address,
            txId,
            token: this.Token
        });
        if (checkTxExist <= 0) {
            throw new Error('Parameter Error!');
        }
        const repo = await this.ChainTxRepo.findOne({
            txId,
            token: this.Token
        });
        if (!repo) {
            throw new Error('Parameter Error!');
        }

        return await this.FromChainTxAction(repo);
    }

    async transfer(
        clientId: string,
        accountId: string,
        despositDto: DespositDto
    ): Promise<TransferResult> {
        this.Logger?.log(`transfer ${clientId}, ${accountId}, ${JSON.stringify(despositDto, null, 2)}`);
        const eventType = PushEventType.TransactionCreated;
        const serial = await this.loadAndIncrSerial(clientId, accountId, this.Token);
        let result: TransferResult = {
            success: true,
            serial
        };
        const toAddress = despositDto.address;
        const amount = despositDto.amount;
        const feePriority = despositDto.feePriority;
        try {
            if (!await this.AddressValidator(toAddress) ||
                !await this.exists(clientId, accountId)) {
                throw new Error('Parameter Error!');
            }
            const accountRepo = await this.retrieveAccount(clientId, accountId);
            const keyPair: AccountKeyPair = {
                privateKey: await bipHexPrivFromxPriv(
                    accountRepo.privkey,
                    this.Token
                ),
                wif: await bipWIFFromxPriv(
                    accountRepo.privkey,
                    this.Token
                ),
                address: accountRepo.address
            };
            const transferResult = await this.IService?.transfer({
                keyPair,
                address: toAddress,
                amount,
                feePriority
            });
            if (transferResult == null
                || !transferResult.success) {
                // failure
                const notificationData = {
                    status: false,
                    accountId,
                    address: keyPair.address,
                    serial,
                    error: `${transferResult == null ? 'Unimplemented!' : (transferResult.error!.toString())}`
                };
                this.pushNotification(clientId, accountId, eventType, notificationData);
                this.Logger?.log(`transfer(Failure): ${JSON.stringify(notificationData, null, 2)}`)
                throw new Error(transferResult == null ? 'Unimplemented!' : `${transferResult.error!}`);
            }
            // BEGIN: push new transaction created??
            const notificationData = {
                status: true,
                accountId,
                address: keyPair.address,
                serial,
                txId: transferResult.txId!
            }
            this.pushNotification(clientId, accountId, eventType, notificationData);
            // END
            this.Logger?.log(`transer(Success): ${JSON.stringify(notificationData, null, 2)}`);
            result.success = true;
            result.txId = transferResult.txId!;
        } catch (error) {
            // failure
            result.success = false;
            result.error = `${error}`;
            const accountRepo = await this.retrieveAccount(clientId, accountId);
            if (accountRepo) {
                const notificationData = {
                    status: false,
                    accountId,
                    address: accountRepo.address,
                    serial,
                    error: `${error}`,
                };
                this.pushNotification(clientId, accountId, eventType, notificationData);
                this.Logger?.log(`transfer(Exception): ${JSON.stringify(notificationData, null, 2)}`)
            } else {
                this.Logger?.log(`transfer(Exception): ${error}`);
                throw error;
            }
        }
        return result;
    }

    async transferWithFee(
        clientId: string,
        accountId: string,
        transferWithFeeDto: TransferWithFeeDto
    ): Promise<TransferResult> {
        this.Logger?.log(`transfer ${clientId}, ${accountId}, ${JSON.stringify(transferWithFeeDto, null, 2)}`);
        const eventType = PushEventType.TransactionCreated;
        const serial = await this.loadAndIncrSerial(clientId, accountId, this.Token);
        let result: TransferResult = {
            success: true,
            serial
        };
        const toAddress = transferWithFeeDto.address;
        const amount = transferWithFeeDto.amount;
        const fee = transferWithFeeDto.fee;
        try {
            if (!await this.AddressValidator(toAddress) ||
                !await this.exists(clientId, accountId)) {
                throw new Error('Parameter Error!');
            }
            const accountRepo = await this.retrieveAccount(clientId, accountId);
            const keyPair: AccountKeyPair = {
                privateKey: await bipHexPrivFromxPriv(
                    accountRepo.privkey,
                    this.Token
                ),
                wif: await bipWIFFromxPriv(
                    accountRepo.privkey,
                    this.Token
                ),
                address: accountRepo.address
            };
            const transferResult = await this.IService?.transferWithFee({
                keyPair,
                address: toAddress,
                amount,
                fee
            });
            if (transferResult == null
                || !transferResult.success) {
                // failure
                const notificationData = {
                    status: false,
                    accountId,
                    address: keyPair.address,
                    serial,
                    error: `${transferResult == null ? 'Unimplemented!' : (transferResult.error!.toString())}`
                };
                this.pushNotification(clientId, accountId, eventType, notificationData);
                this.Logger?.log(`transfer(Failure): ${JSON.stringify(notificationData, null, 2)}`)
                throw new Error(transferResult == null ? 'Unimplemented!' : `${transferResult.error!}`);
            }
            // BEGIN: push new transaction created??
            const notificationData = {
                status: true,
                accountId,
                address: keyPair.address,
                serial,
                txId: transferResult.txId!
            }
            this.pushNotification(clientId, accountId, eventType, notificationData);
            // END
            this.Logger?.log(`transer(Success): ${JSON.stringify(notificationData, null, 2)}`);
            result.success = true;
            result.txId = transferResult.txId!;
        } catch (error) {
            // failure
            result.success = false;
            result.error = `${error}`;
            const accountRepo = await this.retrieveAccount(clientId, accountId);
            if (accountRepo) {
                const notificationData = {
                    status: false,
                    accountId,
                    address: accountRepo.address,
                    serial,
                    error: `${error}`,
                };
                this.pushNotification(clientId, accountId, eventType, notificationData);
                this.Logger?.log(`transfer(Exception): ${JSON.stringify(notificationData, null, 2)}`)
            } else {
                this.Logger?.log(`transfer(Exception): ${error}`);
                throw error;
            }
        }
        return result;
    }

    async onNewAccount(addresses: string[]): Promise<void> {
        this.Logger?.log(`onNewAccount ${JSON.stringify(addresses, null, 2)}`);
        const eventType = PushEventType.AccountNew;
        this.IService?.onNewAccounts(addresses);
        this.IService?.onUpdateBalances(addresses);
        // BEGIN: pusher new Account
        for (const address of addresses) {
            const accountRepo = await this.findAccountByAddress(address);
            if (!accountRepo) { continue; }
            const { clientId, accountId } = accountRepo;
            const notificationData = { accountId, address };
            this.pushNotification(clientId, accountId, eventType, notificationData);
        }
        // END
    }
    // IServiceProvider
    async getAddresses(): Promise<string[]> {
        // Maybe need cache??
        const repos = await this.AccountRepo.find({
            token: this.Token
        });
        const addresses: string[] = [];
        for (const repo of repos) {
            addresses.push(repo.address);
        }
        return addresses;
    }

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {
        this.Logger?.log(`onBalanceChanged ${JSON.stringify(newBalances, null, 2)}`);
        const eventType = PushEventType.BalanceUpdate;
        for (const bln of newBalances) {
            const { address, balance } = bln;
            const repo = await this.updateBalance(address, balance);
            if (!repo) { continue; }
            // BEGIN: push balance changed
            const { clientId, accountId } = repo;
            const notificationData = { accountId, address, balance };
            this.pushNotification(clientId, accountId, eventType, notificationData);
            // END
        }
    }

    async onNewTransaction(newTransactions: Transaction[]): Promise<void> {
        this.Logger?.log(`onNewTransaction ${JSON.stringify(newTransactions, null, 2)}`);
        const eventType = PushEventType.TransactionConfirmed;
        for (const transaction of newTransactions) {
            if (!await this.TxChecker(transaction)) {
                continue;
            }
            const repo = await this.TxAddAction(transaction);
            if (!repo || repo.accounts.length <= 0) {
                continue;
            }

            // BEGIN: push new transaction confirmed
            const addresses: string[] = [];
            const { accounts, data, ins, outs } = repo;
            for (const account of accounts) {
                if (!addresses.includes(account.address)) {
                    addresses.push(account.address);
                }
                const { clientId, accountId, address } = account;
                if (ins.includes(address)) {
                    const notificationData = {
                        accountId,
                        address,
                        direction: TransactionDirection.Out,
                        transaction: data
                    };
                    this.pushNotification(clientId, accountId, eventType, notificationData);
                    this.Logger?.log(`notificationData: ${JSON.stringify(notificationData, null, 2)}`);
                }
                if (outs.includes(address)) {
                    const notificationData = {
                        accountId,
                        address,
                        direction: TransactionDirection.In,
                        transaction: data
                    };
                    this.pushNotification(clientId, accountId, eventType, notificationData);
                    this.Logger?.log(`notificationData: ${JSON.stringify(notificationData, null, 2)}`);
                }
            }
            // END
            this.IService?.onUpdateBalances(addresses);
        }

    }

    // helpers
    protected async exists(clientId: string, accountId: string): Promise<boolean> {
        const clientRepo = await this.ClientRepo.findOne({ id: clientId });
        if (!clientRepo) { return false; }
        const userRepo = await this.UserRepo.findOne({ clientId, accountId });
        if (!userRepo) { return false; }
        return true;
    }

    protected async getWebHooks(clientId: string, accountId: string): Promise<Webhook[]> {
        void (accountId);
        const webhookRepo = await this.WebHookRepo.find({ clientId });
        return webhookRepo || [];
    }

    protected async updateBalance(address: string, balance: string): Promise<Account> {
        let accountRepo = await this.AccountRepo.findOne({
            address,
            token: this.Token
        });
        if (!accountRepo) { return null; }
        accountRepo.balance = balance;
        accountRepo = await this.AccountRepo.save(accountRepo);
        return accountRepo;
    }

    protected async findAccountByAddress(address: string): Promise<Account> {
        // Maybe need cache??
        const accountRepo = await this.AccountRepo.findOne({
            address,
            token: this.Token
        });
        return accountRepo;
    }

    protected async createChainTxIfNotExists(chainTx: ChainTx): Promise<boolean> {
        const found = await this.ChainTxRepo.findOne({
            txId: chainTx.txId,
            token: chainTx.token
        });
        if (!found) {
            await this.ChainTxRepo.save(chainTx);
        }
        return !found;
    }

    protected async createChainTxIndexIfNotExists(chainTxIndex: ChainTxIndex): Promise<boolean> {
        const found = await this.ChainTxIndexRepo.findOne({
            txId: chainTxIndex.txId,
            address: chainTxIndex.address,
            isSender: chainTxIndex.isSender,
            token: chainTxIndex.token
        });
        if (!found) {
            await this.ChainTxIndexRepo.save(chainTxIndex);
        }
        return !found;
    }

    protected async loadAndIncrSerial(clientId: string, accountId: string, token: Token): Promise<number> {
        let serialRepo = await this.SerialRepo.findOne({
            clientId,
            accountId,
            token
        });
        if (!serialRepo) {
            serialRepo = new Serial();
            serialRepo.clientId = clientId;
            serialRepo.accountId = accountId;
            serialRepo.token = token;
            serialRepo.serial = 0;
        }

        serialRepo.serial += 1;
        const serialNo = serialRepo.serial;
        await this.SerialRepo.save(serialRepo);
        return serialNo;
    }

    protected async pushNotification(
        clientId: string,
        accountId: string,
        eventType: PushEventType,
        data: Object
    ): Promise<void> {
        const webhooks = await this.getWebHooks(clientId, accountId);
        if (!webhooks || webhooks.length <= 0) {
            return;
        }

        for (const webhook of webhooks) {
            this.PushService?.addPush(webhook.postUrl, {
                type: eventType,
                platform: this.PushPlatform,
                data,
            });
        }
    }
}
