import { Module } from '@nestjs/common';
import { SharedModelModule } from '../shared/shared-model/shared-model.module';
import { SharedJwtModule } from '../shared/shared-jwt/shared-jwt.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
    imports: [
        SharedModelModule,
        SharedJwtModule,
        WalletModule,
    ],
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule { }
