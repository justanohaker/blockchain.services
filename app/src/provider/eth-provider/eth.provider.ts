import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { IServiceProvider } from '../../blockchain/common/service.provider';
import { BalanceDef, Transaction, EthereumTransaction } from '../../blockchain/common/types';
import { IService } from '../../blockchain/common/service.interface';
import { TransactionRole } from '../../libs/libs.types';
import { IServiceGetter } from '../../libs/interfaces/iservice-getter.interface';
import { ITransactionGetter } from '../../libs/interfaces/itransaction-getter.interface';
import { IUserChanger } from '../../libs/interfaces/iuser-changed.interface';
import { EthaccountsCurd } from '../../curds/ethaccounts-curd';
import { EthtransactionsCurd } from '../../curds/ethtransactions-curd';
import { WebhooksCurd } from '../../curds/webhooks-curd';
import { EthService } from '../../blockchain/eth/eth.service';
import { NotifierService } from '../../notifier/notifier.service';

@Injectable()
export class EthProvider
    implements IServiceProvider, IServiceGetter, ITransactionGetter, IUserChanger, OnApplicationBootstrap {
    private _service: IService;
    private _onDirtyCallback: () => Promise<void>;
    private _cachedAddresses?: string[] = null;
    constructor(
        private readonly ethAccountCurd: EthaccountsCurd,
        private readonly ethTransactionCurd: EthtransactionsCurd,
        private readonly webhooksCurd: WebhooksCurd,
        private readonly ethService: EthService,
        private readonly notifyService: NotifierService
    ) {
        // this._service = this.ethService;
        // this._service.setProvider(this);

        if (this.ethService instanceof IService) {
            this._service = this.ethService;
            console.log('EthProvider.serProvider');
            this._service.setProvider(this);
        }
    }

    async onApplicationBootstrap(): Promise<void> {
        const validAddresses = await this.getValidAddresses();

        // update all balances
        try {
            this.ethService.onUpdateBalances(validAddresses);
            // update transaction history
            //TODO
        } catch (error) { }
    }

    /**
     * @note override IServiceGetter 
     */
    get Service(): IService {
        return this._service;
    }

    /**
     * @note override ITransactionGetter->getTransactions
     */
    async getTransactions(uid: string, mode: TransactionRole): Promise<Transaction[]> {
        const findRepo = await this.ethAccountCurd.findByUid(uid);
        if (!findRepo) {
            throw new Error(`User(${uid}) not exists!`);
        }

        let cond: any = null;
        if (mode === TransactionRole.SENDER) {
            cond = {
                where: [
                    { sender: findRepo.address }
                ]
            };
        } else if (mode === TransactionRole.RECIPIENT) {
            cond = {
                where: [
                    { recipient: findRepo.address }
                ]
            };
        } else {
            cond = {
                where: [
                    { sender: findRepo.address },
                    { recipient: findRepo.address }
                ]
            };
        }
        cond.order = { blockHeight: 'DESC', txId: 'DESC', nonce: 'DESC' }

        // console.log('EthProvider.getBalances cond:', JSON.stringify(cond, null, 2));
        const validTrRepos = await this.ethTransactionCurd.find(cond);
        const result: Transaction[] = [];
        for (const repo of validTrRepos) {
            const tr: EthereumTransaction = {
                type: 'ethereum',
                sub: 'eth',
                txId: repo.txId,
                blockHeight: repo.blockHeight,
                nonce: repo.nonce,
                sender: repo.sender,
                recipient: repo.recipient,
                amount: repo.amount
            };
            result.push(tr);
        }
        return result;
    }

    /**
     * @note override ITransactionGetter->getTransactionById
     */
    async getTransactionById(txId: string): Promise<Transaction> {
        const findRepo = await this.ethTransactionCurd.findOne({ txId });
        if (!findRepo) {
            throw new Error(`TxId(${txId}) not exists!`);
        }

        const result: EthereumTransaction = {
            type: 'ethereum',
            sub: 'eth',
            txId: findRepo.txId,
            blockHeight: findRepo.blockHeight,
            nonce: findRepo.nonce,
            sender: findRepo.sender,
            recipient: findRepo.recipient,
            amount: findRepo.amount
        };

        return result;
    }

    /**
     * @note override IUserChanger->onUserChanged
     */
    async onUserChanged(): Promise<void> {
        const findRepos = await this.ethAccountCurd.find({});
        const newValidAddresses: string[] = [];
        for (const repo of findRepos) {
            newValidAddresses.push(repo.address);
        }
        this._cachedAddresses = newValidAddresses;
        this._onDirtyCallback && await this._onDirtyCallback();
    }

    async getValidAddresses(): Promise<string[]> {
        if (this._cachedAddresses == null) {
            const findRepos = await this.ethAccountCurd.find({});
            const validAddresses: string[] = [];
            for (const repo of findRepos) {
                validAddresses.push(repo.address);
            }
            this._cachedAddresses = validAddresses;
        }
        console.log('EthProvider.getValidAddresses:', this._cachedAddresses);
        return this._cachedAddresses;
    }

    async setDirtyFn(fn: () => Promise<void>): Promise<void> {
        this._onDirtyCallback = fn;

        await this._onDirtyCallback();
    }

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {
        for (const a of newBalances) {
            const { address, balance } = a;
            await this.ethAccountCurd.updateBalanceByAddress(address, balance);
            // notify
            const notificationProps = await this.getNotificationProp(address);
            if (!notificationProps) {
                continue;
            }
            for (const url of notificationProps.urls) {
                this.notifyService.addEthBalanceNotification({
                    url,
                    uid: notificationProps.uid,
                    address,
                    balance
                });
            }
            // end notify
        }
    }

    async onNewTransaction(newTrs: Transaction[]): Promise<void> {
        for (const t of newTrs) {
            if (t.type !== 'ethereum' || t.sub !== 'eth') {
                //TODO: Unsupported!!
                continue;
            }

            const {
                txId,
                blockHeight,
                nonce,
                sender,
                recipient,
                amount
            } = t;
            console.log('EthProvider.onNewTransaction ' +
                `(${txId}, ${blockHeight}, ${sender}, ${recipient}, ${amount})`);
            const addResult = await this.ethTransactionCurd.add(
                txId,
                blockHeight,
                nonce,
                sender,
                recipient,
                amount
            );
            if (!addResult) continue;
            // notify
            const senderNotificationRepos = await this.getNotificationProp(sender);
            if (senderNotificationRepos) {
                for (const url of senderNotificationRepos.urls) {
                    this.notifyService.addEthTransactionNotification({
                        uid: senderNotificationRepos.uid,
                        txId,
                        url,
                        blockHeight,
                        nonce,
                        sender,
                        recipient,
                        amount
                    });
                }
                try {
                    await this.ethService.onUpdateBalances([sender]);
                } catch (error) { }
            }
            const recipientNotificationRepos = await this.getNotificationProp(recipient);
            if (recipientNotificationRepos) {
                for (const url of recipientNotificationRepos.urls) {
                    this.notifyService.addEthTransactionNotification({
                        uid: recipientNotificationRepos.uid,
                        txId,
                        url,
                        blockHeight,
                        nonce,
                        sender,
                        recipient,
                        amount
                    });
                }

                try {
                    await this.ethService.onUpdateBalances([recipient]);
                } catch (error) { }
            }
            // end notify
        }
    }

    async getBalanceOnline(addresses: string[]): Promise<BalanceDef[]> {
        const result: BalanceDef[] = [];

        try {
            const balances = await this.ethService.getBalance(addresses);
            if (balances.success) {
                for (const i of balances.result) {
                    result.push(i);
                }
            } else {
                for (const addr of addresses) {
                    result.push({ address: addr, balance: '0' });
                }
            }
        } catch (error) {
            for (const addr of addresses) {
                result.push({ address: addr, balance: '0' });
            }
        }

        return result;
    }

    private async getNotificationProp(address: string): Promise<{ urls: string[]; uid: string }> {
        const findUidRepo = await this.ethAccountCurd.findOne({ address });
        if (!findUidRepo) {
            return null;
        }
        const findWebhookRepos = await this.webhooksCurd.findByUid(findUidRepo.uid);
        if (!findWebhookRepos) {
            return null;
        }

        const result = {
            uid: findUidRepo.uid,
            urls: []
        };
        for (const webhook of findWebhookRepos) {
            result.urls.push(webhook.url);
        }

        return result;
    }
}
