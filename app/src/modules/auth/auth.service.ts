import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Client } from '../../models/clients.model';
import { ClientPayed } from '../../models/client-payed.model';
import { Repository } from 'typeorm';
import { RegisterClientRespDto, GetTokenRespDto } from './auth.dto';
import { RespErrorCode } from '../../libs/responseHelper';
import { bipNewMnemonic, bipPrivpubFromMnemonic, bipGetAddressFromXPub } from '../../libs/helpers/bipHelper';
import { Token } from 'src/libs/types';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
        @InjectRepository(ClientPayed) private readonly payedRepo: Repository<ClientPayed>,
    ) { }

    async register(
        client: string,
        secret: string
    ): Promise<RegisterClientRespDto> {
        const result: RegisterClientRespDto = { success: true };
        const clientRepo = await this.clientRepo.findOne({ client });
        if (clientRepo) {
            result.success = false;
            result.error = 'client exists!';
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        const newSecret = await bipNewMnemonic();
        const repo = new Client();
        repo.client = client;
        repo.secret = secret;
        repo.chainSecret = newSecret;
        repo.enabled = true;
        const saveResult = await this.clientRepo.save(repo);
        await this.initPayed(saveResult.id, newSecret);
        result.success = true;
        result.client_id = saveResult.id;
        return result;
    }

    async getToken(
        clientId: string
    ): Promise<GetTokenRespDto> {
        const result: GetTokenRespDto = { success: true };
        const clientRepo = await this.clientRepo.findOne(clientId);
        if (!clientRepo) {
            result.success = false;
            result.error = 'client not exists!';
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        const payload = { clientName: clientRepo.client, sub: clientId };
        result.access_token = this.jwtService.sign(payload);
        return result;
    }

    private async initPayed(clientId: string, chainSecret: string) {
        //  BTC
        {
            const privpub = await bipPrivpubFromMnemonic(chainSecret, Token.BITCOIN);
            const address = await bipGetAddressFromXPub(privpub.xpub, Token.BITCOIN);
            const payedIns = new ClientPayed();
            payedIns.clientId = clientId;
            payedIns.privkey = privpub.xpriv;
            payedIns.pubkey = privpub.xpub;
            payedIns.address = address;
            payedIns.balance = '0';
            payedIns.token = Token.BITCOIN;
            await this.payedRepo.save(payedIns);
        }
        // Omni-USDT
        {
            const privpub = await bipPrivpubFromMnemonic(chainSecret, Token.OMNI_USDT);
            const address = await bipGetAddressFromXPub(privpub.xpub, Token.OMNI_USDT);
            const payedIns = new ClientPayed();
            payedIns.clientId = clientId;
            payedIns.privkey = privpub.xpriv;
            payedIns.pubkey = privpub.xpub;
            payedIns.address = address;
            payedIns.balance = '0';
            payedIns.token = Token.OMNI_USDT;
            await this.payedRepo.save(payedIns);
        }
        // ETH
        {
            const privpub = await bipPrivpubFromMnemonic(chainSecret, Token.ETHEREUM);
            const address = await bipGetAddressFromXPub(privpub.xpub, Token.ETHEREUM);
            const payedIns = new ClientPayed();
            payedIns.clientId = clientId;
            payedIns.privkey = privpub.xpriv;
            payedIns.pubkey = privpub.xpub;
            payedIns.address = address;
            payedIns.balance = '0';
            payedIns.token = Token.ETHEREUM;
            await this.payedRepo.save(payedIns);
        }
        // ERC20-USDT
        {
            const privpub = await bipPrivpubFromMnemonic(chainSecret, Token.ERC20_USDT);
            const address = await bipGetAddressFromXPub(privpub.xpub, Token.ERC20_USDT);
            const payedIns = new ClientPayed();
            payedIns.clientId = clientId;
            payedIns.privkey = privpub.xpriv;
            payedIns.pubkey = privpub.xpub;
            payedIns.address = address;
            payedIns.balance = '0';
            payedIns.token = Token.ERC20_USDT;
            await this.payedRepo.save(payedIns);
        }
    }
}
