import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('btc_accounts')
export class BTCAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    uid: string;

    @Column()
    priv: string;

    @Column()
    pub: string;

    @Column()
    address: string;

    @Column()
    balance: string;
}