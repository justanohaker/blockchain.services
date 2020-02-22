import { Module } from '@nestjs/common';
import { BtcProviderModule } from './btc-provider/btc-provider.module';
import { EthProviderModule } from './eth-provider/eth-provider.module';

@Module({
  imports: [BtcProviderModule, EthProviderModule]
})
export class ProviderModule {}
