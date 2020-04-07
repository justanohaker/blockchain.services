import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Token } from '../libs/types';

export const enum RequestRecordStatus {
    Init = 0,
    Success = 1,
    Failure = -1,
}

@Entity('request_records')
export class RequestRecord {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    clientId: string;

    @Column()
    accountId: string;

    @Column()
    recipientId: string;

    @Column()
    amount: string;

    @Column({ nullable: true })
    feePriority: string;

    @Column({ nullable: true })
    fee: string;

    @Column()
    businessId: string;

    @Column()
    callbackURI: string;

    @Column()
    token: Token;

    @Column()
    ip: string;

    @Column()
    route: string;

    @Column()
    timestamp: number;

    @Column()
    status: RequestRecordStatus;
}