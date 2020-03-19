import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Token } from '../libs/types';

@Entity('serials')
export class Serial {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    clientId: string;

    @Column()
    accountId: string;

    @Column()
    token: Token;

    @Column()
    serial: number;
}
