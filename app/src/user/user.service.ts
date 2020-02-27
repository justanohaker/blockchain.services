import { Injectable, BadRequestException, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { bcryptHash } from '../libs/helpers/bcryptHelper';
import { nanoidGenUserId } from '../libs/helpers/nanoidHelper';
import {
    bipNewMnemonic,
    bipPrivpubFromMnemonic,
    Platform,
    bipGetAddressFromXPub
} from '../libs/helpers/bipHelper';
import { genpasswordGen } from '../libs/helpers/genpasswordHelper';
import { CoinType } from '../libs/common/coin-define';

import { UserbasicsCurd } from '../curds/userbasics-curd';
import { SecretsCurd } from '../curds/secrets-curd';
import { WebhooksCurd } from '../curds/webhooks-curd';
import { BtcaccountsCurd } from '../curds/btcaccounts-curd';
import { EthaccountsCurd } from '../curds/ethaccounts-curd';
import { AddWebHookDto } from './dtos/webhook.dto';
import { BtcProvider } from '../provider/btc-provider/btc.provider';
import { EthProvider } from '../provider/eth-provider/eth.provider';

const TEST_USERNAME = 'entanmo_test';
const TEST_PASSWORD = 'entanmo@test';
const TEST_MNEMONIC = 'cave syrup rather injury exercise unit army burden matrix horn celery gas border churn wheat';

@Injectable()
export class UserService implements OnApplicationBootstrap {
    private readonly logger: Logger = new Logger("UserService", true);

    constructor(
        private readonly jwtService: JwtService,
        private readonly userbasicsCurd: UserbasicsCurd,
        // private readonly usersCurd: UsersCurd,
        private readonly secretsCurd: SecretsCurd,
        private readonly webhooksCurd: WebhooksCurd,
        private readonly btcaccountsCurd: BtcaccountsCurd,
        private readonly ethaccountsCurd: EthaccountsCurd,
        private readonly btcProvider: BtcProvider,
        private readonly ethProvider: EthProvider

    ) { }

    async onApplicationBootstrap(): Promise<void> {
        await this.registerForTest();
    }

    async registerForTest(): Promise<void> {
        try {
            const checkUserName = await this.hasUserName(TEST_USERNAME);
            if (checkUserName) {
                return;
            }
            const newUserId = await nanoidGenUserId();
            await this.userbasicsCurd.add(
                newUserId,
                TEST_USERNAME,
                await bcryptHash(TEST_PASSWORD)
            );
            const newSecret = TEST_MNEMONIC;
            await this.secretsCurd.add(newUserId, newSecret);
            // btc account
            const btcPrivPub = await bipPrivpubFromMnemonic(
                newSecret,
                Platform.BITCOIN_TESTNET
            );
            const btcAddress = await bipGetAddressFromXPub(
                Platform.BITCOIN_TESTNET,
                btcPrivPub.xpub
            );
            await this.btcaccountsCurd.add(
                newUserId,
                btcPrivPub.xpriv,
                btcPrivPub.xpub,
                btcAddress
            );
            // TODO: update balance for new user
            const btcBalance = await this.btcProvider.getBalanceOnline([btcAddress]);
            await this.btcaccountsCurd.updateBalanceByAddress(btcAddress, btcBalance[0].balance);
            // END TODO
            // eth account
            const ethPrivPub = await bipPrivpubFromMnemonic(
                newSecret,
                Platform.ETHEREUM,
            );
            const ethAddress = await bipGetAddressFromXPub(
                Platform.ETHEREUM,
                ethPrivPub.xpub
            );
            await this.ethaccountsCurd.add(
                newUserId,
                ethPrivPub.xpriv,
                ethPrivPub.xpub,
                ethAddress
            );
            // TODO: update balance for new user
            const ethBalance = await this.ethProvider.getBalanceOnline([ethAddress]);
            await this.ethaccountsCurd.updateBalanceByAddress(ethAddress, ethBalance[0].balance);
            // END TODO

            // onUserChanged
            await this.ethProvider.onUserChanged();
            await this.btcProvider.onUserChanged();
        } catch (error) {
            this.logger.log(`Exception: ${error}`);
            throw error;
        }
    }

    async register(userName: string, password: string) {
        const newUserId = await nanoidGenUserId();
        try {
            const checkUserName = await this.hasUserName(userName);
            if (checkUserName) {
                throw new BadRequestException("UserName exists!!");
            }

            await this.userbasicsCurd.add(
                newUserId,
                userName,
                await bcryptHash(password)
            );
            // TODO: balance, secret, btc_account, eth_account
            // init 
            // await this.usersCurd.add(newUserId);
            // secret
            const newSecret = await bipNewMnemonic();
            await this.secretsCurd.add(newUserId, newSecret);
            // btc account
            const btcPrivPub = await bipPrivpubFromMnemonic(
                newSecret,
                Platform.BITCOIN_TESTNET
            );
            const btcAddress = await bipGetAddressFromXPub(
                Platform.BITCOIN_TESTNET,
                btcPrivPub.xpub
            );
            console.log('UserService btcaccountcurd add');
            await this.btcaccountsCurd.add(
                newUserId,
                btcPrivPub.xpriv,
                btcPrivPub.xpub,
                btcAddress
            );
            // TODO: update balance for new user
            const btcBalance = await this.btcProvider.getBalanceOnline([btcAddress]);
            await this.btcaccountsCurd.updateBalanceByAddress(btcAddress, btcBalance[0].balance);
            // TODO: new user history transactions
            // END TODO
            // eth account
            const ethPrivPub = await bipPrivpubFromMnemonic(
                newSecret,
                Platform.ETHEREUM,
            );
            const ethAddress = await bipGetAddressFromXPub(
                Platform.ETHEREUM,
                ethPrivPub.xpub
            );
            await this.ethaccountsCurd.add(
                newUserId,
                ethPrivPub.xpriv,
                ethPrivPub.xpub,
                ethAddress
            );
            // TODO: update balance for new user
            const ethBalance = await this.ethProvider.getBalanceOnline([ethAddress]);
            await this.ethaccountsCurd.updateBalanceByAddress(ethAddress, ethBalance[0].balance);
            // TODO: new user history transactions
            // END TODO

            // onUserChanged
            await this.ethProvider.onUserChanged();
            await this.btcProvider.onUserChanged();
        } catch (error) {
            this.logger.log(`Exception: ${error}`);
            throw error;
        }
        return { user_id: newUserId };
    }

    async newUser(userId: string) {
        const newUserId = await nanoidGenUserId();
        const newPassword = await genpasswordGen();
        try {
            const checkUserName = await this.hasUserName(userId);
            if (checkUserName) {
                throw new BadRequestException("UserName exists!!");
            }
            await this.userbasicsCurd.add(
                newUserId,
                userId,
                await bcryptHash(newPassword)
            );
            // TODO: balance, secret, btc_account, eth_account
            // init 
            // await this.usersCurd.add(newUserId);
            // secret
            const newSecret = await bipNewMnemonic();
            await this.secretsCurd.add(newUserId, newSecret);
            // btc account
            const btcPrivPub = await bipPrivpubFromMnemonic(
                newSecret,
                Platform.BITCOIN_TESTNET,
            );
            const btcAddress = await bipGetAddressFromXPub(
                Platform.BITCOIN_TESTNET,
                btcPrivPub.xpub
            );
            await this.btcaccountsCurd.add(
                newUserId,
                btcPrivPub.xpriv,
                btcPrivPub.xpub,
                btcAddress
            );
            // eth account
            const ethPrivPub = await bipPrivpubFromMnemonic(
                newSecret,
                Platform.ETHEREUM,
            );
            const ethAddress = await bipGetAddressFromXPub(
                Platform.ETHEREUM,
                ethPrivPub.xpub
            );
            await this.ethaccountsCurd.add(
                newUserId,
                ethPrivPub.xpriv,
                ethPrivPub.xpub,
                ethAddress
            );

            // onUserChanged
            await this.ethProvider.onUserChanged();
            await this.btcProvider.onUserChanged();
        } catch (error) {
            this.logger.log(`Exception: ${error}`);
            throw error;
        }
        return { user_id: newUserId, password: newPassword };
    }

    async login(userName: string, uid: string) {
        const payload = { username: userName, sub: uid };
        return {
            access_token: this.jwtService.sign(payload)
        };
    }

    async detail(userName: string, uid: string) {
        const checkUid = await this.hasUserId(uid);
        if (!checkUid) {
            throw new Error(`userid(${uid}) not exists!`);
        }
        const btcAccount = await this.btcaccountsCurd.findByUid(uid);
        const ethAccount = await this.ethaccountsCurd.findByUid(uid);

        return {
            user_id: uid,
            username: userName,
            balances: {
                btc: btcAccount.balance,
                eth: ethAccount.balance
            }
        };
    }

    // webhooks
    async listWebHooks(uid: string, cond: Object = {}) {
        cond = Object.assign({}, cond, { uid: uid });
        const findRepos = await this.webhooksCurd.find(cond);
        return findRepos || [];
    }

    async addWebHook(uid: string, addWebHook: AddWebHookDto) {
        const addResult = await this.webhooksCurd.add(uid, addWebHook.url);

        return { id: addResult.id };
    }

    async delWebHook(uid: string, id: string) {
        await this.webhooksCurd.del(id);

        return {
            success: true
        };
    }

    // blockchain
    async getBlockchainAddress(uid: string, coinType: CoinType) {
        const checkUid = await this.hasUserId(uid);
        if (!checkUid) {
            throw new Error(`userid(${uid}) not exists!`);
        }
        switch (coinType) {
            case CoinType.BITCOIN: {
                const btcAccount = await this.btcaccountsCurd.findByUid(uid);
                return {
                    address: btcAccount.address
                };
            }

            case CoinType.ETHEREUM: {
                const ethAccount = await this.ethaccountsCurd.findByUid(uid);
                return {
                    address: ethAccount.address
                };
            }

            default:
                throw new Error(`unsupported cointype(${coinType})`);
        }
    }

    async getBalance(uid: string, coinType: CoinType) {
        const checkUid = await this.hasUserId(uid);
        if (!checkUid) {
            throw new Error(`userid(${uid}) not`)
        }

        switch (coinType) {
            case CoinType.BITCOIN: {
                const btcAccount = await this.btcaccountsCurd.findByUid(uid);
                return {
                    balance: btcAccount.balance
                };
            }
            case CoinType.ETHEREUM: {
                const ethAccount = await this.ethaccountsCurd.findByUid(uid);
                return {
                    balance: ethAccount.balance
                };
            }
            default:
                throw new Error(`unsupported cointype(${coinType})`);
        }
    }

    // helpers
    async hasUserName(userName: string): Promise<boolean> {
        const findResult = await this.userbasicsCurd.getByUserName(userName);

        return findResult ? true : false;
    }

    async hasUserId(uid: string): Promise<boolean> {
        const findResult = await this.userbasicsCurd.getByUid(uid);

        return findResult ? true : false;
    }
}
