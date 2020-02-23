import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('eth_trs')
export class ETHTransaction {
    @PrimaryColumn()
    id: string;

    @Column()
    txId: string;

    @Column()
    blockHeight: number;

    @Column()
    blockTime: number;

    @Column()
    sender: string;

    @Column()
    recipient: string;

    @Column()
    amount: string;
}