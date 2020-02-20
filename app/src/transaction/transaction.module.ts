import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { CurdsModule } from '../curds/curds.module';

import { AppConfig } from '../config/app.config';

@Module({
  imports: [
    CurdsModule,
    JwtModule.register({
      secret: AppConfig.Jwt_Strategy_SecretOrKey,
      signOptions: { expiresIn: AppConfig.Jwt_Expired_In }
    }),
  ],
  providers: [TransactionService],
  controllers: [TransactionController]
})
export class TransactionModule { }
