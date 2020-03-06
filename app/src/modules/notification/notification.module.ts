import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../../config/app.config';
import { JwtStrategy } from '../../libs/strategies/auth/jwt.strategy';

import { Webhook } from '../../models/user.webhook.model';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Webhook]),
        JwtModule.register({
            secret: AppConfig.Jwt_Strategy_SecretOrKey,
            signOptions: { expiresIn: AppConfig.Jwt_Expired_In }
        }),
    ],
    controllers: [NotificationController],
    providers: [NotificationService, JwtStrategy],
})
export class NotificationModule { }
