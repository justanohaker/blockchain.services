import { TransactionRole } from '../libs.types';
import { Transaction } from "../../blockchain/common/types";

export interface ITransactionGetter {
    getTransactions(uid: string, mode: TransactionRole): Promise<Transaction[]>

    getTransactionById(txId: string): Promise<Transaction>;
}