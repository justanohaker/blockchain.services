import { Controller, Post, HttpCode, HttpStatus, UseGuards, Body, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { respFailure, RespErrorCode, respSuccess } from '../../libs/responseHelper';
import { AuthClient, AuthClientDto } from '../../libs/decorators/authclient.decorator';
import { RegisterClientDto, GetTokenDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('授权')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    @ApiOperation({
        summary: '注册App',
        description: '用户注册App，以使用系统功能'
    })
    @Post('register')
    @HttpCode(HttpStatus.OK)
    async registerClient(@Body() registerDto: RegisterClientDto) {
        try {
            const result = await this.authService.register(
                registerDto.client,
                registerDto.secret
            );
            if (result.success) {
                return respSuccess({ client_id: result.client_id! });
            }
            return respFailure(result.errorCode!, result.error!);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '获取授权',
        description: '用户使用注册App时的client和secret获取系统授权'
    })
    @UseGuards(AuthGuard('local'))
    @Post('getToken')
    @HttpCode(HttpStatus.OK)
    async getToken(@Body() getTokenDto: GetTokenDto, @AuthClient() client: AuthClientDto) {
        try {
            const result = await this.authService.getToken(client.id);
            if (result.success) {
                return respSuccess({
                    access_token: result.access_token!
                });
            }
            return respFailure(result.errorCode!, result.error!);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }
}
