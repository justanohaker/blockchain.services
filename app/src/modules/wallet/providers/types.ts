import {
    ChainTxEthData,
    ChainTxOmniData,
    ChainTxERC20Data,
    ChainTxBtcData,
    ChainTx
} from "../../../models/transactions.model"
import { Account } from '../../../models/accounts.model';
import { Transaction } from '../../../blockchain/common/types';

type IdDef = {
    txId: string;
}

export type BtcDef = IdDef & ChainTxBtcData;

export type OmniUsdtDef = IdDef & ChainTxOmniData;

export type EthDef = IdDef & ChainTxEthData;

export type ERC20UsdtDef = IdDef & ChainTxERC20Data;

export type TxDef = BtcDef
    | OmniUsdtDef
    | EthDef
    | ERC20UsdtDef;

export type TxAddActionResult = {
    data: TxDef;
    accounts: Account[]
};

export type AddressValidator = (address: string) => Promise<boolean>;

export type TxChecker = (transaction: Transaction) => Promise<boolean>;

export type TxAddAction = (transaction: Transaction) => Promise<TxAddActionResult>;

export type FromChainTxAction = (transaction: ChainTx) => Promise<TxDef>;

export type ToChainTxAction = (transaction: Transaction) => Promise<ChainTx>;