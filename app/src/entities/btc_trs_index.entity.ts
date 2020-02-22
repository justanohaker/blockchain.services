import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('btc_trs_index')
export class BTCTransactionIndex {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    address: string;

    @Column()
    txId: string;

    @Column()
    isSender: boolean;
}