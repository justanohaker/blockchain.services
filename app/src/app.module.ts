import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TransactionModule } from './transaction/transaction.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserBasic } from './entities/user_basic.entity';
import { User } from './entities/users.entity';
import { Secret } from './entities/secrets.entity';
import { Webhook } from './entities/webhooks.entity';
import { BTCAccount } from './entities/btc_accounts.entity';
import { BTCTransaction } from './entities/btc_trs.entity';
import { BTCTransactionIndex } from './entities/btc_trs_index.entity';
import { ETHAccount } from './entities/eth_accounts.entity';
import { ETHTransaction } from './entities/eth_trs.entity';

import { AppConfig } from './config/app.config';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ProviderModule } from './provider/provider.module';
import { EthModule } from './blockchain/eth/eth.module';
import { BtcModule } from './blockchain/btc/btc.module';
import { NotifierModule } from './notifier/notifier.module';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: AppConfig.Sqlite_Db_Name,
      synchronize: true,
      entities: [
        UserBasic,
        User,
        Secret,
        Webhook,
        BTCAccount,
        BTCTransaction,
        BTCTransactionIndex,
        ETHAccount,
        ETHTransaction
      ]
    }),
    UserModule,
    EthModule,
    BtcModule,
    TransactionModule,
    ProviderModule,
    BlockchainModule,
    NotifierModule,
  ],
  controllers: [],
  providers: [],
  exports: []
})
export class AppModule { }
