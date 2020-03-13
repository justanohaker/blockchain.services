import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoinType } from '../../../libs/types';
import { Platform } from '../../../libs/helpers/bipHelper';
import { addressIsBitcoin } from '../../../libs/helpers/addressHelper';
import { OmniUsdtService } from '../../../blockchain/omni-tokens/omni-usdt/omni-usdt.service';
import { Transaction } from '../../../blockchain/common/types';
import { OmniUsdtTransactin } from '../../../blockchain/common/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { PushPlatform } from '../../../modules/pusher/types';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { Webhook } from '../../../models/user.webhook.model';
import { Account } from '../../../models/accounts.model';
import { ChainTx, ChainTxIndex, ChainTxOmniData } from '../../../models/transactions.model';
import { Provider } from './provider';
import {
    OmniUsdtDef,
    AddressValidator,
    TxChecker,
    TxAddAction,
    TxAddActionResult,
    FromChainTxAction,
    ToChainTxAction
} from './types';

@Injectable()
export class OmniUsdtProvider extends Provider implements OnApplicationBootstrap {
    public readonly Logger: Logger = new Logger('OmniUsdtProvider', true);
    constructor(
        @InjectRepository(Client) public readonly ClientRepo: Repository<Client>,
        @InjectRepository(User) public readonly UserRepo: Repository<User>,
        @InjectRepository(Webhook) public readonly WebHookRepo: Repository<Webhook>,
        @InjectRepository(Account) public readonly AccountRepo: Repository<Account>,
        @InjectRepository(ChainTx) public readonly ChainTxRepo: Repository<ChainTx>,
        @InjectRepository(ChainTxIndex) public readonly ChainTxIndexRepo: Repository<ChainTxIndex>,
        public readonly PushService: PusherService,
        public readonly IService: OmniUsdtService
    ) {
        super();

        this.txCheck = this.txCheck.bind(this);
        this.txAdd = this.txAdd.bind(this);
        this.fromChainTx = this.fromChainTx.bind(this);
        this.toChainTx = this.toChainTx.bind(this);
    }

    // BEGIN: override properties
    get Flag(): CoinType { return CoinType.OMNI_USDT; }
    get Platform(): Platform { return Platform.BITCOIN_TESTNET; }
    get PushPlatform(): PushPlatform { return PushPlatform.OMNI_USDT; }
    get AddressValidator(): AddressValidator { return addressIsBitcoin; }
    get TxChecker(): TxChecker { return this.txCheck; }
    get TxAddAction(): TxAddAction { return this.txAdd; }
    get FromChainTxAction(): FromChainTxAction { return this.fromChainTx; }
    get ToChainTxAction(): ToChainTxAction { return this.toChainTx; }
    // END

    async onApplicationBootstrap() {
        this.IService?.setProvider(this);

        const allAddresses = await this.getAddresses();
        this.IService?.onUpdateBalances(allAddresses);
    }

    private async txCheck(transaction: Transaction): Promise<boolean> {
        const btcTr = transaction as OmniUsdtTransactin;
        return (btcTr.type === 'bitcoin' && btcTr.sub === 'omni-usdt');
    }

    private async txAdd(transaction: Transaction): Promise<TxAddActionResult> {
        const omni = transaction as OmniUsdtTransactin;
        const senderRepo = await this.findAccountByAddress(omni.sending);
        const referenceRepo = await this.findAccountByAddress(omni.reference);
        if (!senderRepo && !referenceRepo) { return null; }
        const chainTxIns = await this.ToChainTxAction(omni);
        await this.createChainTxIfNotExists(chainTxIns);
        const result: Account[] = [];
        const senderIndexIns = new ChainTxIndex();
        senderIndexIns.txId = omni.txId;
        senderIndexIns.address = omni.sending;
        senderIndexIns.sender = true;
        senderIndexIns.flag = this.Flag;
        if (await this.createChainTxIndexIfNotExists(senderIndexIns)) {
            result.push(senderRepo);
        }
        const recipientIndexIns = new ChainTxIndex();
        recipientIndexIns.txId = omni.txId;
        recipientIndexIns.address = omni.reference;
        recipientIndexIns.sender = false;
        recipientIndexIns.flag = this.Flag;
        if (await this.createChainTxIndexIfNotExists(recipientIndexIns)) {
            result.push(referenceRepo);
        }
        return {
            data: {
                txId: omni.txId,
                blockHeight: omni.blockHeight,
                blockTime: omni.blockTime,
                propertyId: omni.propertyId,
                version: omni.version,
                typeInt: omni.typeInt,
                sending: omni.sending,
                reference: omni.reference,
                amount: omni.amount
            } as OmniUsdtDef,
            accounts: result
        };
    }

    private async toChainTx(src: OmniUsdtTransactin): Promise<ChainTx> {
        const chainTxIns = new ChainTx();
        chainTxIns.txId = src.txId;
        chainTxIns.txData = {
            blockHeight: src.blockHeight,
            blockTime: src.blockTime,
            propertyId: src.propertyId,
            version: src.version,
            typeInt: src.typeInt,
            sending: src.sending,
            reference: src.reference,
            amount: src.amount
        } as ChainTxOmniData;
        chainTxIns.flag = this.Flag;
        return chainTxIns;
    }

    private async fromChainTx(transaction: ChainTx): Promise<OmniUsdtDef> {
        const { txId, txData, flag } = transaction;
        if (flag !== CoinType.OMNI_USDT) {
            return null;
        }
        const omniData = txData as ChainTxOmniData;
        return {
            txId: txId,
            blockHeight: omniData.blockHeight,
            blockTime: omniData.blockTime,
            propertyId: omniData.propertyId,
            version: omniData.version,
            typeInt: omniData.typeInt,
            sending: omniData.sending,
            reference: omniData.reference,
            amount: omniData.amount
        } as OmniUsdtDef
    }
}