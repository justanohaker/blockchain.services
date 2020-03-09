import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Client } from '../../models/clients.model';
import { ChainSecret } from '../../models/chain.secret.model';
import { User } from '../../models/users.model';
import { AccountBTC } from '../../models/accounts.btc.model';
import { AccountETH } from '../../models/accounts.eth.model';
import { TransactionBTC, TransactionBTCIndex } from '../../models/transactions.btc.model';
import { TransactionETH } from '../../models/transactions.eth.model';

import { bipNewMnemonic } from '../../libs/helpers/bipHelper';
import { RespErrorCode } from '../../libs/responseHelper';
import {
    CoinType
} from '../../libs/types';
import {
    DespositDto,
    AddAccountRespDto,
    ListAccountRespDto,
    AccountRespDto,
    AddressRespDto,
    BalanceRespDto,
    TransactionsRespDto,
    TransactionRespDto,
    DespositRespDto
} from './wallet.dto';

import { IChainProvider } from './providers/provider.interface';
import { BtcProvider } from './providers/btc.provider';
import { EthProvider } from './providers/eth.provider';
import { NullProvider } from './providers/null.provider';

const TEST_MNEMONIC = 'cave syrup rather injury exercise unit army burden matrix horn celery gas border churn wheat';

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
        @InjectRepository(ChainSecret) private readonly secretRepo: Repository<ChainSecret>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(AccountBTC) private readonly accountBtcRepo: Repository<AccountBTC>,
        @InjectRepository(AccountETH) private readonly accountEthRepo: Repository<AccountETH>,
        @InjectRepository(TransactionBTC) private readonly transactionBtc: Repository<TransactionBTC>,
        @InjectRepository(TransactionBTCIndex) private readonly transactionIndexBtc: Repository<TransactionBTCIndex>,
        @InjectRepository(TransactionETH) private readonly transactionEth: Repository<TransactionETH>,
        private readonly btcProvider: BtcProvider,
        private readonly ethProvider: EthProvider,
        private readonly nullProvider: NullProvider
    ) { }

    async addAccount(
        clientId: string,
        accountId: string
    ): Promise<AddAccountRespDto> {
        const result: AddAccountRespDto = { success: true };
        if (await this.accountExists(clientId, accountId)) {
            result.success = false;
            result.error = 'parameter error!';
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        const userIns = new User();
        userIns.clientId = clientId;
        userIns.accountId = accountId;
        const userRepo = await this.userRepo.save(userIns);
        const secretRepo = await this.addSecretToAccount(userRepo);

        const btcAccount = await this.btcProvider.addAccount(userRepo, secretRepo.chainSecret);
        const ethAccount = await this.ethProvider.addAccount(userRepo, secretRepo.chainSecret);

        // TODO
        this.btcProvider.onNewAccount([btcAccount.address]);
        this.ethProvider.onNewAccount([ethAccount.address]);
        return result;
    }

    async listAccounts(
        clientId: string
    ): Promise<ListAccountRespDto> {
        const result: ListAccountRespDto = { success: true };
        if (!await this.clientExists(clientId)) {
            result.success = false;
            result.error = 'parameter error!';
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        const repos = await this.userRepo.find({ clientId });

        result.accountIds = [];
        for (const repo of repos) {
            result.accountIds.push(repo.accountId);
        }
        return result;
    }

    async getAccount(
        clientId: string,
        accountId: string
    ): Promise<AccountRespDto> {
        const result: AccountRespDto = { success: true };
        if (!await this.accountExists(clientId, accountId)) {
            result.success = false;
            result.error = 'parameter error!';
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        result.accountId = accountId;
        return result;
    }

    async getAddress(
        clientId: string,
        accountId: string,
        coin: CoinType
    ): Promise<AddressRespDto> {
        const result: AddressRespDto = { success: true };
        try {
            const provider = this.getProvider(coin);
            result.address = await provider.getAddress(clientId, accountId);
        } catch (error) {
            result.success = false;
            result.error = `${error}`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
        }

        return result;
    }

    async getBalance(
        clientId: string,
        accountId: string,
        coin: CoinType
    ): Promise<BalanceRespDto> {
        const result: BalanceRespDto = { success: true };
        try {
            const provider = this.getProvider(coin);
            result.balance = await provider.getBalance(clientId, accountId);
        } catch (error) {
            result.success = false;
            result.error = `${error}`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
        }
        return result;
    }

    async getTransactions(
        clientId: string,
        accountId: string,
        coin: CoinType
    ): Promise<TransactionsRespDto> {
        const result: TransactionsRespDto = { success: true };
        try {
            const provider = this.getProvider(coin);
            result.txids = await provider.getTransactions(clientId, accountId);
        } catch (error) {
            result.success = false;
            result.error = `${error}`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
        }

        return result;
    }

    async getTransaction(
        clientId: string,
        accountId: string,
        coin: CoinType,
        txId: string
    ): Promise<TransactionRespDto> {
        const result: TransactionRespDto = { success: true };
        try {
            const provider = this.getProvider(coin);
            result.data = await provider.getTransaction(clientId, accountId, txId);
        } catch (error) {
            result.success = false;
            result.error = `${error}`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
        }

        return result;
    }

    async despositTo(
        clientId: string,
        accountId: string,
        coin: CoinType,
        despositDto: DespositDto
    ): Promise<DespositRespDto> {
        const result: DespositRespDto = { success: true };
        try {
            const provider = this.getProvider(coin);
            result.txid = await provider.transfer(clientId, accountId, despositDto);
        } catch (error) {
            result.success = false;
            result.error = `${error}`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
        }

        return result;
    }

    // privates
    getProvider(coin: CoinType): IChainProvider {
        switch (coin) {
            case CoinType.BITCOIN:
                return this.btcProvider;
            case CoinType.ETHEREUM:
                return this.ethProvider;
            default:
                return this.nullProvider;
        }
    }

    async clientExists(clientId: string): Promise<boolean> {
        const repo = await this.clientRepo.findOne(clientId);
        if (repo) return true;

        return false;
    }

    async accountExists(clientId: string, accountId: string): Promise<boolean> {
        if (!await this.clientExists(clientId)) {
            return false;
        }

        const repo = await this.userRepo.findOne({ clientId, accountId });
        if (repo) return true;

        return false;
    }

    async addSecretToAccount(user: User): Promise<ChainSecret> {
        const newSecret = await bipNewMnemonic();
        // const newSecret = TEST_MNEMONIC;
        const chainsecretIns = new ChainSecret();
        chainsecretIns.clientId = user.clientId;
        chainsecretIns.accountId = user.accountId;
        chainsecretIns.chainSecret = newSecret;

        const chainsecretRepo = await this.secretRepo.save(chainsecretIns);
        return chainsecretRepo;
    }
}
