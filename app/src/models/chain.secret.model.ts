import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ChainSecret {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    clientId: string;

    @Column()
    accountId: string;

    @Column()
    chainSecret: string;
}