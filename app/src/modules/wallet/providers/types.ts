import {
    ChainTxEthData,
    ChainTxOmniData,
    ChainTxERC20Data,
    ChainTxBtcData,
    ChainTx
} from "../../../models/transactions.model"
import { Account } from '../../../models/accounts.model';
import { Transaction } from '../../../blockchain/common/types';

// TxId包装类型
type TxIdDef = { txId: string; }
// Bitcoin定义
export type BtcDef = TxIdDef & ChainTxBtcData;
// OmniUsdt定义
export type OmniUsdtDef = TxIdDef & ChainTxOmniData;
// Ethereum定义
export type EthDef = TxIdDef & ChainTxEthData;
// ERC20Usdt定义
export type ERC20UsdtDef = TxIdDef & ChainTxERC20Data;
/**
 * 通知定义
 *  -- Bitcoin
 *  -- Ethereum
 *  -- OmniUsdt
 *  -- ERC20Usdt
 */
export type TxDef = BtcDef
    | OmniUsdtDef
    | EthDef
    | ERC20UsdtDef;

export type TxAddActionResult = {
    data: TxDef;            // 通知格式
    ins: string[];          // 发送者列表
    outs: string[];         // 接收者地址列表
    accounts: Account[]     // 账号列表
};

/**
 * 地址验证器
 *  -- 用于验证地址是否是合法的链地址
 */
export type AddressValidator = (address: string) => Promise<boolean>;
/**
 * 交易检测器
 *  -- 用于检测链Service传递的交易信息是否是有效的
 */
export type TxChecker = (transaction: Transaction) => Promise<boolean>;
/**
 * 交易添加动作
 *  -- 用于IChainProvider保存新的链交易信息
 */
export type TxAddAction = (transaction: Transaction) => Promise<TxAddActionResult>;
/**
 * 转换器
 *  -- 从ChainTx转换到TxDef(通知格式)
 */
export type FromChainTxAction = (transaction: ChainTx) => Promise<TxDef>;
/**
 *  -- 从Transaction转换到ChainTx
 */
export type ToChainTxAction = (transaction: Transaction) => Promise<ChainTx>;