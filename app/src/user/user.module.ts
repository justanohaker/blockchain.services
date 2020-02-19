import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { LocalStrategy } from '../libs/strategies/auth/local.strategy';
import { JwtStrategy } from '../libs/strategies/auth/jwt.strategy';
import { CurdsModule } from '../curds/curds.module';

@Module({
  imports: [CurdsModule, JwtModule.register({
    secret: 'hello world',
    signOptions: { expiresIn: '7d' }
  })],
  providers: [UserService, LocalStrategy, JwtStrategy],
  controllers: [UserController]
})
export class UserModule { }
