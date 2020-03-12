import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('webhooks')
export class Webhook {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    clientId: string;

    // @Column()
    // accountId: string;

    @Column()
    postUrl: string;
}