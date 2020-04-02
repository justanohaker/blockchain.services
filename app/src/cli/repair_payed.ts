import 'reflect-metadata';
import { createConnection, Repository } from 'typeorm';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { bipNewMnemonic, bipPrivpubFromMnemonic, bipGetAddressFromXPub } from '../libs/helpers/bipHelper';
import { Token } from '../libs/types';

// import { Client } from '../models/clients.model';
import { ClientPayed } from '../models/client-payed.model';
import { User } from '../models/users.model';
import { Serial } from '../models/serial.model';
import { Webhook } from '../models/user.webhook.model';
import { ChainSecret } from '../models/chain.secret.model';
import { Account } from '../models/accounts.model';
import { ChainTx, ChainTxIndex } from '../models/transactions.model';
import { RequestRecord } from '../models/request_records.model';


@Entity('clients')
export class Client {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    client: string;

    @Column()
    secret: string;

    @Column({ nullable: true })
    chainSecret: string;

    @Column()
    enabled: boolean;
}


async function main() {
    const newConnection = await createConnection({
        type: 'sqlite',
        name: 'new_datas',
        database: 'app.sqlite',
        synchronize: true,
        entities: [
            Account,
            Client,
            ClientPayed,
            ChainSecret,
            RequestRecord,
            Serial,
            ChainTx, ChainTxIndex,
            Webhook,
            User,
        ]
    });

    const clientRepo = newConnection.getRepository(Client);
    const clientPayedRepo = newConnection.getRepository(ClientPayed);

    const clients = await clientRepo.find();
    for (const client of clients) {
        // if (client.chainSecret != null && client.chainSecret != '') {
        //     continue;
        // }

        // Repair
        console.log(`Repair ${client.client} ...`);

        const newSecret = await repairSecret(clientRepo, client);
        await repairPayedInfo(clientPayedRepo, client, newSecret, Token.BITCOIN);
        await repairPayedInfo(clientPayedRepo, client, newSecret, Token.OMNI_USDT);
        await repairPayedInfo(clientPayedRepo, client, newSecret, Token.ETHEREUM);
        await repairPayedInfo(clientPayedRepo, client, newSecret, Token.ERC20_USDT);
        console.log(`Repair ${client.client} Finish ...`);
    }
}

async function repairSecret(clientRepo: Repository<Client>, client: Client): Promise<string> {
    console.log(`Repair ${client.client} BIP39...`);
    if (client.chainSecret != null && client.chainSecret != '') {
        console.log(`Repair ${client.client} BIP39 Exists!`);
        return client.chainSecret;
    }
    const newSecret = await bipNewMnemonic();
    client.chainSecret = newSecret;
    await clientRepo.save(client);
    return newSecret;
}

async function repairPayedInfo(
    clientPayedRepo: Repository<ClientPayed>,
    client: Client,
    chainSecret: string,
    token: Token
) {
    console.log(`Repair ${client.client} ${token} PayForAnother...`);
    const { id } = client;

    const exists = await clientPayedRepo.findOne({
        clientId: client.id,
        token
    });
    if (exists) {
        console.log(`Repair ${client.client} ${token} PayForAnother Exists!`);
    }

    const privpub = await bipPrivpubFromMnemonic(chainSecret, token);
    const address = await bipGetAddressFromXPub(privpub.xpub, token);

    const clientPayedIns = new ClientPayed();
    clientPayedIns.clientId = id;
    clientPayedIns.privkey = privpub.xpriv;
    clientPayedIns.pubkey = privpub.xpub;
    clientPayedIns.address = address;
    clientPayedIns.balance = '0';
    clientPayedIns.token = token;
    await clientPayedRepo.save(clientPayedIns);
}

main()
    .catch(error => {
        console.log('Repair error:', error);
    });