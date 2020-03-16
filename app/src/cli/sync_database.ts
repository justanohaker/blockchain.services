import 'reflect-metadata';
import {
    createConnection,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    PrimaryColumn,
    Connection
} from 'typeorm';

// new models
import { Client } from '../models/clients.model';
import { User } from '../models/users.model';
import { Account } from '../models/accounts.model';
import { ChainSecret } from '../models/chain.secret.model';
import { Webhook } from '../models/user.webhook.model';
import {
    ChainTx,
    ChainTxIndex,
    ChainTxEthData,
    ChainTxBtcData
} from '../models/transactions.model';
import { Token } from '../libs/types';

// old models
@Entity('client')
class OldClient {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    @Column()
    client: string;
    @Column()
    secret: string;
    @Column()
    enabled: boolean;
}

@Entity('user')
class OldUser {
    @PrimaryColumn()
    id: string;
    @Column()
    clientId: string;
    @Column()
    accountId: string;
}

@Entity('chain_secret')
class OldChainSecret {
    @PrimaryColumn()
    id: string;
    @Column()
    clientId: string;
    @Column()
    accountId: string;
    @Column()
    chainSecret: string;
}

@Entity('webhook')
class OldWebHook {
    @PrimaryColumn()
    id: string;
    @Column()
    clientId: string;
    @Column()
    postUrl: string;
}

@Entity('account_btc')
class OldAccountBtc {
    @PrimaryColumn()
    id: string;
    @Column()
    clientId: string;
    @Column()
    accountId: string;
    @Column()
    pubkey: string;
    @Column()
    privkey: string;
    @Column()
    address: string;
    @Column()
    balance: string;
}

@Entity('account_eth')
class OldAccountEth {
    @PrimaryColumn()
    id: string;
    @Column()
    clientId: string;
    @Column()
    accountId: string;
    @Column()
    pubkey: string;
    @Column()
    privkey: string;
    @Column()
    address: string;
    @Column()
    balance: string;
}

type VIn = {
    address: string;
    amount: string;
}
type VOut = {
    address: string;
    amount: string;
}

@Entity('transaction_btc')
class OldTransactionBtc {
    @PrimaryColumn()
    txId: string;
    @Column()
    blockHeight: number;
    @Column()
    blockTime: number;
    @Column('simple-json')
    vIns: VIn[];
    @Column('simple-json')
    vOuts: VOut[];
}

@Entity('transaction_btc_index')
class OldTransactionBtcIndex {
    @PrimaryColumn()
    id: string;
    @Column()
    address: string;
    @Column()
    txId: string;
    @Column()
    sender: boolean;
}

@Entity('transaction_eth')
class OldTransactionEth {
    @PrimaryColumn()
    txId: string;
    @Column()
    blockHeight: number;
    @Column()
    nonce: number;
    @Column()
    sender: string;
    @Column()
    recipient: string;
    @Column()
    amount: string;
}

async function getConnection(): Promise<Connection[]> {
    const result: Connection[] = [];
    const oldConnection = await createConnection({
        type: 'sqlite',
        name: 'old_datas',
        database: 'app.sqlite.backup',
        synchronize: true,
        entities: [
            OldClient,
            OldUser,
            OldChainSecret,
            OldWebHook,
            OldAccountBtc,
            OldAccountEth,
            OldTransactionBtc,
            OldTransactionBtcIndex,
            OldTransactionEth
        ]
    });
    result.push(oldConnection);
    const newConnection = await createConnection({
        type: 'sqlite',
        name: 'new_datas',
        database: 'app.sqlite',
        synchronize: true,
        entities: [
            Client,
            User,
            Account,
            ChainSecret,
            Webhook,
            ChainTx,
            ChainTxIndex
        ]
    });
    result.push(newConnection);
    return result;
}

async function updateClient(conns: Connection[]) {
    const [oldConn, newConn] = conns;
    const oldClientRepo = await oldConn.getRepository(OldClient);
    const newClientRepo = await newConn.getRepository(Client);
    const oldClients = await oldClientRepo.find();
    for (const oldClient of oldClients) {
        const clientIns = new Client();
        clientIns.id = oldClient.id;
        clientIns.client = oldClient.client;
        clientIns.secret = oldClient.secret;
        clientIns.enabled = oldClient.enabled;
        await newClientRepo.save(clientIns);
    }
}

