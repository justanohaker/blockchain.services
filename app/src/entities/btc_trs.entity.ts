import { Entity, PrimaryColumn, Column } from 'typeorm';
import { BTCvIn, BTCvOut } from '../blockchain/common/types';

@Entity('btc_trs')
export class BTCTransaction {
    @PrimaryColumn()
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