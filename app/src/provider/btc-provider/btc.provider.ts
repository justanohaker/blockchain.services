import { Injectable } from '@nestjs/common';

import { BtcaccountsCurd } from '../../curds/btcaccounts-curd';
import { BtctransactionsCurd } from '../../curds/btctransactions-curd';
import { BtcService } from '../../blockchain/btc/btc.service';
import { IServiceProvider } from '../../blockchain/common/service.provider';
import { IService } from '../../blockchain/common/service.interface';
import { BalanceDef, Transaction } from 'src/blockchain/common/types';
import { TransactionRole } from '../../libs/libs.types';
import { IServiceGetter } from '../../libs/interfaces/iservice-getter.interface';
import { ITransactionGetter } from '../../libs/interfaces/itransaction-getter.interface';

@Injectable()
export class BtcProvider implements IServiceProvider, IServiceGetter, ITransactionGetter {
    private _service: IService;
    private _onDirtyCallback: () => Promise<void>;
    private _cachedAddresses?: string[] = null;
    constructor(
        private readonly btcAccountCurd: BtcaccountsCurd,
        private readonly btcTransactionCurd: BtctransactionsCurd,
        private readonly btcService: BtcService
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
        // TODO:
        return [];
    }

    /**
     * @note override ITransactionGetter->getTransactionById
     */
    async getTransactionById(txId: string): Promise<Transaction> {
        // TODO
        return null;
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
            // maybe notify???
        }
    }

    async onNewTransaction(newTrs: Transaction[]): Promise<void> {
        for (const t of newTrs) {
            if (t.type !== 'bitcoin' || t.sub !== 'btc') {
                // NotUnsupported!!
                continue;
            }

            // maybe notify???
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
            // maybeNotify??
        }
    }

    async onNewUsers(): Promise<void> {
        const allAccounts = await this.btcAccountCurd.find({});
        const newAddress: string[] = [];
        for (const a of allAccounts) {
            newAddress.push(a.address);
        }

        this._onDirtyCallback && await this._onDirtyCallback();
    }
}
