import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class AccountETH {
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
}