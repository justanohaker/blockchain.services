import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../models/clients.model';
import { ChainSecret } from '../../models/chain.secret.model';
import { User } from '../../models/users.model';
import { bipNewMnemonic } from '../../libs/helpers/bipHelper';
import { RespErrorCode } from '../../libs/responseHelper';
import { CoinType } from '../../libs/types';
import { IChainProvider } from './providers/provider.interface';
import { NullProvider } from './providers/null.provider';
import { BtcProvider } from './providers/btc.provider';
import { EthProvider } from './providers/eth.provider';
import { Erc20UsdtProvider } from './providers/erc20-usdt.provider';
import { OmniUsdtProvider } from './providers/omni-usdt.provider';
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

const TEST_MNEMONIC = 'cave syrup rather injury exercise unit army burden matrix horn celery gas border churn wheat';

@Injectable()
export class WalletService {
    constructor(
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
        @InjectRepository(ChainSecret) private readonly secretRepo: Repository<ChainSecret>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        private readonly btcProvider: BtcProvider,
        private readonly ethProvider: EthProvider,
        private readonly omniUsdtProvider: OmniUsdtProvider,
        private readonly erc20UsdtProvider: Erc20UsdtProvider,
        private readonly nullProvider: NullProvider
    ) { }

    async addAccount(clientId: string, accountId: string): Promise<AddAccountRespDto> {
        const result: AddAccountRespDto = { success: true };
        if (await this.accountExists(clientId, accountId)) {
            result.success = false;
            result.error = 'Parameter Error!';
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        const userIns = new User();
        userIns.clientId = clientId;
        userIns.accountId = accountId;
        const userRepo = await this.userRepo.save(userIns);
        const secretRepo = await this.addSecretToAccount(userRepo);
        await this.initAccounts(userRepo, secretRepo);

        return result;
    }

    async listAccounts(clientId: string): Promise<ListAccountRespDto> {
        const result: ListAccountRespDto = { success: true };
        if (!await this.clientExists(clientId)) {
            result.success = false;
            result.error = 'Parameter Error!';
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

    async getAccount(clientId: string, accountId: string): Promise<AccountRespDto> {
        const result: AccountRespDto = { success: true };
        if (!await this.accountExists(clientId, accountId)) {
            result.success = false;
            result.error = 'Parameter Error!';
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
            const account = await provider.retrieveAccount(clientId, accountId);
            result.address = account.address;
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
            const account = await provider.retrieveAccount(clientId, accountId);
            result.balance = account.balance;
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
            case CoinType.OMNI_USDT:
                return this.omniUsdtProvider;
            case CoinType.ERC20_USDT:
                return this.erc20UsdtProvider;
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
        // const newSecret = await bipNewMnemonic();
        const newSecret = TEST_MNEMONIC;
        const chainsecretIns = new ChainSecret();
        chainsecretIns.clientId = user.clientId;
        chainsecretIns.accountId = user.accountId;
        chainsecretIns.chainSecret = newSecret;

        const chainsecretRepo = await this.secretRepo.save(chainsecretIns);
        return chainsecretRepo;
    }

    async initAccounts(userRepo: User, secretRepo: ChainSecret): Promise<void> {
        const btcAccount = await this.btcProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.btcProvider.onNewAccount([btcAccount.address]);
        const ethAccount = await this.ethProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.ethProvider.onNewAccount([ethAccount.address]);
        const omniUsdtAccount = await this.omniUsdtProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.omniUsdtProvider.onNewAccount([omniUsdtAccount.address]);
        const erc20UsdtAccount = await this.erc20UsdtProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.erc20UsdtProvider.onNewAccount([erc20UsdtAccount.address]);
    }
}
