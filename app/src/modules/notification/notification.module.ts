import { Module } from '@nestjs/common';
import { SharedModelModule } from '../shared/shared-model/shared-model.module';
import { SharedJwtModule } from '../shared/shared-jwt/shared-jwt.module';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

@Module({
    imports: [
        SharedModelModule,
        SharedJwtModule,
    ],
    controllers: [NotificationController],
    providers: [NotificationService],
})
export class NotificationModule { }
