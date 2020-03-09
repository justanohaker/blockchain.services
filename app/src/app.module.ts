import { Module } from '@nestjs/common';
import { SharedJwtModule } from './modules/shared/shared-jwt/shared-jwt.module';
import { SharedModelModule } from './modules/shared/shared-model/shared-model.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PusherModule } from './modules/pusher/pusher.module';

@Module({
    imports: [
        SharedModelModule,
        SharedJwtModule,

        AuthModule,
        WalletModule,
        NotificationModule,
        PusherModule
    ]
})
export class AppModule { }
