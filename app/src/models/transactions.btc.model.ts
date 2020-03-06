import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column } from 'typeorm';

export type BitcoinVIn = {
    address: string;
    amount: string;
}

export type BitcoinVOut = {
    address: string;
    amount: string;
}

@Entity()
export class TransactionBTC {
    @PrimaryColumn()
    txId: string;

    @Column()
    blockHeight: number;

    @Column()
    blockTime: number;

    @Column('simple-json')
    vIns: BitcoinVIn[];

    @Column('simple-json')
    vOuts: BitcoinVOut[]
}

@Entity()
export class TransactionBTCIndex {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    address: string;

    @Column()
    txId: string;

    @Column()
    sender: boolean;
}