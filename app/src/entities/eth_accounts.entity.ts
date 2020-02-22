import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('eth_accounts')
export class ETHAccount {
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