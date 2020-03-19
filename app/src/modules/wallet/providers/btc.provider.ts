import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../../../libs/types';
import { addressIsBitcoin } from '../../../libs/helpers/addressHelper';
import { BtcService } from '../../../blockchain/btc/btc.service';
import { Transaction } from '../../../blockchain/common/types';
import { BitcoinTransaction } from '../../../blockchain/common/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { PushPlatform } from '../../../modules/pusher/types';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { Serial } from '../../../models/serial.model';
import { Webhook } from '../../../models/user.webhook.model';
import { Account } from '../../../models/accounts.model';
import { ChainTx, ChainTxIndex, } from '../../../models/transactions.model';
import { ChainTxBtcData } from '../../../models/transactions.model';
import { Provider } from './provider';
import {
    BtcDef,
    TxAddActionResult,
    AddressValidator,
    TxChecker,
    TxAddAction,
    FromChainTxAction,
    ToChainTxAction
} from './types';

@Injectable()
export class BtcProvider extends Provider implements OnApplicationBootstrap {
    public readonly Logger: Logger = new Logger('BtcProvider', true);
    constructor(
        @InjectRepository(Client) public readonly ClientRepo: Repository<Client>,
        @InjectRepository(User) public readonly UserRepo: Repository<User>,
        @InjectRepository(Webhook) public readonly WebHookRepo: Repository<Webhook>,
        @InjectRepository(Account) public readonly AccountRepo: Repository<Account>,
        @InjectRepository(Serial) public readonly SerialRepo: Repository<Serial>,
        @InjectRepository(ChainTx) public readonly ChainTxRepo: Repository<ChainTx>,
        @InjectRepository(ChainTxIndex) public readonly ChainTxIndexRepo: Repository<ChainTxIndex>,
        public readonly PushService: PusherService,
        public readonly IService: BtcService,
    ) {
        super();

        this.txCheck = this.txCheck.bind(this);
        this.txAdd = this.txAdd.bind(this);
        this.fromChainTx = this.fromChainTx.bind(this);
        this.toChainTx = this.toChainTx.bind(this);
    }

    // BEGIN: properties overrides
    get Token(): Token { return Token.BITCOIN; }
    get PushPlatform(): PushPlatform { return PushPlatform.BTC; }
    get AddressValidator(): AddressValidator { return addressIsBitcoin; }
    get TxChecker(): TxChecker { return this.txCheck; }
    get TxAddAction(): TxAddAction { return this.txAdd; }
    get FromChainTxAction(): FromChainTxAction { return this.fromChainTx; }
    get ToChainTxAction(): ToChainTxAction { return this.toChainTx; }
    // END

    async onApplicationBootstrap() {
        this.IService.setProvider(this);

        const allAddresses = await this.getAddresses();
        this.IService.onUpdateBalances(allAddresses);
    }

    private async txCheck(transaction: Transaction): Promise<boolean> {
        const btcTr = transaction as BitcoinTransaction;
        return (btcTr.type === 'bitcoin' && btcTr.sub === 'btc');
    }

    private async txAdd(transaction: Transaction): Promise<TxAddActionResult> {
        const btc = transaction as BitcoinTransaction;

        const ins: string[] = [];
        const outs: string[] = [];
        for (const vin of btc.vIns) {
            if (!ins.includes(vin.address)) {
                ins.push(vin.address);
            }
        }
        for (const vout of btc.vOuts) {
            if (!outs.includes(vout.address)) {
                outs.push(vout.address);
            }
        }
        if (ins.length <= 0 && outs.length <= 0) { return null; }

        const filter: Account[] = [];
        const chainTxIns = await this.ToChainTxAction(btc);
        await this.createChainTxIfNotExists(chainTxIns);
        for (const addr of ins) {
            const accountRepo = await this.findAccountByAddress(addr);
            const indexIns = new ChainTxIndex();
            indexIns.txId = btc.txId;
            indexIns.address = addr;
            indexIns.isSender = true;
            indexIns.token = this.Token;
            if (await this.createChainTxIndexIfNotExists(indexIns)
                && accountRepo) {
                filter.push(accountRepo);
            }
        }
        for (const addr of outs) {
            const accountRepo = await this.findAccountByAddress(addr);
            const indexIns = new ChainTxIndex();
            indexIns.txId = btc.txId;
            indexIns.address = addr;
            indexIns.isSender = false;
            indexIns.token = this.Token;
            if (await this.createChainTxIndexIfNotExists(indexIns)
                && accountRepo) {
                filter.push(accountRepo);
            }
        }
        const exists: string[] = [];
        return {
            data: {
                txId: btc.txId,
                blockHeight: btc.blockHeight,
                blockTime: btc.blockTime,
                fee: btc.fee,
                vIns: btc.vIns,
                vOuts: btc.vOuts
            } as BtcDef,
            ins: ins,
            outs: outs,
            accounts: filter.filter((val: Account) => {
                if (exists.includes(val.address)) {
                    return false;
                }
                exists.push(val.address);
                return true;
            })
        };
    }

    private async toChainTx(src: BitcoinTransaction): Promise<ChainTx> {
        const chainTxIns = new ChainTx();
        chainTxIns.txId = src.txId;
        chainTxIns.txData = {
            blockHeight: src.blockHeight,
            blockTime: src.blockTime,
            fee: src.fee,
            vIns: src.vIns,
            vOuts: src.vOuts
        } as ChainTxBtcData;
        chainTxIns.token = this.Token;
        return chainTxIns;
    }

    private async fromChainTx(transaction: ChainTx): Promise<BtcDef> {
        const { txId, txData, token } = transaction;
        if (token !== Token.BITCOIN) {
            return null;
        }
        const btcData = txData as ChainTxBtcData;
        return {
            txId: txId,
            blockHeight: btcData.blockHeight,
            blockTime: btcData.blockTime,
            fee: btcData.fee,
            vIns: btcData.vIns,
            vOuts: btcData.vOuts
        } as BtcDef;
    }
}
