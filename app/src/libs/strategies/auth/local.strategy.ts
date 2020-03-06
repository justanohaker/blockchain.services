import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, IStrategyOptions } from 'passport-local';
import { bcryptCompare } from '../../helpers/bcryptHelper';
import { respFailure, RespErrorCode } from '../../responseHelper';
import { Client } from '../../../models/clients.model';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(Client) private readonly clientRepo: Repository<Client>
    ) {
        super({
            usernameField: 'client',
            passwordField: 'secret'
        } as IStrategyOptions);
    }

    async validate(client: string, secret: string): Promise<any> {
        const clientRepo = await this.clientRepo.findOne({ client });
        if (clientRepo) {
            if (secret === clientRepo.secret) {
                const { secret, ...result } = clientRepo;
                return result;
            }

            // TODO
        }

        throw new HttpException(
            respFailure(RespErrorCode.UNAUTHORIZED, 'Request Error!'),
            HttpStatus.OK
        );
    }
}