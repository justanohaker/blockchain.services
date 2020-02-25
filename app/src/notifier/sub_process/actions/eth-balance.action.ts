import { BaseAction } from './base.action';
import { EthBalanceNotification } from '../../types/ethereum-balance.notification';

export class EthBalanceAction extends BaseAction {
    private ethBalanceData: EthBalanceNotification;
    constructor(data: any) {
        super();

        this.ethBalanceData = data as EthBalanceNotification;
    }

    async getNotificationURL(): Promise<string> {
        return this.ethBalanceData.url;
    }

    async getNotificationBody(): Promise<Object> {
        return {
            type: 'balance',
            platform: 'ethereum',
            content: {
                uid: this.ethBalanceData.uid,
                address: this.ethBalanceData.address,
                balance: this.ethBalanceData.balance,
            },
        };
    }
}