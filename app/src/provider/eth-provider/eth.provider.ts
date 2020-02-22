import { Injectable } from '@nestjs/common';

import { IServiceProvider } from '../../blockchain/common/service.provider';
import { BalanceDef, Transaction } from '../../blockchain/common/types';
import { IService } from '../../blockchain/common/service.interface';
import { TransactionRole } from '../../libs/libs.types';
import { IServiceGetter } from '../../libs/interfaces/iservice-getter.interface';
import { ITransactionGetter } from '../../libs/interfaces/itransaction-getter.interface';

@Injectable()
export class EthProvider implements IServiceProvider, IServiceGetter, ITransactionGetter {
    constructor() { }

    /**
     * @note override IServiceGetter 
     */
    get Service(): IService {
        return null;
    }

    /**
     * @note override ITransactionGetter->getTransactions
     */
    async getTransactions(uid: string, mode: TransactionRole): Promise<Transaction[]> {
        // TODO
        return []
    }

    /**
     * @note override ITransactionGetter->getTransactionById
     */
    async getTransactionById(txId: string): Promise<Transaction> {
        // TODO
        return null;
    }

    async getValidAddresses(): Promise<string[]> {
        // TODO
        return [];
    }

    async setDirtyFn(fn: () => Promise<void>): Promise<void> {

    }

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {

    }

    async onNewTransaction(newTrs: Transaction[]): Promise<void> {

    }
}
