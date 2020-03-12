import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { CoinType } from 'src/libs/types';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
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
    flag: CoinType
}