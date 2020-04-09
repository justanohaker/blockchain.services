import { Module } from '@nestjs/common';
import { SharedModelModule } from '../shared/shared-model/shared-model.module';
import { SharedJwtModule } from '../shared/shared-jwt/shared-jwt.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { PusherModule } from '../pusher/pusher.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { RequestRecordService } from './request-record.service';
import { NullProvider } from './providers/null.provider';
import { BtcProvider } from './providers/btc.provider';
import { EthProvider } from './providers/eth.provider';
import { Erc20UsdtProvider } from './providers/erc20-usdt.provider';
import { OmniUsdtProvider } from './providers/omni-usdt.provider';

@Module({
    imports: [
        SharedModelModule,
        SharedJwtModule,
        PusherModule,

        BlockchainModule,
    ],
    controllers: [WalletController],
    providers: [
        WalletService,
        RequestRecordService,
        NullProvider,
        BtcProvider,
        EthProvider,
        Erc20UsdtProvider,
        OmniUsdtProvider
    ],
    exports: [
        NullProvider,
        BtcProvider,
        EthProvider,
        Erc20UsdtProvider,
        OmniUsdtProvider
    ]
})
export class WalletModule { }
