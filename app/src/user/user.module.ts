import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

import { CurdsModule } from '../curds/curds.module';

@Module({
  imports: [CurdsModule],
  providers: [UserService],
  controllers: [UserController]
})
export class UserModule { }
