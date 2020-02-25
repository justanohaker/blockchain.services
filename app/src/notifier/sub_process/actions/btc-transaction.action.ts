import { BaseAction } from './base.action';
import { BtcTransactionNotification } from '../../types/bitcoin-transaction.notification';

export class BtcTransactionAction extends BaseAction {
    private btcTransactionData: BtcTransactionNotification;
    constructor(data: any) {
        super();

        this.btcTransactionData = data as BtcTransactionNotification;
    }

    async getNotificationURL(): Promise<string> {
        return this.btcTransactionData.url;
    }

    async getNotificationBody(): Promise<Object> {
        return {
            type: 'transaction',
            platform: 'bitcoin',
            content: {
                uid: this.btcTransactionData.uid,
                txId: this.btcTransactionData.txId,
                blockHeight: this.btcTransactionData.blockHeight,
                blockTime: this.btcTransactionData.blockTime,
                vIns: this.btcTransactionData.vIns,
                vOuts: this.btcTransactionData.vOuts,
            },
        };
    }
}