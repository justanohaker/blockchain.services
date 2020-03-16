import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token } from '../../../libs/types';
import { addressIsEthereum } from '../../../libs/helpers/addressHelper';
import { EthService } from '../../../blockchain/eth/eth.service';
import { Transaction } from '../../../blockchain/common/types';
import { EthereumTransaction } from '../../../blockchain/common/types';
import { PusherService } from '../../../modules/pusher/pusher.service';
import { PushPlatform } from '../../../modules/pusher/types';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { Webhook } from '../../../models/user.webhook.model';
import { Account } from '../../../models/accounts.model';
import { ChainTx, ChainTxIndex } from '../../../models/transactions.model';
import { ChainTxEthData } from '../../../models/transactions.model';
import { Provider } from './provider';
import {
    EthDef,
    TxAddActionResult,
    AddressValidator,
    TxChecker,
    FromChainTxAction,
    ToChainTxAction,
    TxAddAction
} from './types';

@Injectable()
export class EthProvider extends Provider implements OnApplicationBootstrap {
    readonly Logger: Logger = new Logger('EthProvider', true);
    constructor(
        @InjectRepository(Client) public readonly ClientRepo: Repository<Client>,
        @InjectRepository(User) public readonly UserRepo: Repository<User>,
        @InjectRepository(Webhook) public readonly WebHookRepo: Repository<Webhook>,
        @InjectRepository(Account) public readonly AccountRepo: Repository<Account>,
        @InjectRepository(ChainTx) public readonly ChainTxRepo: Repository<ChainTx>,
        @InjectRepository(ChainTxIndex) public readonly ChainTxIndexRepo: Repository<ChainTxIndex>,
        public readonly PushService: PusherService,
        public readonly IService: EthService
    ) {
        super();

        this.txCheck = this.txCheck.bind(this);
        this.txAdd = this.txAdd.bind(this);
        this.fromChainTx = this.fromChainTx.bind(this);
        this.toChainTx = this.toChainTx.bind(this);
    }

    // BEGIN: override properties
    get Token(): Token { return Token.ETHEREUM; }
    get PushPlatform(): PushPlatform { return PushPlatform.ETH; }
    get AddressValidator(): AddressValidator { return addressIsEthereum; }
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
        const btcTr = transaction as EthereumTransaction;
        return (btcTr.type === 'ethereum' && btcTr.sub === 'eth');
    }

    private async txAdd(transaction: Transaction): Promise<TxAddActionResult> {
        const eth = transaction as EthereumTransaction;

        const senderRepo = await this.findAccountByAddress(eth.sender);
        const recipientRepo = await this.findAccountByAddress(eth.recipient);
        if (!senderRepo && !recipientRepo) { return null; }
        const chainTxIns = await this.ToChainTxAction(eth);
        await this.createChainTxIfNotExists(chainTxIns);
        const result: Account[] = [];
        const senderIndexIns = new ChainTxIndex();
        senderIndexIns.txId = eth.txId;
        senderIndexIns.address = eth.sender;
        senderIndexIns.isSender = true;
        senderIndexIns.token = this.Token;
        if (await this.createChainTxIndexIfNotExists(senderIndexIns)) {
            result.push(senderRepo);
        }
        const recipientIndexIns = new ChainTxIndex();
        recipientIndexIns.txId = eth.txId;
        recipientIndexIns.address = eth.recipient;
        recipientIndexIns.isSender = false;
        recipientIndexIns.token = this.Token;
        if (await this.createChainTxIndexIfNotExists(recipientIndexIns)) {
            result.push(recipientRepo);
        }

        return {
            data: {
                txId: eth.txId,
                blockHeight: eth.blockHeight,
                nonce: eth.nonce,
                sender: eth.sender,
                recipient: eth.recipient,
                amount: eth.amount
            } as EthDef,
            accounts: result
        };
    }

    private async toChainTx(src: EthereumTransaction): Promise<ChainTx> {
        return {
            txId: src.txId,
            txData: {
                blockHeight: src.blockHeight,
                nonce: src.nonce,
                sender: src.sender,
                recipient: src.recipient,
                amount: src.amount
            } as ChainTxEthData,
            token: this.Token
        };
    }

    private async fromChainTx(transaction: ChainTx): Promise<EthDef> {
        const { txId, txData, token } = transaction;
        if (token !== Token.ETHEREUM) {
            return null;
        }
        const ethData = txData as ChainTxEthData;
        return {
            txId: txId,
            blockHeight: ethData.blockHeight,
            nonce: ethData.nonce,
            sender: ethData.sender,
            recipient: ethData.recipient,
            amount: ethData.amount
        } as EthDef;
    }
}
