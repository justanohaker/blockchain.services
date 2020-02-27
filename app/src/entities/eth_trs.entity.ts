import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('eth_trs')
export class ETHTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    txId: string;

    @Column()
    blockHeight: number;

    @Column()
    nonce: number;

    @Column()
    sender: string;

    @Column()
    recipient: string;

    @Column()
    amount: string;
}