import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { UserBasic } from '../entities/user_basic.entity';
import { User } from '../entities/users.entity';
import { Webhook } from '../entities/webhooks.entity';
import { Secret } from '../entities/secrets.entity';
import { BTCAccount } from '../entities/btc_accounts.entity';
import { ETHAccount } from '../entities/eth_accounts.entity';
import { BTCTransaction } from '../entities/btc_trs.entity';
import { BTCTransactionIndex } from '../entities/btc_trs_index.entity';
import { ETHTransaction } from '../entities/eth_trs.entity';

// Curds
import { UserbasicsCurd } from './userbasics-curd';
import { UsersCurd } from './users-curd';
import { SecretsCurd } from './secrets-curd';
import { WebhooksCurd } from './webhooks-curd';
import { BtcaccountsCurd } from './btcaccounts-curd';
import { EthaccountsCurd } from './ethaccounts-curd';
import { BtctransactionsCurd } from './btctransactions-curd';
import { EthtransactionsCurd } from './ethtransactions-curd';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserBasic,
            User,
            Webhook,
            Secret,
            BTCAccount,
            ETHAccount,
            BTCTransaction,
            BTCTransactionIndex,
            ETHTransaction
        ])
    ],
    providers: [
        UserbasicsCurd,
        UsersCurd,
        SecretsCurd,
        WebhooksCurd,
        BtcaccountsCurd,
        EthaccountsCurd,
        BtctransactionsCurd,
        EthtransactionsCurd
    ],
    exports: [
        UserbasicsCurd,
        UsersCurd,
        SecretsCurd,
        WebhooksCurd,
        BtcaccountsCurd,
        BtctransactionsCurd,
        EthaccountsCurd,
        EthtransactionsCurd
    ]
})
export class CurdsModule { }
