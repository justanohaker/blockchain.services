import { UrlComponent } from './url-component.notification';

export type EthTransactionNotification = {
    uid: string;
    txId: string;
    blockHeight: number;
    nonce: number;
    sender: string;
    recipient: string;
    amount: string;

} & UrlComponent;