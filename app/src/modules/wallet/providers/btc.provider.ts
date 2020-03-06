import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IChainProvider } from './provider.interface';
import {
    bipPrivpubFromMnemonic,
    bipGetAddressFromXPub,
    Platform,
    bipHexPrivFromxPriv
} from '../../../libs/helpers/bipHelper';
import { Client } from '../../../models/clients.model';
import { User } from '../../../models/users.model';
import { AccountBTC } from '../../../models/accounts.btc.model';
import { TransactionBTC, TransactionBTCIndex } from '../../../models/transactions.btc.model';
import { Webhook } from '../../../models/user.webhook.model';
import { DespositDto } from '../wallet.dto';

import { addressIsBitcoin } from '../../../libs/helpers/addressHelper';
import { BalanceDef, Transaction, BitcoinTransaction } from '../../../blockchain/common/types';
import { IServiceProvider } from '../../../blockchain/common/service.provider';
import { BtcService } from '../../../blockchain/btc/btc.service';
import { PusherService } from '../../pusher/pusher.service';
import { PushEventType, PushPlatform } from '../../../modules/pusher/types';

@Injectable()
export class BtcProvider implements IChainProvider, IServiceProvider, OnApplicationBootstrap {
    constructor(
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(AccountBTC) private readonly accountRepo: Repository<AccountBTC>,
        @InjectRepository(TransactionBTC) private readonly trRepo: Repository<TransactionBTC>,
        @InjectRepository(TransactionBTCIndex) private readonly trIndexRepo: Repository<TransactionBTCIndex>,
        @InjectRepository(Webhook) private readonly webhookRepo: Repository<Webhook>,
        private readonly btcService: BtcService,
        private readonly pusherService: PusherService
    ) { }

    async onApplicationBootstrap(): Promise<void> {
        await this.btcService.setProvider(this);

        const allAddresses = await this.getAddresses();
        await this.btcService.onUpdateBalances(allAddresses);
    }

    // implement IChainProvider
    async addAccount(user: User, secret: string): Promise<AccountBTC> {
        const privpub = await bipPrivpubFromMnemonic(secret, Platform.BITCOIN_TESTNET);
        const address = await bipGetAddressFromXPub(
            Platform.BITCOIN_TESTNET,
            privpub.xpub
        );
        const accountIns = new AccountBTC();
        accountIns.clientId = user.clientId;
        accountIns.accountId = user.accountId;
        accountIns.privkey = privpub.xpriv;
        accountIns.pubkey = privpub.xpub;
        accountIns.address = address;
        accountIns.balance = '0';

        const accountRepo = await this.accountRepo.save(accountIns);

        return accountRepo;
    }

    async getAddress(clientId: string, accountId: string): Promise<string> {
        if (!await this.exists(clientId, accountId)) {
            throw new Error('parameter error!');
        }

        const repo = await this.accountRepo.findOne({ clientId, accountId });
        if (!repo) {
            throw new Error('parameter error!');
        }
        return repo.address;
    }

    async getBalance(clientId: string, accountId: string): Promise<string> {
        if (!await this.exists(clientId, accountId)) {
            throw new Error('parameter error!');
        }
        const repo = await this.accountRepo.findOne({ clientId, accountId });
        if (!repo) {
            throw new Error('parameter error!');
        }
        return repo.balance;
    }

    async getTransactions(clientId: string, accountId: string): Promise<string[]> {
        if (!await this.exists(clientId, accountId)) {
            throw new Error('parameter error!');
        }
        const accountRepo = await this.accountRepo.findOne({ clientId, accountId });
        if (!accountRepo) {
            throw new Error('parameter error!');
        }

        const repos = await this.trIndexRepo.find({ address: accountRepo.address });

        const result: string[] = [];
        for (const repo of repos) {
            result.push(repo.txId);
        }
        return result;
    }

