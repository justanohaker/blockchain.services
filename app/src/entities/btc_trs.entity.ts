import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BTCvIn, BTCvOut } from '../blockchain/common/types';

@Entity('btc_trs')
export class BTCTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    txId: string;

    @Column()
    blockHeight: number;

    @Column()
    blockTime: number;

    @Column('simple-json')
    vIns: BTCvIn[];

    @Column('simple-json')
    vOuts: BTCvOut[];
}