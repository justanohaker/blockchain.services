import { UrlComponent } from './url-component.notification';
import { BTCvIn, BTCvOut } from '../../blockchain/common/types';

export type BtcTransactionNotification = {
    uid: string;
    txId: string;
    blockHeight: number;
    blockTime: number;
    vIns: BTCvIn[];
    vOuts: BTCvOut[];
} & UrlComponent;