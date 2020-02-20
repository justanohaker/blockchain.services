import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { LocalStrategy } from '../libs/strategies/auth/local.strategy';
import { JwtStrategy } from '../libs/strategies/auth/jwt.strategy';
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
  providers: [UserService, LocalStrategy, JwtStrategy],
  controllers: [UserController]
})
export class UserModule { }
