import { BaseAction } from './base.action';
import { BtcBalanceNotification } from '../../types/bitcoin-balance.notification';

export class BtcBalanceAction extends BaseAction {
    private btcBalanceData: BtcBalanceNotification;
    constructor(data: any) {
        super();

        this.btcBalanceData = data as BtcBalanceNotification;
    }

    async getNotificationURL(): Promise<string> {
        return this.btcBalanceData.url;
    }

    async getNotificationBody(): Promise<Object> {
        return {
            type: 'balance',
            platform: 'bitcoin',
            content: {
                uid: this.btcBalanceData.uid,
                address: this.btcBalanceData.address,
                balance: this.btcBalanceData.balance,
            },
        };
    }
}