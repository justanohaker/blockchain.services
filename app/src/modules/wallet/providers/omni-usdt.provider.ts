import { Injectable, OnApplicationBootstrap, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Token } from '../../../libs/types';
import { addressIsBitcoin } from '../../../libs/helpers/addressHelper';
import { bipWIFFromxPriv, bipHexPrivFromxPriv } from '../../../libs/helpers/bipHelper';
import { OmniUsdtService } from '../../../blockchain/omni-tokens/omni-usdt/omni-usdt.service';
import { Transaction, AccountKeyPair, BlockDef } from '../../../blockchain/common/types';
import { OmniUsdtTransactin } from '../../../blockchain/common/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { PushPlatform, PushEventType } from '../../../modules/pusher/types';
import { Client } from '../../../models/clients.model';
import { ClientPayed } from '../../../models/client-payed.model';
import { User } from '../../../models/users.model';
import { Serial } from '../../../models/serial.model';
import { Webhook } from '../../../models/user.webhook.model';
import { Account } from '../../../models/accounts.model';
import { ChainTx, ChainTxIndex, ChainTxOmniData } from '../../../models/transactions.model';
import { Provider } from './provider';
import {
    OmniUsdtDef,
    AddressValidator,
    TxChecker,
    TxAddAction,
    TxAddActionResult,
    FromChainTxAction,
    ToChainTxAction,
    TransferTask,
    TransferInternalTask
} from './types';

const SchedTimeout = 500;
const MaxConfirmed = 2;

@Injectable()
export class OmniUsdtProvider extends Provider implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap {
    public readonly Logger: Logger = new Logger('OmniUsdtProvider', true);
    private schedHandler: NodeJS.Timeout;
    private tasksFilePath: string;
    constructor(
        @InjectRepository(Client) public readonly ClientRepo: Repository<Client>,
        @InjectRepository(User) public readonly UserRepo: Repository<User>,
        @InjectRepository(Webhook) public readonly WebHookRepo: Repository<Webhook>,
        @InjectRepository(Account) public readonly AccountRepo: Repository<Account>,
        @InjectRepository(Serial) public readonly SerialRepo: Repository<Serial>,
        @InjectRepository(ChainTx) public readonly ChainTxRepo: Repository<ChainTx>,
        @InjectRepository(ChainTxIndex) public readonly ChainTxIndexRepo: Repository<ChainTxIndex>,
        @InjectRepository(ClientPayed) public readonly ClientPayedRepo: Repository<ClientPayed>,
        public readonly PushService: PusherService,
        public readonly IService: OmniUsdtService
    ) {
        super();

        this.txCheck = this.txCheck.bind(this);
        this.txAdd = this.txAdd.bind(this);
        this.fromChainTx = this.fromChainTx.bind(this);
        this.toChainTx = this.toChainTx.bind(this);

        this.transferScheduler = this.transferScheduler.bind(this);
        // this.schedHandler = setTimeout(this.transferScheduler, SchedTimeout);

        this.tasksFilePath = path.resolve(path.join(__dirname, '../../../../', 'omni_usdt.tasks.dat'));
    }

    // BEGIN: override properties
    get Token(): Token { return Token.OMNI_USDT; }
    get PushPlatform(): PushPlatform { return PushPlatform.OMNI_USDT; }
    get AddressValidator(): AddressValidator { return addressIsBitcoin; }
    get TxChecker(): TxChecker { return this.txCheck; }
    get TxAddAction(): TxAddAction { return this.txAdd; }
    get FromChainTxAction(): FromChainTxAction { return this.fromChainTx; }
    get ToChainTxAction(): ToChainTxAction { return this.toChainTx; }
    // END

    async onModuleInit() {
        this.schedHandler = setTimeout(this.transferScheduler, SchedTimeout);

        try {
            const storedFileData = fs.readFileSync(this.tasksFilePath, { encoding: 'utf8' });
            const tasksConv = new Map();
            const tasksRaw = JSON.parse(storedFileData);
            this.Logger.log(`onModuleInit[tasks]:`, JSON.stringify(tasksRaw));
            for (const task of tasksRaw) {
                if (task.length < 2) { continue; }
                tasksConv.set(task[0], task[1]);
            }
            this.tasks = tasksConv;
        } catch (error) { }
    }

