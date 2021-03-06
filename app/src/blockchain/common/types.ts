import { FeePriority } from '../../libs/types';
/**
 * 账号KeyPair
 */
export type AccountKeyPair = {
    privateKey: string;     // 账号私钥(hex string)
    wif: string;            // WIF(Wallet Import Format)
    address: string;        // 账号地址
}

export type TransferBasic = {
    keyPair: AccountKeyPair;    // 转账sender
    address: string;            // 转账recipient
    amount: string;             // 转账金额:各平台的最小单位(sotasi)
}

/**
 * 转账请求数据
 */
export type TransferDef = TransferBasic & {
    feePriority: FeePriority;   // 转账交易费等级(high, normal, lower)
}

export type TransferWithFeeDef = TransferBasic & {
    payedKeyPair: AccountKeyPair;
    fee: string;                // 指定的交易费值
    inputTxId: string;          // prepareTransfer交易Id(已打包并满足预设的确认数)
}

export type TransferWithPayedDef = TransferBasic & {
    payedKeyPair: AccountKeyPair,
    fee: string;
}

export type FeeRangeDef = {
    min: string;
    max: string;
    default: string;
}

/**
 * 代付交易费与不足转账金额数据定义
 */
export type PrepareTransferDef = TransferBasic & {
    payedKeyPair: AccountKeyPair;
    fee: string;
}

/**
 * 转账请求数据返回结构定义
 */
export type TransferResp = {
    success: boolean;               // 转账状态: true 成功; false 失败
    error?: string | Object;        // 转账状态为false时，填充此字段
    txId?: string;                  // 转账状态为true时，填充此字段
}

/**
 * 用户余额定义
 */
export type BalanceDef = {
    address: string;               // 用户地址
    balance: string;                // 用户余额: 各平台的最小单位
}

/**
 * 请求用户余额返回结构定义
 */
export type BalanceResp = {
    success: boolean;           // 请求余额状态: true 成功; false 失败
    error?: string | Object;    // 请求余额状态为false时,填充此字段
    result?: BalanceDef[];        // 请求余额状态为true时，填充此字段
}


/**
 * BTC交易结构定义，可以从bitcoin获取交易后，填充此结构
 * @note 其它需要的字段根据后续需求定义
 */
export type BitcoinTransaction = {
    type: 'bitcoin';                // 比特币主网 - 标记
    sub: 'btc';                     // 比特币代币BTC - 标记
    txId: string;                   // 交易Id
    blockHeight: number;            // 交易打包高度
    blockTime: number;              // 交易打包时间
    fee: string;
    vIns: BTCvIn[];                 // 交易发送者列表
    vOuts: BTCvOut[]                // 交易接收者列表
}

// BTC交易发送者与接收者定义
export type BTCvIn = { address: string; amount: string; };
export type BTCvOut = { address: string; amount: string; }

/**
 * ETH交易结构定义，可以从ethereum获取交易后，填充此结构
 * @note 其它需要的字段根据后续需求定义
 */
export type EthereumTransaction = {
    type: 'ethereum';               // 以太坊主网 - 标记
    sub: 'eth';                     // 以太坊代币ETH - 标记
    txId: string;                   // 交易Id
    blockHeight: number;            // 交易打包高度
    nonce: number;                  // 交易次数
    fee: string;
    sender: string;                 // 交易发送者地址
    recipient: string;              // 交易接收者地址
    amount: string;                 // 转账金额
}

// For ERC20 Tokens
export type Erc20UsdtTransaction = {
    type: 'ethereum';               // 以太坊主网 - 标记
    sub: 'erc20_usdt';              // erc20 usdt token - 标记
    txId: string;                   // 交易Id
    blockHeight: number;            // 交易打包高度
    fee: string;
    sender: string;                 // 交易发送者地址
    recipient: string;              // 交易接收者地址
    amount: string;                 // 转账金额
}

// For OmniLayer Tokens
export type OmniUsdtTransactin = {
    type: 'bitcoin';                // 比特币主网 - 标记
    sub: 'omni_usdt';               // omniLayer usdt token - 标记
    txId: string;                   // 交易Id
    blockHeight: number;            // 交易打包高度
    blockTime: number;              // 交易打包时间 
    propertyId: number;             // omni token id
    version: number,                // omni transaction version
    typeInt: number;                // omni transaction type(number format)
    fee: string;                    // 交易手续费
    sending: string;                // 交易发送方
    reference: string;              // 交易接收方
    amount: string;                 // 交易金额
}

// 交易结构定义
export type Transaction = BitcoinTransaction
    | EthereumTransaction
    | Erc20UsdtTransaction
    | OmniUsdtTransactin;


export type BlockDef = {
    height: number;
}

export type TransactionQueryResultDef = {
    blocked: boolean;                   // 交易是否打包
    blockHeight?: number;               // 交易打包的高度，只有blocked=true时，此字段才有效
}