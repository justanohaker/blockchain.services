import { Strategy, IStrategyOptions } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { UserbasicsCurd } from '../../../curds/userbasics-curd';
import { bcryptCompare } from 'src/libs/helpers/bcryptHelper';
import { respFailure, RespErrorCode } from 'src/libs/responseHelper';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly userbasicCurd: UserbasicsCurd
    ) {
        super({
            usernameField: 'username',
            passwordField: 'password'
        } as IStrategyOptions);
    }

    async validate(userName: string, password: string): Promise<any> {
        const findResult = await this.userbasicCurd.getByUserName(userName);
        if (findResult && await bcryptCompare(password, findResult.password)) {
            const { password, id, ...result } = findResult;
            return result;
        }

        throw new HttpException(
            respFailure(RespErrorCode.UNAUTHORIZED, '登陆信息错误'),
            HttpStatus.OK
        );
    }
}