    async onModuleDestroy() {
        if (this.schedHandler) {
            clearTimeout(this.schedHandler);
            this.schedHandler = null;
        }

        try {
            const tasksConv = [];
            for (const entry of this.tasks) {
                tasksConv.push(entry);
            }
            const tasksStr = JSON.stringify(tasksConv);
            fs.writeFileSync(this.tasksFilePath, tasksStr, { encoding: 'utf8' });
            this.Logger.log(`backup omni_usdt.tasks.dat:${tasksStr}`);
        } catch (error) { }
    }

    async onApplicationBootstrap() {
        this.IService?.setProvider(this);

        const allAddresses = await this.getAddresses();
        this.IService?.onUpdateBalances(allAddresses);

        for (const key of this.tasks.keys()) {
            const tasks = this.tasks.get(key);
            if (tasks.length <= 0) {
                continue
            }

            const task = tasks[0];
            if (task.preTxId && task.preTxIdBlockedHeight < 0) {
                // 获取交易打包高度
                try {
                    const result = await this.IService?.getTransactionInfo(task.preTxId);
                    if (result.blocked) {
                        task.preTxIdBlockedHeight = result.blockHeight;
                    }
                } catch (error) { }
            }
        }
    }

    private async txCheck(transaction: Transaction): Promise<boolean> {
        const btcTr = transaction as OmniUsdtTransactin;
        return (btcTr.type === 'bitcoin' && btcTr.sub === 'omni_usdt');
    }

    private async txAdd(transaction: Transaction): Promise<TxAddActionResult> {
        const omni = transaction as OmniUsdtTransactin;
        const senderRepo = await this.findAccountByAddress(omni.sending);
        const referenceRepo = await this.findAccountByAddress(omni.reference);
        if (!senderRepo && !referenceRepo) { return null; }
        const chainTxIns = await this.ToChainTxAction(omni);
        await this.createChainTxIfNotExists(chainTxIns);
        const result: Account[] = [];
        const senderIndexIns = new ChainTxIndex();
        senderIndexIns.txId = omni.txId;
        senderIndexIns.address = omni.sending;
        senderIndexIns.isSender = true;
        senderIndexIns.token = this.Token;
        if (await this.createChainTxIndexIfNotExists(senderIndexIns)
            && senderRepo) {
            result.push(senderRepo);
        }
        const recipientIndexIns = new ChainTxIndex();
        recipientIndexIns.txId = omni.txId;
        recipientIndexIns.address = omni.reference;
        recipientIndexIns.isSender = false;
        recipientIndexIns.token = this.Token;
        if (await this.createChainTxIndexIfNotExists(recipientIndexIns)
            && referenceRepo) {
            result.push(referenceRepo);
        }
        return {
            data: {
                txId: omni.txId,
                blockHeight: omni.blockHeight,
                blockTime: omni.blockTime,
                propertyId: omni.propertyId,
                version: omni.version,
                typeInt: omni.typeInt,
                fee: omni.fee,
                sending: omni.sending,
                reference: omni.reference,
                amount: omni.amount
            } as OmniUsdtDef,
            ins: [omni.sending],
            outs: [omni.reference],
            accounts: result
        };
    }

    private async toChainTx(src: OmniUsdtTransactin): Promise<ChainTx> {
        const chainTxIns = new ChainTx();
        chainTxIns.txId = src.txId;
        chainTxIns.txData = {
            blockHeight: src.blockHeight,
            blockTime: src.blockTime,
            propertyId: src.propertyId,
            version: src.version,
            typeInt: src.typeInt,
            fee: src.fee,
            sending: src.sending,
            reference: src.reference,
            amount: src.amount
        } as ChainTxOmniData;
        chainTxIns.token = this.Token;
        return chainTxIns;
    }

    private async fromChainTx(transaction: ChainTx): Promise<OmniUsdtDef> {
        const { txId, txData, token } = transaction;
        if (token !== Token.OMNI_USDT) {
            return null;
        }
        const omniData = txData as ChainTxOmniData;
        return {
            txId: txId,
            blockHeight: omniData.blockHeight,
            blockTime: omniData.blockTime,
            propertyId: omniData.propertyId,
            version: omniData.version,
            typeInt: omniData.typeInt,
            fee: omniData.fee,
            sending: omniData.sending,
            reference: omniData.reference,
            amount: omniData.amount
        } as OmniUsdtDef
    }

