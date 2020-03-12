import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { CoinType } from '../libs/types';

export type ChainTxBtcVIn = {
    address: string;
    amount: string;
}

export type ChainTxBtcVOut = {
    address: string;
    amount: string;
}

export type ChainTxBtcData = {
    blockHeight: number;
    blockTime: number;
    vIns: ChainTxBtcVIn[],
    vOuts: ChainTxBtcVOut[]
}

export type ChainTxEthData = {
    blockHeight: number;
    nonce: number;
    sender: string;
    recipient: string;
    amount: string;
}

export type ChainTxOmniData = {
    blockHeight: number;
    blockTime: number;
    propertyId: number;
    version: number;
    typeInt: number;
    sending: string;
    reference: string;
    amount: string;
}

export type ChainTxERC20Data = {
    blockHeight: number;
    sender: string;
    recipient: string;
    amount: string;
}

type TxData = ChainTxBtcData
    | ChainTxEthData
    | ChainTxOmniData
    | ChainTxERC20Data;

@Entity('chaintrs')
export class ChainTx {
    @PrimaryColumn()
    txId: string;

    @Column('simple-json')
    txData: TxData;

    @Column()
    flag: CoinType;
}

@Entity('chaintrindexes')
export class ChainTxIndex {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    txId: string;

    @Column()
    address: string;

    @Column()
    sender: boolean;

    @Column()
    flag: CoinType;
}