import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoinType } from '../../../libs/types';
import { Platform } from '../../../libs/helpers/bipHelper';
import { addressIsEthereum } from '../../../libs/helpers/addressHelper';
import { Erc20UsdtService } from '../../../blockchain/erc20-tokens/erc20-usdt/erc20-usdt.service';
import { Transaction } from '../../../blockchain/common/types';
import { Erc20UsdtTransaction } from '../../../blockchain/common/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { PushPlatform } from '../../../modules/pusher/types';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { Webhook } from '../../../models/user.webhook.model';
import { Account } from '../../../models/accounts.model';
import { ChainTx, ChainTxIndex, ChainTxERC20Data } from '../../../models/transactions.model';
import { Provider } from './provider';
import {
    ERC20UsdtDef,
    TxAddActionResult,
    AddressValidator,
    TxChecker,
    TxAddAction,
    FromChainTxAction,
    ToChainTxAction
} from './types';

@Injectable()
export class Erc20UsdtProvider extends Provider implements OnApplicationBootstrap {
    public readonly Logger: Logger = new Logger('Erc20UsdtProvider', true);
    constructor(
        @InjectRepository(Client) public readonly ClientRepo: Repository<Client>,
        @InjectRepository(User) public readonly UserRepo: Repository<User>,
        @InjectRepository(Webhook) public readonly WebHookRepo: Repository<Webhook>,
        @InjectRepository(Account) public readonly AccountRepo: Repository<Account>,
        @InjectRepository(ChainTx) public readonly ChainTxRepo: Repository<ChainTx>,
        @InjectRepository(ChainTxIndex) public readonly ChainTxIndexRepo: Repository<ChainTxIndex>,
        public readonly PushService: PusherService,
        public readonly IService: Erc20UsdtService
    ) {
        super();

        this.txCheck = this.txCheck.bind(this);
        this.txAdd = this.txAdd.bind(this);
        this.fromChainTx = this.fromChainTx.bind(this);
        this.toChainTx = this.toChainTx.bind(this);
    }

    // BEGIN: override properties
    get Flag(): CoinType { return CoinType.ERC20_USDT; }
    get Platform(): Platform { return Platform.ETHEREUM; }
    get PushPlatform(): PushPlatform { return PushPlatform.ERC20_USDT; }
    get AddressValidator(): AddressValidator { return addressIsEthereum; }
    get TxChecker(): TxChecker { return this.txCheck; }
    get TxAddAction(): TxAddAction { return this.txAdd; }
    get FromChainTxAction(): FromChainTxAction { return this.fromChainTx; }
    get ToChainTxAction(): ToChainTxAction { return this.ToChainTxAction; }
    // END

    async onApplicationBootstrap() {
        this.IService?.setProvider(this);

        const allAddresses = await this.getAddresses();
        this.IService?.onUpdateBalances(allAddresses);
    }

    private async txCheck(transaction: Transaction): Promise<boolean> {
        const btcTr = transaction as Erc20UsdtTransaction;
        return (btcTr.type === 'ethereum' && btcTr.sub === 'erc20-usdt');
    }

    private async txAdd(transaction: Transaction): Promise<TxAddActionResult> {
        const erc20Usdt = transaction as Erc20UsdtTransaction;

        const senderRepo = await this.findAccount(erc20Usdt.sender, this.Flag);
        const recipientRepo = await this.findAccount(erc20Usdt.recipient, this.Flag);
        if (!senderRepo && !recipientRepo) {
            return null;
        }
        const chainTxIns = await this.ToChainTxAction(erc20Usdt);
        await this.createChainTxIfNotExists(chainTxIns);
        const result: Account[] = [];
        const senderIndexIns = new ChainTxIndex();
        senderIndexIns.txId = erc20Usdt.txId;
        senderIndexIns.address = erc20Usdt.sender;
        senderIndexIns.sender = true;
        senderIndexIns.flag = this.Flag;
        if (await this.createChainTxIndexIfNotExists(senderIndexIns)) {
            result.push(senderRepo);
        }
        const recipientIndexIns = new ChainTxIndex();
        recipientIndexIns.txId = erc20Usdt.txId;
        recipientIndexIns.address = erc20Usdt.recipient;
        recipientIndexIns.sender = false;
        recipientIndexIns.flag = this.Flag;
        if (await this.createChainTxIndexIfNotExists(recipientIndexIns)) {
            result.push(recipientRepo);
        }

        return {
            data: {
                txId: erc20Usdt.txId,
                blockHeight: erc20Usdt.blockHeight,
                sender: erc20Usdt.sender,
                recipient: erc20Usdt.recipient,
                amount: erc20Usdt.amount
            } as ERC20UsdtDef,
            accounts: result
        };
    }

    private async toChainTx(src: Erc20UsdtTransaction): Promise<ChainTx> {
        const chainTxIns = new ChainTx();
        chainTxIns.txId = src.txId;
        chainTxIns.txData = {
            blockHeight: src.blockHeight,
            sender: src.sender,
            recipient: src.recipient,
            amount: src.amount
        } as ChainTxERC20Data;
        chainTxIns.flag = this.Flag;
        return chainTxIns;
    }

    private async fromChainTx(transaction: ChainTx): Promise<ERC20UsdtDef> {
        const { txId, txData, flag } = transaction;
        if (flag !== CoinType.BITCOIN) {
            return null;
        }
        const erc20Data = txData as ChainTxERC20Data;
        return {
            txId: txId,
            blockHeight: erc20Data.blockHeight,
            sender: erc20Data.sender,
            recipient: erc20Data.recipient,
            amount: erc20Data.amount
        } as ERC20UsdtDef;
    }
}
