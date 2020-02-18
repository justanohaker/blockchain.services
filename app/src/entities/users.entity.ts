import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryColumn()
    uid: string;

    @Column()
    balance: string;
}