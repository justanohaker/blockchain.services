import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('eth_trs')
export class ETHTransaction {
    @PrimaryColumn()
    id: string;

    @Column()
    uid: string;
}