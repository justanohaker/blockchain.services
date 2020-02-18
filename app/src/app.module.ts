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
import { ETHAccount } from './entities/eth_accounts.entity';
import { ETHTransaction } from './entities/eth_trs.entity';
// import { CommonModule } from './curds/common.module';
import { CurdsModule } from './curds/curds.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "app.sqlite",
      synchronize: true,
      entities: [
        UserBasic,
        User,
        Secret,
        Webhook,
        BTCAccount,
        BTCTransaction,
        ETHAccount,
        ETHTransaction
      ]
    }),
    UserModule,
    TransactionModule,
    CurdsModule,
    // CommonModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
