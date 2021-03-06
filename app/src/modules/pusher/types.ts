export type PushData = {
    url: string;
    data: any;
}

export const enum InternalMessageType {
    PUSH = 'pusher',
}

export const enum PushEventType {
    AccountNew = 'account.new',
    BalanceUpdate = 'balance.update',
    TransactionCreated = 'transaction.created',
    TransactionConfirmed = 'transaction.confirmed'
}

export const enum PushPlatform {
    BTC = 'bitcoin.btc',
    ETH = 'ethereum.eth',
    OMNI_USDT = 'bitcoin.omni_usdt',
    ERC20_USDT = 'ethereum.erc20_usdt'
}

export type InternalMessageDef = {
    type: InternalMessageType,
    data: any;
}