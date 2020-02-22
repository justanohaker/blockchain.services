import { Module } from '@nestjs/common';
import { BtcController } from './btc.controller';
import { BtcService } from './btc.service';

@Module({
  controllers: [BtcController],
  providers: [BtcService],
  exports: [BtcService]
})
export class BtcModule { }
