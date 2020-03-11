import { Module } from '@nestjs/common';
import { Erc20UsdtController } from './erc20-usdt.controller';
import { Erc20UsdtService } from './erc20-usdt.service';

@Module({
  controllers: [Erc20UsdtController],
  providers: [Erc20UsdtService],
  exports: [Erc20UsdtService]
})
export class Erc20UsdtModule { }
