import { Module } from '@nestjs/common';
import { OmniUsdtController } from './omni-usdt.controller';
import { OmniUsdtService } from './omni-usdt.service';

@Module({
  controllers: [OmniUsdtController],
  providers: [OmniUsdtService],
  exports: [OmniUsdtService]
})
export class OmniUsdtModule { }
