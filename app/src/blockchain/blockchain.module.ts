import { Module } from '@nestjs/common';
import { BtcModule } from './btc/btc.module';
import { EthModule } from './eth/eth.module';

@Module({
    imports: [
        BtcModule,
        EthModule
    ]
})
export class BlockchainModule { }
