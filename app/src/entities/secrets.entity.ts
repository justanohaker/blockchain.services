import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('secrets')
export class Secret {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    uid: string;

    @Column()
    secret: string;
}