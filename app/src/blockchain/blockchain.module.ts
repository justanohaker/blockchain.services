import { Module } from '@nestjs/common';
import { BtcModule } from './btc/btc.module';
import { EthModule } from './eth/eth.module';
import { Erc20UsdtModule } from './erc20-tokens/erc20-usdt/erc20-usdt.module';
import { OmniUsdtModule } from './omni-tokens/omni-usdt/omni-usdt.module';

@Module({
    imports: [
        BtcModule,
        EthModule,
        Erc20UsdtModule,
        OmniUsdtModule
    ],
    exports: [
        BtcModule,
        EthModule,
        Erc20UsdtModule,
        OmniUsdtModule
    ]
})
export class BlockchainModule { }
