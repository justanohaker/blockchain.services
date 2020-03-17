import { Entity, Column, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Token } from '../libs/types';

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
    fee: string;
    vIns: ChainTxBtcVIn[],
    vOuts: ChainTxBtcVOut[]
}

export type ChainTxEthData = {
    blockHeight: number;
    nonce: number;
    fee: string;
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
    fee: string;
    sending: string;
    reference: string;
    amount: string;
}

export type ChainTxERC20Data = {
    blockHeight: number;
    fee: string;
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
    token: Token;
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
    isSender: boolean;

    @Column()
    token: Token;
}