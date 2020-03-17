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

async function getConnection(): Promise<Connection> {
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
    return newConnection;
}

type AppInfo = {
    client: string;
}

const deletes: AppInfo[] = [
    { client: 'aa' },
    { client: 'aaa' },
    { client: 'aaab' },
    { client: 'zjl' }
];

async function main() {
    const conn = await getConnection();
    const clientRepo = conn.getRepository(Client);
    const userRepo = conn.getRepository(User);
    const accountRepo = conn.getRepository(Account);
    const chainSecretRepo = conn.getRepository(ChainSecret);
    const webhookRepo = conn.getRepository(Webhook);
    // const chainTxRepo = conn.getRepository(ChainTx);
    // const chainTxIndexRepo = conn.getRepository(ChainTxIndex);

    for (const del of deletes) {
        const client = await clientRepo.findOne({
            client: del.client,
        });
        if (!client) {
            continue;
        }

        const users = await userRepo.find({
            clientId: client.id
        });
        for (const user of users) {
            await userRepo.remove(user);
        }

        const accounts = await accountRepo.find({
            clientId: client.id
        });
        for (const account of accounts) {
            await accountRepo.remove(account);
        }
        const secrets = await chainSecretRepo.find({
            clientId: client.id
        });
        for (const secret of secrets) {
            await chainSecretRepo.remove(secret);
        }
        const webhooks = await webhookRepo.find({ clientId: client.id });
        for (const webhook of webhooks) {
            await webhookRepo.remove(webhook);
        }

    }
}

main();