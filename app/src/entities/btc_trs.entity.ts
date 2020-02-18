import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('btc_trs')
export class BTCTransaction {
    @PrimaryColumn()
    id: string;

    @Column()
    uid: string;
}