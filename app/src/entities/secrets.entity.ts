import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('secrets')
export class Secret {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    uid: string;

    @Column()
    secret: string;
}