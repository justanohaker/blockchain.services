import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedModelModule } from '../shared-model/shared-model.module';
import { AppConfig } from '../../../config/app.config';
import { JwtStrategy } from '../../../libs/strategies/auth/jwt.strategy';
import { LocalStrategy } from '../../../libs/strategies/auth/local.strategy';

@Module({
    imports: [
        SharedModelModule,
        JwtModule.register({
            secret: AppConfig.Jwt_Strategy_SecretOrKey,
            signOptions: { expiresIn: AppConfig.Jwt_Expired_In }
        }),
    ],
    providers: [JwtStrategy, LocalStrategy],
    exports: [
        JwtModule,
        JwtStrategy,
        LocalStrategy
    ]
})
export class SharedJwtModule { }
