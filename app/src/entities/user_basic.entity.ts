import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_basics')
export class UserBasic {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    uid: string;

    @Column()
    username: string;

    @Column()
    password: string;   // use bcrypt.js
}