    protected async pushTransferTask(task: TransferTask): Promise<void> {
        const {
            clientId,
            accountId,
            address,
            amount,
            fee,
            businessId,
            callbackURI
        } = task;
        const sender = await this.retrieveAccount(clientId, accountId);
        let tasks = this.tasks.get(sender.address);
        if (tasks == null) {
            tasks = [];
            this.tasks.set(sender.address, tasks);
        }
        tasks.push({
            clientId,
            accountId,
            address,
            amount,
            fee,
            businessId,
            callbackURI,
            preTxId: null,
            preTxIdBlockedHeight: -1,
            preTxConfirmed: -1,
        });

    }

    private transferScheduler() {
        this.schedHandler = null;
        (async () => {
            for (const key of this.tasks.keys()) {
                const tasks = this.tasks.get(key);
                if (tasks.length <= 0) {
                    continue;
                }

                const task = tasks[0];
                const { clientId, accountId, amount, fee, preTxId, preTxConfirmed, } = task;
                const sender = await this.retrieveAccount(clientId, accountId);
                const payAccount = await this.ClientPayedRepo.findOne({ clientId, token: this.Token });
                preTxId == null && this.Logger.log(`transferSched[start]-${JSON.stringify(task)},${sender.address}`);
                if (preTxId == null) {
                    // TODO
                    // this.Logger.log(`transferSched[checkCondition]-${sender.address},${amount},${fee}`)
                    // if (await this.needPrepareTransferAction(sender.address, amount, fee)) {
                    //     this.Logger.log(`transferSched[conditionTrue]-${JSON.stringify(sender)},${JSON.stringify(task)}`);
                    //     await this.postTransfer(payAccount, sender, task);
                    //     tasks.splice(0, 1);
                    // } else {
                    //     try {
                    //         this.Logger.log(`transferSched[conditionFalse]-${JSON.stringify(payAccount)},${JSON.stringify(sender)},${JSON.stringify(task)}`)
                    //         const txId = await this.prepareTransfer(payAccount, sender, task);
                    //         if (txId) {
                    //             task.preTxId = txId;
                    //             task.preTxConfirmed = 0;
                    //         }
                    //     } catch (error) { }
                    // }
                    try {
                        this.Logger.log(`transferSched[prepareTransfer]-${JSON.stringify(payAccount)},${JSON.stringify(sender)},${JSON.stringify(task)}`)
                        const txId = await this.prepareTransfer(payAccount, sender, task);
                        if (txId) {
                            task.preTxId = txId;
                            task.preTxConfirmed = 0;
                        }
                    } catch (error) { }
                    continue;
                }
                if (preTxId && preTxConfirmed >= MaxConfirmed) {
                    this.Logger.log(`transferSched[prepareTransferConfirmed]-${JSON.stringify(sender)},${JSON.stringify(task)}`);
                    await this.postTransfer(payAccount, sender, preTxId, task);
                    tasks.splice(0, 1);
                    continue;
                }
            }
        })()
            .catch((error) => { /* // TODO */ })
            .finally(() => this.schedHandler = setTimeout(this.transferScheduler, SchedTimeout));
    }

    private async needPrepareTransferAction(address: string, amount: string, fee: string): Promise<boolean> {
        let result: boolean = true;
        try {
            result = await this.IService?.isBalanceEnought(address, amount, fee);
        } catch (error) { }
        return result;
    }

