import { Entity, PrimaryColumn, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('webhooks')
export class Webhook {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    uid: string;

    @Column()
    url: string;
}