async function updateAccount(conns: Connection[]) {
    const [oldConn, newConn] = conns;
    const oldUserRepo = await oldConn.getRepository(OldUser);
    const oldSecretRepo = await oldConn.getRepository(OldChainSecret);
    const oldAccountBtcRepo = await oldConn.getRepository(OldAccountBtc);
    const oldAccountEthRepo = await oldConn.getRepository(OldAccountEth);
    const oldWebHookRepo = await oldConn.getRepository(OldWebHook);

    const newUserRepo = await newConn.getRepository(User);
    const newSecretRepo = await newConn.getRepository(ChainSecret);
    const newAccountRepo = await newConn.getRepository(Account);
    const newWebHookRepo = await newConn.getRepository(Webhook);

    // user model
    const users = await oldUserRepo.find();
    for (const user of users) {
        const userIns = new User();
        // userIns.id = 
        userIns.clientId = user.clientId;
        userIns.accountId = user.accountId;
        await newUserRepo.save(userIns);
    }
    // secret model
    const secrets = await oldSecretRepo.find();
    for (const secret of secrets) {
        const secretIns = new ChainSecret();
        secretIns.clientId = secret.clientId;
        secretIns.accountId = secret.accountId;
        secretIns.chainSecret = secret.chainSecret;
        await newSecretRepo.save(secretIns);
    }
    // account model
    const btcAccounts = await oldAccountBtcRepo.find();
    for (const btcAccount of btcAccounts) {
        const accountIns = new Account();
        // accountIns.id = 
        accountIns.clientId = btcAccount.clientId;
        accountIns.accountId = btcAccount.accountId;
        accountIns.pubkey = btcAccount.pubkey;
        accountIns.privkey = btcAccount.privkey;
        accountIns.address = btcAccount.address;
        accountIns.balance = btcAccount.balance;
        accountIns.token = Token.BITCOIN;
        await newAccountRepo.save(accountIns);
    }
    const ethAccounts = await oldAccountEthRepo.find();
    for (const ethAccount of ethAccounts) {
        const accountIns = new Account();
        // accountIns.id = 
        accountIns.clientId = ethAccount.clientId;
        accountIns.accountId = ethAccount.accountId;
        accountIns.pubkey = ethAccount.pubkey;
        accountIns.privkey = ethAccount.privkey;
        accountIns.address = ethAccount.address;
        accountIns.balance = ethAccount.balance;
        accountIns.token = Token.ETHEREUM;
        await newAccountRepo.save(accountIns);
    }
    // webhook model
    const webhooks = await oldWebHookRepo.find();
    for (const webhook of webhooks) {
        const webhookIns = new Webhook();
        webhookIns.id = webhook.id;
        webhookIns.clientId = webhook.clientId;
        webhookIns.postUrl = webhook.postUrl;
        await newWebHookRepo.save(webhookIns);
    }
}

async function updateTransaction(conns: Connection[]) {
    const [oldConn, newConn] = conns;
    const oldTrBtcRepo = oldConn.getRepository(OldTransactionBtc);
    const oldTrEthRepo = oldConn.getRepository(OldTransactionEth);

    const newAccountRepo = newConn.getRepository(Account);
    const newTrRepo = newConn.getRepository(ChainTx);
    const newTrIndexRepo = newConn.getRepository(ChainTxIndex);

    const btcTrs = await oldTrBtcRepo.find();
    const btcAccounts = await newAccountRepo.find({
        token: Token.BITCOIN
    });
    const btcAddresses = btcAccounts.map((account: Account) => account.address);
    for (const tr of btcTrs) {
        const tx = new ChainTx();
        tx.txId = tr.txId;
        tx.txData = {} as ChainTxBtcData;
        tx.token = Token.BITCOIN;
        await newTrRepo.save(tx);

        const inAddresses: string[] = [];
        tr.vIns.forEach((value: VIn) => {
            if (inAddresses.includes(value.address)) {
                return;
            }
            inAddresses.push(value.address);
        });
        for (const addr of inAddresses) {
            if (btcAddresses.includes(addr)) {
                const txIndex = new ChainTxIndex();
                txIndex.txId = tr.txId;
                txIndex.address = addr;
                txIndex.isSender = true;
                txIndex.token = Token.BITCOIN;
                await newTrIndexRepo.save(txIndex);
            }
        }
        const outAddresses: string[] = [];
        tr.vOuts.forEach((value: VOut) => {
            if (outAddresses.includes(value.address)) {
                return;
            }
            outAddresses.push(value.address);
        });
        for (const addr of outAddresses) {
            if (btcAddresses.includes(addr)) {
                const txIndex = new ChainTxIndex();
                txIndex.txId = tr.txId;
                txIndex.address = addr;
                txIndex.isSender = false;
                txIndex.token = Token.BITCOIN;
                await newTrIndexRepo.save(txIndex);
            }
        }
    }
    const ethTrs = await oldTrEthRepo.find();
    const ethAccounts = await newAccountRepo.find({
        token: Token.ETHEREUM
    });
    const ethAddresses = ethAccounts.map((account: Account) => account.address);
    for (const tr of ethTrs) {
        const tx = new ChainTx;
        tx.txId = tr.txId;
        tx.txData = {
            blockHeight: tr.blockHeight,
            nonce: tr.nonce,
            sender: tr.sender,
            recipient: tr.recipient,
            amount: tr.amount
        } as ChainTxEthData;
        tx.token = Token.ETHEREUM;
        await newTrRepo.save(tx);

        // sender index
        if (ethAddresses.includes(tr.sender)) {
            const txIndex = new ChainTxIndex();
            txIndex.txId = tr.txId;
            txIndex.address = tr.sender;
            txIndex.isSender = true;
            txIndex.token = Token.ETHEREUM;
            await newTrIndexRepo.save(txIndex);
        }
        // recipient index
        if (ethAddresses.includes(tr.recipient)) {
            const txIndex = new ChainTxIndex();
            txIndex.txId = tr.txId;
            txIndex.address = tr.recipient;
            txIndex.isSender = false;
            txIndex.token = Token.ETHEREUM;
            await newTrIndexRepo.save(txIndex);
        }
    }
}

async function main() {
    const conns = await getConnection();
    console.log('Sync Client...');
    await updateClient(conns);
    console.log('Sync Account...');
    await updateAccount(conns);
    console.log('Suync Transaction...');
    await updateTransaction(conns);
    console.log('Sync Finished! Enjoy...');
}

main();