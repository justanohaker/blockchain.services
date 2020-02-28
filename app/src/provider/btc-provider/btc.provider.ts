import { Injectable, OnModuleInit } from '@nestjs/common';

import { In } from 'typeorm';
import { BtcaccountsCurd } from '../../curds/btcaccounts-curd';
import { BtctransactionsCurd } from '../../curds/btctransactions-curd';
import { WebhooksCurd } from '../../curds/webhooks-curd';
import { BtcService } from '../../blockchain/btc/btc.service';
import { IServiceProvider } from '../../blockchain/common/service.provider';
import { IService } from '../../blockchain/common/service.interface';
import { BalanceDef, Transaction, BitcoinTransaction } from 'src/blockchain/common/types';
import { TransactionRole } from '../../libs/libs.types';
import { IServiceGetter } from '../../libs/interfaces/iservice-getter.interface';
import { ITransactionGetter } from '../../libs/interfaces/itransaction-getter.interface';
import { IUserChanger } from '../../libs/interfaces/iuser-changed.interface';
import { NotifierService } from '../../notifier/notifier.service';

@Injectable()
export class BtcProvider
    implements IServiceProvider, IServiceGetter, ITransactionGetter, IUserChanger, OnModuleInit {
    private _service: IService;
    private _onDirtyCallback: () => Promise<void>;
    private _cachedAddresses?: string[] = null;
    constructor(
        private readonly btcAccountCurd: BtcaccountsCurd,
        private readonly btcTransactionCurd: BtctransactionsCurd,
        private readonly webhookCurd: WebhooksCurd,
        private readonly btcService: BtcService,
        private readonly notifyService: NotifierService
    ) {
        // this._service = this.btcService as IService;
        // this._service.setProvider(this);
        if (this.btcService instanceof IService) {
            this._service = this.btcService;
            this._service.setProvider(this);
        }
    }

    async onModuleInit(): Promise<void> {
        const validAddresses = await this.getValidAddresses();

        try {
            // update all balances
            await this.btcService.onUpdateBalances(validAddresses);
            // update all transactions
            // TODO
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
        const findRepo = await this.btcAccountCurd.findByUid(uid);
        if (!findRepo) {
            throw new Error(`User(${uid}) not exists!`);
        }

        const cond = { address: findRepo.address };
        const findRepos = await this.btcTransactionCurd.findIndex(cond);
        const validTxIds: string[] = [];
        for (const r of findRepos) {
            if (r.isSender && mode === TransactionRole.SENDER) {
                validTxIds.push(r.txId);
            } else if (!r.isSender && mode === TransactionRole.RECIPIENT) {
                validTxIds.push(r.txId);
            } else {
                validTxIds.push(r.txId);
            }
        }
        const validTrRepos = await this.btcTransactionCurd.find({
            txId: In(validTxIds),
            order: {
                blockHeight: 'DESC',
                txId: 'DESC'
            }
        });
        const result: Transaction[] = [];
        for (const repo of validTrRepos) {
            const tr: BitcoinTransaction = {
                type: 'bitcoin',
                sub: 'btc',
                txId: repo.txId,
                blockHeight: repo.blockHeight,
                blockTime: repo.blockTime,
                vIns: repo.vIns,
                vOuts: repo.vOuts
            };
            result.push(tr);
        }
        return result;
    }

    /**
     * @note override ITransactionGetter->getTransactionById
     */
    async getTransactionById(txId: string): Promise<Transaction> {
        const findRepo = await this.btcTransactionCurd.findOne({ txId });
        if (!findRepo) {
            throw new Error(`TxId(${txId}) not exists!`);
        }
        const result: BitcoinTransaction = {
            type: 'bitcoin',
            sub: 'btc',
            txId: findRepo.txId,
            blockHeight: findRepo.blockHeight,
            blockTime: findRepo.blockTime,
            vIns: findRepo.vIns,
            vOuts: findRepo.vOuts,
        };
        return result;
    }

    /**
     * @note override IUserChanger->onUserChanged
     */
    async onUserChanged(): Promise<void> {
        const findRepos = await this.btcAccountCurd.find({});
        const newValidAddresses: string[] = [];
        for (const repo of findRepos) {
            newValidAddresses.push(repo.address);
        }

        this._cachedAddresses = newValidAddresses;
        this._onDirtyCallback && await this._onDirtyCallback();
    }

    async getValidAddresses(): Promise<string[]> {
        if (this._cachedAddresses == null) {
            const findRepos = await this.btcAccountCurd.find({});
            const validAddresses: string[] = [];
            for (const repo of findRepos) {
                validAddresses.push(repo.address);
            }
            this._cachedAddresses = validAddresses;
        }
        return this._cachedAddresses;
    }

    async setDirtyFn(fn: () => Promise<void>) {
        this._onDirtyCallback = fn;

        await this._onDirtyCallback();
    }

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {
        for (const a of newBalances) {
            const { address, balance } = a;
            await this.btcAccountCurd.updateBalanceByAddress(address, balance);

            // notify
            const notificationProps = await this.getNotificationProp(address);
            if (!notificationProps) {
                continue;
            }
            for (const url of notificationProps.urls) {
                this.notifyService.addBtcBalanceNotification({
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
            if (t.type !== 'bitcoin' || t.sub !== 'btc') {
                //TODO: Unsupported!!
                continue;
            }

            const {
                txId,
                blockHeight,
                blockTime,
                vIns,
                vOuts
            } = t;
            console.log('BtcProvider.onNewTransaction:' +
                `txId(${txId}), blockTime(${blockHeight})` +
                `blockTime(${blockTime}), vIns(${JSON.stringify(vIns)})` +
                `vOuts(${JSON.stringify(vOuts)})`);
            const addResult = await this.btcTransactionCurd.add(
                txId,
                blockHeight,
                blockTime,
                vIns,
                vOuts
            );
            if (!addResult) continue;
            // notify
            for (const vIn of vIns) {
                const notificationProps = await this.getNotificationProp(vIn.address);
                if (!notificationProps) {
                    continue;
                }

                for (const url of notificationProps.urls) {
                    this.notifyService.addBtcTransactionNotification({
                        uid: notificationProps.uid,
                        url,
                        txId,
                        blockHeight,
                        blockTime,
                        vIns,
                        vOuts
                    });
                }
                try {
                    await this.btcService.onUpdateBalances([vIn.address]);
                } catch (error) { }
            }
            for (const vOut of vOuts) {
                const notificationProps = await this.getNotificationProp(vOut.address);
                if (!notificationProps) {
                    continue;
                }
                for (const url of notificationProps.urls) {
                    this.notifyService.addBtcTransactionNotification({
                        uid: notificationProps.uid,
                        url,
                        txId,
                        blockHeight,
                        blockTime,
                        vIns,
                        vOuts
                    });
                }
                try {
                    await this.btcService.onUpdateBalances([vOut.address]);
                } catch (error) { }
            }
            // end notify
        }
    }

    async getBalanceOnline(addresses: string[]): Promise<BalanceDef[]> {
        const result: BalanceDef[] = [];

        try {
            const balances = await this.btcService.getBalance(addresses);
            console.log('btcProvider.getBalanceOnline:', balances);
            if (balances.success) {
                for (const i of balances.result) {
                    result.push(i);
                }
                // result.concat(balances.result);
                console.log('btcProvider balances.success(true):', result);
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

    private async getNotificationProp(address: string): Promise<{ urls: string[], uid: string }> {
        const findUidRepo = await this.btcAccountCurd.findOne({ address });
        if (!findUidRepo) {
            return null;
        }
        const findWebhookRepos = await this.webhookCurd.findByUid(findUidRepo.uid);
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
