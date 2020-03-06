import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../../config/app.config';
import { LocalStrategy } from '../../libs/strategies/auth/local.strategy';
import { JwtStrategy } from '../../libs/strategies/auth/jwt.strategy';
import { Client } from '../../models/clients.model';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Client
        ]),
        JwtModule.register({
            secret: AppConfig.Jwt_Strategy_SecretOrKey,
            signOptions: { expiresIn: AppConfig.Jwt_Expired_In }
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, LocalStrategy, JwtStrategy],
    exports: []
})
export class AuthModule { }
