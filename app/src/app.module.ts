import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfig } from './config/app.config';

import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PusherModule } from './modules/pusher/pusher.module';

// models
import { Client } from './models/clients.model';
import { ChainSecret } from './models/chain.secret.model';
import { User } from './models/users.model';
import { Webhook } from './models/user.webhook.model';

import { AccountBTC } from './models/accounts.btc.model';
import { TransactionBTC, TransactionBTCIndex } from './models/transactions.btc.model';

import { AccountETH } from './models/accounts.eth.model';
import { TransactionETH } from './models/transactions.eth.model';
// end models

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

        AuthModule,
        WalletModule,
        NotificationModule,
        PusherModule
    ]
})
export class AppModule { }
