import { Module } from '@nestjs/common';
import { EthController } from './eth.controller';
import { EthService } from './eth.service';

@Module({
  controllers: [EthController],
  providers: [EthService]
})
export class EthModule {}