    async getTransaction(clientId: string, accountId: string, txId: string): Promise<any> {
        if (!await this.exists(clientId, accountId)) {
            throw new Error('parameter error!');
        }

        const accountRepo = await this.accountRepo.findOne({ clientId, accountId });
        const txIndexRepo = await this.trIndexRepo.findOne({ address: accountRepo.address, txId });
        if (!txIndexRepo) {
            throw new Error('parameter error!');
        }

        const repo = await this.trRepo.findOne({ txId });
        if (!repo) {
            throw new Error('parameter error!');
        }

        return repo;
    }

    async transfer(clientId: string, accountId: string, despositDto: DespositDto): Promise<string> {
        const toAddress = despositDto.address;
        const amount = despositDto.amount;
        const feePriority = despositDto.feePriority;
        if (!await addressIsBitcoin(toAddress) ||
            !await this.exists(clientId, accountId)) {
            throw new Error('parameter error!');
        }

        const accountRepo = await this.accountRepo.findOne({ clientId, accountId });

        const keyPair = {
            privateKey: await bipHexPrivFromxPriv(accountRepo.privkey, Platform.BITCOIN_TESTNET),
            address: accountRepo.address
        };

        const transferResult = await this.btcService.transfer({
            keyPair,
            address: toAddress,
            amount,
            feePriority
        });

        if (!transferResult.success) {
            throw new Error(
                typeof transferResult.error! === 'string'
                    ? transferResult.error!
                    : JSON.stringify(transferResult.error!)
            );
        }

        // TODO: push new transaction created??
        const webhooks = await this.getWebHooks(clientId, accountId);
        for (const webhook of webhooks) {
            this.pusherService.addPush(webhook.postUrl, {
                type: PushEventType.TransactionCreated,
                platform: PushPlatform.BTC,
                data: {
                    accountId: accountId,
                    address: keyPair.address,
                    txid: transferResult.txId!
                }
            });
        }
        // END TODO
        return transferResult.txId!;
    }

    async onNewAccount(accounts: string[]): Promise<void> {
        await this.btcService.onNewAccounts(accounts);
        await this.btcService.onUpdateBalances(accounts);
        // TODO: pusher new Account
        for (const account of accounts) {
            const accountRepo = await this.accountRepo.findOne({ address: account });
            if (accountRepo) {
                const webhooks = await this.getWebHooks(
                    accountRepo.clientId,
                    accountRepo.accountId
                );
                for (const webhook of webhooks) {
                    await this.pusherService.addPush(webhook.postUrl, {
                        type: PushEventType.AccountNew,
                        platform: PushPlatform.BTC,
                        data: {
                            accountId: accountRepo.accountId,
                            address: accountRepo.address
                        }
                    });
                }
            }
        }
        // END TODO
    }

    // implement IServiceProvider
    async getAddresses(): Promise<string[]> {
        const repos = await this.accountRepo.find();
        const addresses: string[] = [];
        for (const repo of repos) {
            addresses.push(repo.address);
        }

        return addresses;
    }

    async getValidAddresses(): Promise<string[]> {
        return await this.getAddresses();
    }

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {
        console.log('[BtcProvider] onBalanceChange:', JSON.stringify(newBalances, null, 2));
        for (const bln of newBalances) {
            const { address, balance } = bln;
            const repo = await this.updateBalance(address, balance);
            if (!repo) {
                continue;
            }
            // TODO: push balance changed notification
            const webhooks = await this.getWebHooks(repo.clientId, repo.accountId);
            for (const webhook of webhooks) {
                await this.pusherService.addPush(webhook.postUrl, {
                    type: PushEventType.BalanceUpdate,
                    platform: PushPlatform.BTC,
                    data: {
                        accountId: repo.accountId,
                        address: repo.address,
                        balance: bln.balance
                    }
                });
            }
            // END TODO
        }
    }

