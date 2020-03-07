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
import { AccountETH } from '../../../models/accounts.eth.model';
import { TransactionETH } from '../../../models/transactions.eth.model';
import { Webhook } from '../../../models/user.webhook.model';
import { DespositDto } from '../wallet.dto';

import { BalanceDef, Transaction, EthereumTransaction } from '../../../blockchain/common/types';
import { addressIsEthereum } from '../../../libs/helpers/addressHelper';
import { IServiceProvider } from '../../../blockchain/common/service.provider';
import { EthService } from '../../../blockchain/eth/eth.service';
import { PusherService } from '../../pusher/pusher.service';
import { PushEventType, PushPlatform } from '../../../modules/pusher/types';

@Injectable()
export class EthProvider implements IChainProvider, IServiceProvider, OnApplicationBootstrap {
    constructor(
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(AccountETH) private readonly accountRepo: Repository<AccountETH>,
        @InjectRepository(TransactionETH) private readonly trRepo: Repository<TransactionETH>,
        @InjectRepository(Webhook) private readonly webhookRepo: Repository<Webhook>,
        private readonly ethService: EthService,
        private readonly pusherService: PusherService
    ) { }

    async onApplicationBootstrap(): Promise<void> {
        this.ethService.setProvider(this);

        // init update balances
        const allAddresses = await this.getAddresses();
        this.ethService.onUpdateBalances(allAddresses);
    }

    // implement IChainProvider
    async addAccount(user: User, secret: string): Promise<AccountETH> {
        const privpub = await bipPrivpubFromMnemonic(secret, Platform.ETHEREUM);
        const address = await bipGetAddressFromXPub(
            Platform.ETHEREUM,
            privpub.xpub
        );
        const accountIns = new AccountETH();
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

        const repos = await this.trRepo.find({
            where: [
                { sender: accountRepo.address },
                { recipient: accountRepo.address }
            ]
        });

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

        const repo = await this.trRepo.findOne({
            where: [
                { sender: accountRepo.address, txId },
                { recipient: accountRepo.address, txId }
            ]
        });
        if (!repo) {
            throw new Error('parameter error!');
        }

        return repo;
    }

    async transfer(clientId: string, accountId: string, despositDto: DespositDto): Promise<string> {
        const toAddress = despositDto.address;
        const amount = despositDto.amount;
        const feePriority = despositDto.feePriority;
        if (!await addressIsEthereum(toAddress) ||
            !await this.exists(clientId, accountId)) {
            throw new Error('parameter error!');
        }
        const accountRepo = await this.accountRepo.findOne({ clientId, accountId });

        const keyPair = {
            privateKey: await bipHexPrivFromxPriv(accountRepo.privkey, Platform.ETHEREUM),
            address: accountRepo.address
        };

        const transferResult = await this.ethService.transfer({
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
                platform: PushPlatform.ETH,
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
        this.ethService.onNewAccounts(accounts);
        this.ethService.onUpdateBalances(accounts);
        // TODO: pusher new accounts
        for (const account of accounts) {
            const accountRepo = await this.accountRepo.findOne({ address: account });
            if (accountRepo) {
                const webhooks = await this.getWebHooks(
                    accountRepo.clientId,
                    accountRepo.accountId
                );
                for (const webhook of webhooks) {
                    this.pusherService.addPush(webhook.postUrl, {
                        type: PushEventType.AccountNew,
                        platform: PushPlatform.ETH,
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

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {
        console.log('[EthProvider] onBalanceChanged:', JSON.stringify(newBalances, null, 2));
        for (const bln of newBalances) {
            const { address, balance } = bln;
            const repo = await this.updateBalance(address, balance);
            if (!repo) {
                continue;
            }
            // TODO: push balance changed notification
            const webhooks = await this.getWebHooks(repo.clientId, repo.accountId);
            for (const webhook of webhooks) {
                this.pusherService.addPush(webhook.postUrl, {
                    type: PushEventType.BalanceUpdate,
                    platform: PushPlatform.ETH,
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
        console.log('[EthProvider] onNewTransaction:', JSON.stringify(newTransactions, null, 2));
        for (const tr of newTransactions) {
            if (tr.type !== 'ethereum' || tr.sub !== 'eth') {
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
                    this.pusherService.addPush(webhook.postUrl, {
                        type: PushEventType.TransactionConfirmed,
                        platform: PushPlatform.ETH,
                        data: {
                            accountId: repo.accountId,
                            address: repo.address,
                            transaction: {
                                txid: tr.txId,
                                blockHeight: tr.blockHeight,
                                nonce: tr.nonce,
                                sender: tr.sender,
                                recipient: tr.recipient,
                                amount: tr.amount
                            }
                        }
                    });
                }
            }
            this.ethService.onUpdateBalances(addresses);
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

    private async updateBalance(address: string, balance: string): Promise<AccountETH> {
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

    private async addTransaction(tr: EthereumTransaction): Promise<AccountETH[]> {
        const accountRepos = await this.accountRepo.find({
            where: [
                { address: tr.sender },
                { address: tr.recipient }
            ]
        });
        if (!accountRepos) {
            return null;
        }

        const trRepo = await this.trRepo.findOne({ txId: tr.txId });
        if (trRepo) {
            return null;
        }

        const trIns = new TransactionETH();
        trIns.txId = tr.txId;
        trIns.blockHeight = tr.blockHeight;
        trIns.nonce = tr.nonce;
        trIns.sender = tr.sender;
        trIns.recipient = tr.recipient;
        trIns.amount = tr.amount;

        await this.trRepo.save(trIns);
        return accountRepos;
    }
}
