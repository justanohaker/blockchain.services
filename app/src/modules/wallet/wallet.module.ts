import { Module } from '@nestjs/common';
import { SharedModelModule } from '../shared/shared-model/shared-model.module';
import { SharedJwtModule } from '../shared/shared-jwt/shared-jwt.module';
import { BtcModule } from '../../blockchain/btc/btc.module';
import { EthModule } from '../../blockchain/eth/eth.module';
import { PusherModule } from '../pusher/pusher.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { BtcProvider } from './providers/btc.provider';
import { EthProvider } from './providers/eth.provider';
import { NullProvider } from './providers/null.provider';

@Module({
    imports: [
        SharedModelModule,
        SharedJwtModule,

        BtcModule,
        EthModule,
        PusherModule
    ],
    controllers: [WalletController],
    providers: [
        WalletService,
        NullProvider,
        BtcProvider,
        EthProvider
    ]
})
export class WalletModule { }
