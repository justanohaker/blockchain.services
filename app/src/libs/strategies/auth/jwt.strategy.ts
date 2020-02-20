import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, StrategyOptions, ExtractJwt } from 'passport-jwt';

import { AppConfig } from '../../../config/app.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: AppConfig.Jwt_Strategy_SecretOrKey
        } as StrategyOptions);
    }

    async validate(payload: any) {
        return {
            uid: payload.sub,
            username: payload.username
        };
    }
}