import { Injectable } from '@nestjs/common';

import { In } from 'typeorm';
import { BtcaccountsCurd } from '../../curds/btcaccounts-curd';
import { BtctransactionsCurd } from '../../curds/btctransactions-curd';
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
    implements IServiceProvider, IServiceGetter, ITransactionGetter, IUserChanger {
    private _service: IService;
    private _onDirtyCallback: () => Promise<void>;
    private _cachedAddresses?: string[] = null;
    constructor(
        private readonly btcAccountCurd: BtcaccountsCurd,
        private readonly btcTransactionCurd: BtctransactionsCurd,
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
            const tr = new BitcoinTransaction();
            tr.type = 'bitcoin';
            tr.sub = 'btc';
            tr.txId = repo.txId;
            tr.blockHeight = repo.blockHeight;
            tr.blockTime = repo.blockTime;
            tr.vIns = repo.vIns;
            tr.vOuts = repo.vOuts;

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

        const result = new BitcoinTransaction();
        result.type = 'bitcoin';
        result.sub = 'btc';
        result.txId = findRepo.txId;
        result.blockHeight = findRepo.blockHeight;
        result.blockTime = findRepo.blockTime;
        result.vIns = findRepo.vIns;
        result.vOuts = findRepo.vOuts;

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
    }

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {
        for (const a of newBalances) {
            const { address, balance } = a;
            await this.btcAccountCurd.updateBalanceByAddress(address, balance);
            //TODO: maybe notify???
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
            await this.btcTransactionCurd.add(
                txId,
                blockHeight,
                blockTime,
                vIns,
                vOuts
            );
            //TODO: maybeNotify??
        }
    }
}
