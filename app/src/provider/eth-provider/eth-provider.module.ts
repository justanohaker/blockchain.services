import { Module } from '@nestjs/common';
import { EthProvider } from './eth.provider';
import { CurdsModule } from '../../curds/curds.module';
import { EthModule } from '../../blockchain/eth/eth.module';

@Module({
  imports: [CurdsModule, EthModule],
  providers: [EthProvider],
  exports: [EthProvider]
})
export class EthProviderModule { }
