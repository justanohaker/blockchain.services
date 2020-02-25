import { UrlComponent } from './url-component.notification';

export type EthBalanceNotification = {
    uid: string;
    address: string;
    balance: string;
} & UrlComponent;