import { BtcTransactionNotification } from './bitcoin-transaction.notification';

export const enum NotifyType {
    BtcTransaction = 'bitcoin_transaction',
    EthTransaction = 'ethereum_transaction',
    BtcBalance = 'bitcoin_balance',
    EthBalance = 'ethereum_balance',
}

export type Notification = {
    type: NotifyType;
    data: any;
}

export function buildBtcTransactionNotification(
    data: BtcTransactionNotification
): Notification {
    return {
        type: NotifyType.BtcTransaction,
        data
    };
}

export function buildBtcBalanceNotification(
    data: any
): Notification {
    return {
        type: NotifyType.BtcBalance,
        data
    };
}

export function buildEthTransactionNotification(
    data: any
): Notification {
    return {
        type: NotifyType.EthTransaction,
        data
    };
}

export function buildEthBalanceNotification(
    data: any
): Notification {
    return {
        type: NotifyType.EthBalance,
        data
    };
}