    async onNewTransaction(newTransactions: Transaction[]): Promise<void> {
        console.log('[BtcProvider] onNewTransaction:', JSON.stringify(newTransactions, null, 2));
        for (const tr of newTransactions) {
            if (tr.type !== 'bitcoin' || tr.sub !== 'btc') {
                //TODO: Unsupported!!
                continue;
            }

            const repos = await this.addTransaction(tr);
            if (!repos) {
                continue;
            }

            const addresses: string[] = [];
            // TODO: push new transaction notification
            for (const repo of repos) {
                addresses.push(repo.address);
                const webhooks = await this.getWebHooks(repo.clientId, repo.accountId);
                for (const webhook of webhooks) {
                    await this.pusherService.addPush(webhook.postUrl, {
                        type: PushEventType.TransactionConfirmed,
                        platform: PushPlatform.BTC,
                        data: {
                            txid: tr.txId,
                            blockHeight: tr.blockHeight,
                            blockTime: tr.blockTime,
                            vIns: tr.vIns,
                            vOuts: tr.vOuts
                        }
                    });
                }
            }
            this.btcService.onUpdateBalances(addresses);
            // END TODO
        }
    }

    // private
    private async exists(clientId: string, accountId: string): Promise<boolean> {
        const clientRepo = await this.clientRepo.findOne({ id: clientId });
        if (!clientRepo) {
            return false;
        }

        const userRepo = await this.userRepo.findOne({ clientId, accountId });
        if (!userRepo) {
            return false;
        }
        return true;
    }

    private async updateBalance(address: string, balance: string): Promise<AccountBTC> {
        let accountRepo = await this.accountRepo.findOne({ address });
        if (!accountRepo) {
            return null;
        }

        accountRepo.balance = balance;
        accountRepo = await this.accountRepo.save(accountRepo);
        return accountRepo;
    }

    private async getWebHooks(clientId: string, accountId: string): Promise<Webhook[]> {
        void (accountId);
        const webhookRepo = await this.webhookRepo.find({ clientId });
        return webhookRepo || [];
    }

    private async addTransaction(tr: BitcoinTransaction): Promise<AccountBTC[]> {
        const inAddresses: string[] = [];
        for (const vin of tr.vIns) {
            inAddresses.push(vin.address);
        }
        const outAddresses: string[] = [];
        for (const vout of tr.vOuts) {
            outAddresses.push(vout.address);
        };

        const repos: AccountBTC[] = [];
        for (const address of inAddresses) {
            const accountRepo = await this.accountRepo.findOne({ address });
            if (accountRepo) {
                repos.push(accountRepo);
            }
        }
        for (const address of outAddresses) {
            const accountRepo = await this.accountRepo.findOne({ address });
            if (accountRepo) {
                repos.push(accountRepo);
            }
        }
        if (repos.length <= 0) {
            return null;
        }

        const resultRepos: AccountBTC[] = [];
        const trRepo = this.trRepo.findOne({ txId: tr.txId });
        if (trRepo) {
            // found, so maybe with new address
            for (const repo of repos) {
                const indexRepo = await this.trIndexRepo.findOne({ txId: tr.txId, address: repo.address });
                if (!indexRepo) {
                    const indexIns = new TransactionBTCIndex();
                    indexIns.txId = tr.txId;
                    indexIns.address = repo.address;
                    indexIns.sender = inAddresses.includes(repo.address) ? true : false;
                    await this.trIndexRepo.save(indexIns);
                    resultRepos.push(repo);
                }
            }
        } else {
            const trIns = new TransactionBTC();
            trIns.txId = tr.txId;
            trIns.blockHeight = tr.blockHeight;
            trIns.blockTime = tr.blockTime;
            trIns.vIns = tr.vIns;
            trIns.vOuts = tr.vOuts;
            await this.trRepo.save(trIns);
            // not found, so new transaction
            for (const repo of repos) {
                const indexIns = new TransactionBTCIndex();
                indexIns.txId = tr.txId;
                indexIns.address = repo.address;
                indexIns.sender = inAddresses.includes(repo.address) ? true : false;
                await this.trIndexRepo.save(indexIns);
                resultRepos.push(repo);
            }
        }

        return resultRepos;
    }
}
