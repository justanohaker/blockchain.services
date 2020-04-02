import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Token } from '../libs/types';

export const enum RequestRecordStatus {
    SUCCESS = 0,
    FAILURE = 1,
    EXCEPTION = 2
}

@Entity('request_records')
export class RequestRecord {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    client: string;

    @Column()
    account: string;

    @Column()
    receipentId: string;

    @Column()
    amount: string;

    @Column()
    token: Token;

    @Column()
    timestamp: number;

    @Column()
    status: RequestRecordStatus;

    @Column({ nullable: true })
    confirmed: boolean;

    @Column({ nullable: true })
    serial: number;

    @Column({ nullable: true })
    txId: string;

    @Column({ nullable: true })
    error: string;
}