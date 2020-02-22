import { Module } from '@nestjs/common';
import { CurdsModule } from '../../curds/curds.module';
import { BtcModule } from '../../blockchain/btc/btc.module';

import { BtcProvider } from './btc.provider';

@Module({
  imports: [CurdsModule, BtcModule],
  providers: [BtcProvider],
  exports: [BtcProvider]
})
export class BtcProviderModule { }
