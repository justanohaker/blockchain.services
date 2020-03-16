import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Token } from '../libs/types';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    clientId: string;

    @Column()
    accountId: string;

    @Column()
    pubkey: string;

    @Column()
    privkey: string;

    @Column()
    address: string;

    @Column()
    balance: string;

    @Column()
    token: Token
}