import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class TransactionETH {
    @PrimaryColumn()
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