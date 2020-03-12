import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoinType } from '../../../libs/types';
import { Platform } from '../../../libs/helpers/bipHelper';
import { addressIsBitcoin } from '../../../libs/helpers/addressHelper';
import { BtcService } from '../../../blockchain/btc/btc.service';
import { Transaction } from '../../../blockchain/common/types';
import { IService } from '../../../blockchain/common/service.interface';
import { BitcoinTransaction } from '../../../blockchain/common/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { PushPlatform } from '../../../modules/pusher/types';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
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
    get Flag(): CoinType { return CoinType.BITCOIN; }
    get Platform(): Platform { return Platform.BITCOIN_TESTNET; }
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
        const inRepos: Account[] = [];
        const outRepos: Account[] = [];
        for (const vin of btc.vIns) {
            if (ins.includes(vin.address)) {
                continue;
            }
            ins.push(vin.address);
            const accountRepo = await this.findAccount(vin.address, this.Flag);
            if (accountRepo) {
                inRepos.push(accountRepo);
            }
        }
        for (const vout of btc.vOuts) {
            if (outs.includes(vout.address)) {
                continue;
            }
            ins.push(vout.address);
            const accountRepo = await this.findAccount(vout.address, this.Flag);
            if (accountRepo) {
                outRepos.push(accountRepo);
            }
        }

        if (inRepos.length <= 0 && outRepos.length <= 0) {
            return null;
        }

        const filter: Account[] = [];
        const chainTxIns = await this.ToChainTxAction(btc);
        await this.createChainTxIfNotExists(chainTxIns);
        for (const inRepo of inRepos) {
            const indexIns = new ChainTxIndex();
            indexIns.txId = btc.txId;
            indexIns.address = inRepo.address;
            indexIns.sender = true;
            indexIns.flag = this.Flag;
            if (await this.createChainTxIndexIfNotExists(indexIns)) {
                filter.push(inRepo);
            }
        }
        for (const outRepo of outRepos) {
            const indexIns = new ChainTxIndex();
            indexIns.txId = btc.txId;
            indexIns.address = outRepo.address;
            indexIns.sender = false;
            indexIns.flag = this.Flag;
            if (await this.ChainTxIndexRepo.save(indexIns)) {
                filter.push(outRepo);
            }
        }
        const filterCointainer: string[] = [];
        return {
            data: {
                txId: btc.txId,
                blockHeight: btc.blockHeight,
                blockTime: btc.blockTime,
                vIns: btc.vIns,
                vOuts: btc.vOuts
            } as BtcDef,
            accounts: filter.filter((val: Account) => {
                if (filterCointainer.includes(val.address)) {
                    return false;
                }
                filterCointainer.push(val.address);
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
            vIns: src.vIns,
            vOuts: src.vOuts
        } as ChainTxBtcData;
        chainTxIns.flag = this.Flag;
        return chainTxIns;
    }

    private async fromChainTx(transaction: ChainTx): Promise<BtcDef> {
        const { txId, txData, flag } = transaction;
        if (flag !== CoinType.BITCOIN) {
            return null;
        }
        const btcData = txData as ChainTxBtcData;
        return {
            txId: txId,
            blockHeight: btcData.blockHeight,
            blockTime: btcData.blockTime,
            vIns: btcData.vIns,
            vOuts: btcData.vOuts
        } as BtcDef;
    }
}
