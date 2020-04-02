import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Token } from '../libs/types';

@Entity('client_payeds')
export class ClientPayed {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    clientId: string;

    @Column()
    token: Token;

    @Column()
    pubkey: string;

    @Column()
    privkey: string;

    @Column()
    address: string;

    @Column()
    balance: string;
}