import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppConfig } from '../../config/app.config';
import { JwtStrategy } from '../../libs/strategies/auth/jwt.strategy';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

import { Client } from '../../models/clients.model';
import { ChainSecret } from '../../models/chain.secret.model';
import { User } from '../../models/users.model';
import { AccountBTC } from '../../models/accounts.btc.model';
import { AccountETH } from '../../models/accounts.eth.model';
import { TransactionBTC, TransactionBTCIndex } from '../../models/transactions.btc.model';
import { TransactionETH } from '../../models/transactions.eth.model';
import { Webhook } from '../../models/user.webhook.model';

import { BtcModule } from '../../blockchain/btc/btc.module';
import { EthModule } from '../../blockchain/eth/eth.module';

import { PusherModule } from '../pusher/pusher.module';
import { BtcProvider } from './providers/btc.provider';
import { EthProvider } from './providers/eth.provider';
import { NullProvider } from './providers/null.provider';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Client,
            ChainSecret,
            User,
            Webhook,
            AccountBTC,
            AccountETH,
            TransactionBTC,
            TransactionBTCIndex,
            TransactionETH,
        ]),
        JwtModule.register({
            secret: AppConfig.Jwt_Strategy_SecretOrKey,
            signOptions: { expiresIn: AppConfig.Jwt_Expired_In }
        }),
        BtcModule,
        EthModule,
        PusherModule
    ],
    controllers: [WalletController],
    providers: [
        WalletService,
        JwtStrategy,
        NullProvider,
        BtcProvider,
        EthProvider
    ]
})
export class WalletModule { }
