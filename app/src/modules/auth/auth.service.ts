import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Client } from '../../models/clients.model';
import { Repository } from 'typeorm';
import { RegisterClientRespDto, GetTokenRespDto } from './auth.dto';
import { RespErrorCode } from '../../libs/responseHelper';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>
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

        const repo = new Client();
        repo.client = client;
        repo.secret = secret;
        repo.enabled = true;
        const saveResult = await this.clientRepo.save(repo);
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
}
