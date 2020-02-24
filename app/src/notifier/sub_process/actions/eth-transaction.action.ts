import { BaseAction } from './base.action';

export class EthTransactionAction extends BaseAction {
    constructor(data: any) {
        super();
    }

    async getNotificationURL(): Promise<string> {
        return 'http://192.168.3.15:3000/transaction/notification';
    }

    async getNotificationBody(): Promise<Object> {
        return {
            type: 'bitcoin',
            content: 'this is a notification test'
        };
    }
}