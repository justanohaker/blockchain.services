import { Entity, PrimaryGeneratedColumn, Column, VersionColumn } from 'typeorm';

@Entity('user_basics')
export class UserBasic {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    uid: string;

    @Column()
    username: string;

    @Column()
    password: string;   // use bcrypt.js
}