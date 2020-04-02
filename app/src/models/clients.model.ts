import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('clients')
export class Client {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    client: string;

    @Column()
    secret: string;

    @Column()
    chainSecret: string;

    @Column()
    enabled: boolean;
}