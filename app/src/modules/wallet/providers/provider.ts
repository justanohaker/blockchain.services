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
import { ChainTx, ChainTxIndex } from '../../../models/transactions.model';
import { PushPlatform, PushEventType } from '../../../modules/pusher/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { DespositDto } from '../wallet.dto';
import { IChainProvider } from './provider.interface';
import {
    TxDef,
    AddressValidator,
    TxChecker,
    TxAddAction,
    FromChainTxAction,
    ToChainTxAction
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

    async transfer(clientId: string, accountId: string, despositDto: DespositDto): Promise<string> {
        this.Logger?.log(`transfer ${clientId}, ${accountId}, ${JSON.stringify(despositDto, null, 2)}`);
        const toAddress = despositDto.address;
        const amount = despositDto.amount;
        const feePriority = despositDto.feePriority;
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
        try {
            const transferResult = await this.IService?.transfer({
                keyPair,
                address: toAddress,
                amount,
                feePriority
            });
            if (transferResult == null
                || !transferResult.success) {
                // failure
                const webhooks = await this.getWebHooks(clientId, accountId);
                for (const webhook of webhooks) {
                    this.PushService?.addPush(webhook.postUrl, {
                        type: PushEventType.TransactionCreated,
                        platform: this.PushPlatform,
                        data: {
                            status: false,
                            accountId: accountId,
                            address: keyPair.address,
                            error: `${
                                transferResult == null
                                    ? 'Bad Request!'
                                    : transferResult.error!
                                }`
                        }
                    })
                }
                this.Logger?.log(`transfer(failure): ${
                    transferResult == null
                        ? 'Unimplemented!'
                        : transferResult.error!
                    }`)
                throw new Error(
                    transferResult == null
                        ? 'Unimplemented!'
                        : `${transferResult.error!}`
                );
            }
            // BEGIN: push new transaction created??
            const webhooks = await this.getWebHooks(clientId, accountId);
            for (const webhook of webhooks) {
                this.PushService?.addPush(webhook.postUrl, {
                    type: PushEventType.TransactionCreated,
                    platform: this.PushPlatform,
                    data: {
                        status: true,
                        accountId: accountId,
                        address: keyPair.address,
                        txId: transferResult.txId!
                    }
                });
            }
            // END
            this.Logger?.log(`transer(success): ${transferResult.txId}`);
            return transferResult.txId!;
        } catch (error) {
            // failure
            const webhooks = await this.getWebHooks(clientId, accountId);
            for (const webhook of webhooks) {
                this.PushService?.addPush(webhook.postUrl, {
                    type: PushEventType.TransactionCreated,
                    platform: this.PushPlatform,
                    data: {
                        status: false,
                        accountId: accountId,
                        address: keyPair.address,
                        error: `${error}`,
                    }
                })
            }
            this.Logger?.log(`transfer(failure): ${error}`);
            throw error;
        }
    }

    async onNewAccount(addresses: string[]): Promise<void> {
        this.Logger?.log(`onNewAccount ${JSON.stringify(addresses, null, 2)}`);
        this.IService?.onNewAccounts(addresses);
        this.IService?.onUpdateBalances(addresses);
        // BEGIN: pusher new Account
        for (const address of addresses) {
            const accountRepo = await this.findAccountByAddress(address);
            if (!accountRepo) { continue; }
            const webhooks = await this.getWebHooks(
                accountRepo.clientId,
                accountRepo.accountId
            );
            for (const webhook of webhooks) {
                this.PushService?.addPush(webhook.postUrl, {
                    type: PushEventType.AccountNew,
                    platform: this.PushPlatform,
                    data: {
                        accountId: accountRepo.accountId,
                        address: accountRepo.address
                    }
                });
            }
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
        for (const bln of newBalances) {
            const { address, balance } = bln;
            const repo = await this.updateBalance(address, balance);
            if (!repo) { continue; }
            // BEGIN: push balance changed
            const webhooks = await this.getWebHooks(
                repo.clientId,
                repo.accountId
            );
            for (const webhook of webhooks) {
                this.PushService?.addPush(webhook.postUrl, {
                    type: PushEventType.BalanceUpdate,
                    platform: this.PushPlatform,
                    data: {
                        accountId: repo.accountId,
                        address: repo.address,
                        balance: bln.balance
                    }
                });
            }
            // END
        }
    }

    async onNewTransaction(newTransactions: Transaction[]): Promise<void> {
        this.Logger?.log(`onNewTransaction ${JSON.stringify(newTransactions, null, 2)}`);
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
                // if (ins.includes(account.address)) {
                //     this.Logger?.log(`notificationData: ${JSON.stringify({
                //         accountId: account.accountId,
                //         address: account.address,
                //         direction: TransactionDirection.In,
                //         transaction: repo.data
                //     }, null, 2)}`);
                // }
                // if (outs.includes(account.address)) {
                //     this.Logger?.log(`notificationData: ${JSON.stringify({
                //         accountId: account.accountId,
                //         address: account.address,
                //         direction: TransactionDirection.Out,
                //         transaction: repo.data
                //     }, null, 2)}`);
                // }
                const webhooks = await this.getWebHooks(
                    account.clientId,
                    account.accountId
                );
                for (const webhook of webhooks) {
                    if (ins.includes(account.address)) {
                        this.PushService?.addPush(webhook.postUrl, {
                            type: PushEventType.TransactionConfirmed,
                            platform: this.PushPlatform,
                            data: {
                                accountId: account.accountId,
                                address: account.address,
                                direction: TransactionDirection.In,
                                transaction: data
                            }
                        });
                    }

                    if (outs.includes(account.address)) {
                        this.PushService?.addPush(webhook.postUrl, {
                            type: PushEventType.TransactionConfirmed,
                            platform: this.PushPlatform,
                            data: {
                                accountId: account.accountId,
                                address: account.address,
                                direction: TransactionDirection.Out,
                                transaction: data
                            }
                        });
                    }
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
}
