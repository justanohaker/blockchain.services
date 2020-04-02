import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../../../libs/types';
import { addressIsBitcoin } from '../../../libs/helpers/addressHelper';
import { OmniUsdtService } from '../../../blockchain/omni-tokens/omni-usdt/omni-usdt.service';
import { Transaction } from '../../../blockchain/common/types';
import { OmniUsdtTransactin } from '../../../blockchain/common/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { PushPlatform } from '../../../modules/pusher/types';
import { Client } from '../../../models/clients.model';
import { ClientPayed } from '../../../models/client-payed.model';
import { User } from '../../../models/users.model';
import { Serial } from '../../../models/serial.model';
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
        @InjectRepository(Serial) public readonly SerialRepo: Repository<Serial>,
        @InjectRepository(ChainTx) public readonly ChainTxRepo: Repository<ChainTx>,
        @InjectRepository(ChainTxIndex) public readonly ChainTxIndexRepo: Repository<ChainTxIndex>,
        @InjectRepository(ClientPayed) public readonly ClientPayedRepo: Repository<ClientPayed>,
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
    get Token(): Token { return Token.OMNI_USDT; }
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
        return (btcTr.type === 'bitcoin' && btcTr.sub === 'omni_usdt');
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
        senderIndexIns.isSender = true;
        senderIndexIns.token = this.Token;
        if (await this.createChainTxIndexIfNotExists(senderIndexIns)
            && senderRepo) {
            result.push(senderRepo);
        }
        const recipientIndexIns = new ChainTxIndex();
        recipientIndexIns.txId = omni.txId;
        recipientIndexIns.address = omni.reference;
        recipientIndexIns.isSender = false;
        recipientIndexIns.token = this.Token;
        if (await this.createChainTxIndexIfNotExists(recipientIndexIns)
            && referenceRepo) {
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
                fee: omni.fee,
                sending: omni.sending,
                reference: omni.reference,
                amount: omni.amount
            } as OmniUsdtDef,
            ins: [omni.sending],
            outs: [omni.reference],
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
            fee: src.fee,
            sending: src.sending,
            reference: src.reference,
            amount: src.amount
        } as ChainTxOmniData;
        chainTxIns.token = this.Token;
        return chainTxIns;
    }

    private async fromChainTx(transaction: ChainTx): Promise<OmniUsdtDef> {
        const { txId, txData, token } = transaction;
        if (token !== Token.OMNI_USDT) {
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
            fee: omniData.fee,
            sending: omniData.sending,
            reference: omniData.reference,
            amount: omniData.amount
        } as OmniUsdtDef
    }
}
