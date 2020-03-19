import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../../config/app.config';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { Serial } from '../../../models/serial.model';
import { Webhook } from '../../../models/user.webhook.model';
import { ChainSecret } from '../../../models/chain.secret.model';
import { Account } from '../../../models/accounts.model';
import { ChainTx, ChainTxIndex } from '../../../models/transactions.model';

@Module({
    imports: [
        TypeOrmModule.forRoot({
            type: "sqlite",
            database: AppConfig.Sqlite_Db_Name,
            synchronize: true,
            entities: [
                Client,
                ChainSecret,
                User,
                Webhook,
                Account,
                Serial,
                ChainTx,
                ChainTxIndex,
            ]
        }),
        TypeOrmModule.forFeature([
            Client,
            User,
            Webhook,
            ChainSecret,
            Serial,
            Account,
            ChainTx,
            ChainTxIndex,
        ])],
    exports: [TypeOrmModule],
})
export class SharedModelModule { }
