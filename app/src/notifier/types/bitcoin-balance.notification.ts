import { UrlComponent } from './url-component.notification';

export type BtcBalanceNotification = {
    uid: string;
    address: string;
    balance: string;
} & UrlComponent;