import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../../config/app.config';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { Webhook } from '../../../models/user.webhook.model';
import { ChainSecret } from '../../../models/chain.secret.model';
import { AccountBTC } from '../../../models/accounts.btc.model';
import { TransactionBTC, TransactionBTCIndex } from '../../../models/transactions.btc.model';
import { AccountETH } from '../../../models/accounts.eth.model';
import { TransactionETH } from '../../../models/transactions.eth.model';


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
                AccountBTC,
                TransactionBTC,
                TransactionBTCIndex,
                AccountETH,
                TransactionETH
            ]
        }),
        TypeOrmModule.forFeature([
            Client,
            User,
            Webhook,
            ChainSecret,
            AccountBTC,
            TransactionBTC,
            TransactionBTCIndex,
            AccountETH,
            TransactionETH
        ])],
    exports: [TypeOrmModule],
})
export class SharedModelModule { }
