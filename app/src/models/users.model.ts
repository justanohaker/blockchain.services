import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('rowid')
    id: string;

    @Column()
    clientId: string;

    @Column()
    accountId: string;
}