    private async postTransfer(
        payAccount: ClientPayed,
        account: Account,
        prepareTxId: string,
        task: TransferInternalTask
    ): Promise<void> {
        const { accountId, address, amount, fee, businessId, callbackURI } = task;
        const payedKeyPair = {
            privateKey: await bipHexPrivFromxPriv(payAccount.privkey, this.Token),
            wif: await bipWIFFromxPriv(payAccount.privkey, this.Token),
            address: payAccount.address,
        } as AccountKeyPair;
        const senderKeyPair = {
            privateKey: await bipHexPrivFromxPriv(account.privkey, this.Token),
            wif: await bipWIFFromxPriv(account.privkey, this.Token),
            address: account.address
        } as AccountKeyPair;
        try {
            const transfer = await this.IService?.transferWithFee({
                payedKeyPair,
                keyPair: senderKeyPair,
                address,
                amount,
                fee,
                inputTxId: prepareTxId
            });
            const { success, error, txId } = transfer;
            if (success) {
                // TODO
                const notification = {
                    status: true,
                    accountId,
                    address: account.address,
                    businessId,
                    txId
                }
                this.Logger.log(`postTransfer[success]:${account.clientId},${account.accountId},${JSON.stringify(notification)}`);
                this.pushNotificationWithURI(
                    callbackURI,
                    PushEventType.TransactionCreated,
                    notification
                );
            } else {
                // TODO: 这里失败的情况是否需要尝试
                const notification = {
                    status: false,
                    accountId,
                    address: account.address,
                    businessId,
                    error
                };
                this.Logger.log(`postTransfer[failure]:${account.clientId},${account.accountId},${JSON.stringify(notification)}`);
                this.pushNotificationWithURI(
                    callbackURI,
                    PushEventType.TransactionCreated,
                    notification
                );
            }
        } catch (error) {
            const notification = {
                status: false,
                accountId,
                address: account.address,
                businessId,
                error: `${error}`,
            };
            this.Logger.log(`postTransfer[exception]:${account.clientId},${account.accountId},${JSON.stringify(notification)}`);
            this.pushNotificationWithURI(
                callbackURI,
                PushEventType.TransactionCreated,
                notification
            );
        }
    }

    private async prepareTransfer(payAccount: ClientPayed, account: Account, task: TransferInternalTask): Promise<string> {
        const { address, amount, fee } = task;
        const payedKeyPair = {
            privateKey: await bipHexPrivFromxPriv(payAccount.privkey, this.Token),
            wif: await bipWIFFromxPriv(payAccount.privkey, this.Token),
            address: payAccount.address,
        } as AccountKeyPair;
        const senderKeyPair = {
            privateKey: await bipHexPrivFromxPriv(account.privkey, this.Token),
            wif: await bipWIFFromxPriv(account.privkey, this.Token),
            address: account.address,
        } as AccountKeyPair;
        try {
            const transfer = await this.IService?.prepareTransfer({
                payedKeyPair,
                keyPair: senderKeyPair,
                address,
                amount,
                fee
            });
            const { success, error, txId } = transfer;
            if (!success) {
                // TODO: 这里的失败的情况是否需要尝试
                throw new Error(`${error}`);
            }
            this.Logger.log(`prepareTransfer[success]:${account.clientId},${account.accountId},${txId}`);
            return txId;
        } catch (error) {
            this.Logger.log(`prepareTransfer[failure]:${account.clientId},${account.accountId},${error}`);
            throw error;
        }
    }

    // callbacks
    async onBTCTransaction(transactions: Transaction[]): Promise<void> {
        // this.Logger.log(`onBTCTransaction with ${transactions.length}transactions`);

        const txIds: Map<string, Transaction> = new Map();
        transactions.forEach((value: Transaction) => txIds.set(value.txId, value));

        for (const key of this.tasks.keys()) {
            const tasks = this.tasks.get(key);
            if (tasks.length <= 0) {
                continue;
            }

            const task = tasks[0];
            if (task.preTxId && txIds.has(task.preTxId)) {
                const transaction = txIds.get(task.preTxId);
                task.preTxIdBlockedHeight = transaction.blockHeight;
            }
        }
    }

    async onNewBlock(block: BlockDef): Promise<void> {
        await super.onNewBlock(block);

        // this.Logger.log(`onNewBlock on BlockHeight(${block.height})`);

        for (const key of this.tasks.keys()) {
            const tasks = this.tasks.get(key);
            if (tasks.length <= 0) {
                continue;
            }

            const task = tasks[0];
            this.Logger.log(`onNewBlock - task:${task.businessId},preTxId:${task.preTxId},preBlockHeight:${task.preTxIdBlockedHeight}`);
            if (task.preTxId && task.preTxIdBlockedHeight > 0) {
                task.preTxConfirmed = block.height - task.preTxIdBlockedHeight;
                // task.preTxConfirmed++;
            }
        }
    }
}
