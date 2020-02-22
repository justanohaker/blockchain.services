import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { CurdsModule } from '../curds/curds.module';
import { BtcProviderModule } from '../provider/btc-provider/btc-provider.module';
import { EthProviderModule } from '../provider/eth-provider/eth-provider.module';

import { AppConfig } from '../config/app.config';

@Module({
  imports: [
    JwtModule.register({
      secret: AppConfig.Jwt_Strategy_SecretOrKey,
      signOptions: { expiresIn: AppConfig.Jwt_Expired_In }
    }),
    CurdsModule,
    BtcProviderModule,
    EthProviderModule,
  ],
  providers: [TransactionService],
  controllers: [TransactionController]
})
export class TransactionModule { }
