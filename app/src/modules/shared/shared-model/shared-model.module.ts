import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../../config/app.config';
import { Account } from '../../../models/accounts.model';
import { Client } from '../../../models/clients.model';
import { ClientPayed } from '../../../models/client-payed.model';
import { ChainSecret } from '../../../models/chain.secret.model';
import { RequestRecord } from '../../../models/request_records.model';
import { Serial } from '../../../models/serial.model';
import { ChainTx, ChainTxIndex } from '../../../models/transactions.model';
import { Webhook } from '../../../models/user.webhook.model';
import { User } from '../../../models/users.model';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: "sqlite",
            database: AppConfig.Sqlite_Db_Name,
            synchronize: true,
            entities: [
                Account,
                Client,
                ClientPayed,
                ChainSecret,
                RequestRecord,
                Serial,
                ChainTx, ChainTxIndex,
                Webhook,
                User,
            ]
        }),
        TypeOrmModule.forFeature([
            Account,
            Client,
            ClientPayed,
            ChainSecret,
            RequestRecord,
            Serial,
            ChainTx, ChainTxIndex,
            Webhook,
            User,
        ])],
    exports: [TypeOrmModule],
})
export class SharedModelModule { }
