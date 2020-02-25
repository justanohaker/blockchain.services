import { BaseAction } from './base.action';
import { EthTransactionNotification } from '../../types/ethereum-transaction.notification';

export class EthTransactionAction extends BaseAction {
    private ethTransactionData: EthTransactionNotification;
    constructor(data: any) {
        super();

        this.ethTransactionData = data as EthTransactionNotification;
    }

    async getNotificationURL(): Promise<string> {
        return this.ethTransactionData.url;
    }

    async getNotificationBody(): Promise<Object> {
        return {
            type: 'transaction',
            platform: 'ethereum',
            content: {
                uid: this.ethTransactionData.uid,
                txId: this.ethTransactionData.txId,
                blockHeight: this.ethTransactionData.blockHeight,
                blockTime: this.ethTransactionData.blockTime,
                sender: this.ethTransactionData.sender,
                recipient: this.ethTransactionData.recipient,
                amount: this.ethTransactionData.amount,
            },
        };
    }
}