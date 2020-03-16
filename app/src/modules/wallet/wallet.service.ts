import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../models/clients.model';
import { ChainSecret } from '../../models/chain.secret.model';
import { User } from '../../models/users.model';
import { Account } from '../../models/accounts.model';
import { bipNewMnemonic } from '../../libs/helpers/bipHelper';
import { RespErrorCode } from '../../libs/responseHelper';
import { Token } from '../../libs/types';
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
    DespositRespDto,
    TokenInfo,
    TokenAccount
} from './wallet.dto';

const TEST_MNEMONIC = 'cave syrup rather injury exercise unit army burden matrix horn celery gas border churn wheat';

@Injectable()
export class WalletService implements OnModuleInit, OnModuleDestroy {
    constructor(
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
        @InjectRepository(ChainSecret) private readonly secretRepo: Repository<ChainSecret>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(Account) private readonly accountRepo: Repository<Account>,
        private readonly btcProvider: BtcProvider,
        private readonly ethProvider: EthProvider,
        private readonly omniUsdtProvider: OmniUsdtProvider,
        private readonly erc20UsdtProvider: Erc20UsdtProvider,
        private readonly nullProvider: NullProvider
    ) { }

    async onModuleInit() {
        await this.initGenerics();
        await this.checkAccountsIntegrity();
    }

    async onModuleDestroy() {
        // TODO
    }

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
        const addresses = await this.initAccounts(userRepo, secretRepo);
        result.addresses = addresses;
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

        const allTokenAccounts = await this.allTokenAccounts(clientId, accountId);
        result.tokens = [];
        for (const tokenAccount of allTokenAccounts) {
            result.tokens.push({
                [tokenAccount.token]: tokenAccount.account.address,
                balance: tokenAccount.account.balance
            });
        }
        return result;
    }

    async getAddress(
        clientId: string,
        accountId: string,
        token: Token
    ): Promise<AddressRespDto> {
        const result: AddressRespDto = { success: true };
        try {
            const provider = this.getProvider(token);
            const account = await provider.retrieveAccount(clientId, accountId);
            if (!account) {
                throw new Error('Parameter Error!');
            }
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
        token: Token
    ): Promise<BalanceRespDto> {
        const result: BalanceRespDto = { success: true };
        try {
            const provider = this.getProvider(token);
            const account = await provider.retrieveAccount(clientId, accountId);
            if (!account) {
                throw new Error('Parameter Error!');
            }
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
        token: Token
    ): Promise<TransactionsRespDto> {
        const result: TransactionsRespDto = { success: true };
        try {
            const provider = this.getProvider(token);
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
        token: Token,
        txId: string
    ): Promise<TransactionRespDto> {
        const result: TransactionRespDto = { success: true };
        try {
            const provider = this.getProvider(token);
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
        token: Token,
        despositDto: DespositDto
    ): Promise<DespositRespDto> {
        const result: DespositRespDto = { success: true };
        try {
            const provider = this.getProvider(token);
            result.txid = await provider.transfer(clientId, accountId, despositDto);
        } catch (error) {
            result.success = false;
            result.error = `${error}`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
        }

        return result;
    }

    // privates
    getProvider(token: Token): IChainProvider {
        switch (token) {
            case Token.BITCOIN:
                return this.btcProvider;
            case Token.ETHEREUM:
                return this.ethProvider;
            case Token.OMNI_USDT:
                return this.omniUsdtProvider;
            case Token.ERC20_USDT:
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

    async initAccounts(userRepo: User, secretRepo: ChainSecret): Promise<TokenInfo> {
        const result: TokenInfo = {};
        const btcAccount = await this.btcProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.btcProvider.onNewAccount([btcAccount.address]);
        result[Token.BITCOIN] = btcAccount.address;
        const ethAccount = await this.ethProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.ethProvider.onNewAccount([ethAccount.address]);
        result[Token.ETHEREUM] = ethAccount.address;
        const omniUsdtAccount = await this.omniUsdtProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.omniUsdtProvider.onNewAccount([omniUsdtAccount.address]);
        result[Token.OMNI_USDT] = omniUsdtAccount.address;
        const erc20UsdtAccount = await this.erc20UsdtProvider.addAccount(
            userRepo,
            secretRepo.chainSecret
        );
        this.erc20UsdtProvider.onNewAccount([erc20UsdtAccount.address]);
        result[Token.ERC20_USDT] = erc20UsdtAccount.address;

        return result;
    }

    private async allTokenAccounts(clientId: string, accountId: string): Promise<TokenAccount[]> {
        const result: TokenAccount[] = [];
        const btcAccount = await this.btcProvider.retrieveAccount(clientId, accountId);
        btcAccount
            && result.push({ token: Token.BITCOIN, account: btcAccount });
        const ethAccount = await this.ethProvider.retrieveAccount(clientId, accountId);
        ethAccount
            && result.push({ token: Token.ETHEREUM, account: ethAccount });
        const omniUsdtAccount = await this.omniUsdtProvider.retrieveAccount(clientId, accountId);
        omniUsdtAccount
            && result.push({ token: Token.OMNI_USDT, account: omniUsdtAccount });
        const erc20UsdtAccount = await this.erc20UsdtProvider.retrieveAccount(clientId, accountId);
        erc20UsdtAccount
            && result.push({ token: Token.ERC20_USDT, account: erc20UsdtAccount });
        return result;
    }

    private async checkAccountsIntegrity() {
        const clients = await this.clientRepo.find();
        if (!clients || clients.length <= 0) {
            return;
        }

        for (const client of clients) {
            const users = await this.userRepo.find({
                clientId: client.id
            });
            if (!users || users.length <= 0) {
                continue;
            }
            for (const user of users) {
                const secretRepo = await this.secretRepo.findOne({
                    clientId: client.id,
                    accountId: user.accountId
                });

                await this.checkOrCreateIfNeed(user, secretRepo);
            }
        }
    }

    private async checkOrCreateIfNeed(user: User, secret: ChainSecret) {
        // Bitcoin
        const btcAccount = await this.btcProvider.retrieveAccount(
            user.clientId,
            user.accountId
        );
        !btcAccount
            && await this.btcProvider.addAccount(user, secret.chainSecret);

        // Ethereum
        const ethAccount = await this.ethProvider.retrieveAccount(
            user.clientId,
            user.accountId
        );
        !ethAccount
            && await this.ethProvider.addAccount(user, secret.chainSecret);
        // Omni-USDT
        const omniUsdtAccount = await this.omniUsdtProvider.retrieveAccount(
            user.clientId,
            user.accountId
        );
        !omniUsdtAccount
            && await this.omniUsdtProvider.addAccount(user, secret.chainSecret);
        // ERC20-USDT
        const erc20UsdtAccount = await this.erc20UsdtProvider.retrieveAccount(
            user.clientId,
            user.accountId
        );
        !erc20UsdtAccount
            && await this.erc20UsdtProvider.addAccount(user, secret.chainSecret);
    }

    private async initGenerics() {

    }
}
