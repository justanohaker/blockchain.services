import {
    Controller,
    Post,
    Body,
    Get,
    Delete,
    UseGuards,
    Request,
    Param,
    HttpStatus,
    HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { UserBasic } from '../entities/user_basic.entity';
import { LoginUser, LoginUserDto } from '../libs/decorators/login-user.decorator';
import { respSuccess, respFailure, RespErrorCode } from 'src/libs/responseHelper';
import { RegisterDto, NewUserDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AddWebHookDto } from './dtos/webhook.dto';
import { DespositCoinDto } from './dtos/deposit.dto';
import { FindUUIDIdParamDto, CoinTypeDto } from './dtos/common.dto';

@ApiTags('用户')
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }

    @ApiOperation({
        summary: '用户注册',
        description: '注册用户信息，用户使用自定义的用户名和密码注册用户',
    })
    @Post('register')
    @HttpCode(HttpStatus.OK)
    async register(@Body() registerDto: RegisterDto) {
        try {
            const { username, password } = registerDto;
            const registerResult = await this.userService.register(username, password);
            return respSuccess(registerResult);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '用户Id登记',
        description: '用于登记三方服务的UserId，并产生本系统的用户信息'
    })
    @Post('new')
    @HttpCode(HttpStatus.OK)
    async newUserId(@Body() newUserDto: NewUserDto) {
        try {
            const { userId } = newUserDto;
            const newUserResult = await this.userService.newUser(userId);
            return respSuccess(newUserResult);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '(用户|三方用户Id)登陆',
        description: '用户名|三方用户Id/密码登陆本系统，获取调用API的access_token授权信息'
    })
    @UseGuards(AuthGuard('local'))
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() unusedLoginDto: LoginDto, @Request() req) {
        try {
            void (unusedLoginDto);
            const user = req.user as UserBasic;
            const loginResult = await this.userService.login(user.username, user.uid);
            return respSuccess(loginResult);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '获取登陆用户详情',
        description: '获取当前登陆的用户详情，包含用户名,各币种余额信息!'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get()
    async detail(@LoginUser() user: LoginUserDto) {
        try {
            const { username, uid } = user;
            const detailResult = await this.userService.detail(username, uid);
            return respSuccess(detailResult);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    // webhooks
    @ApiOperation({
        summary: '获取登陆用户的WebHook列表',
        description: '用于获取当前登陆用户的WebHook列表信息'
    })
    @ApiBearerAuth()
    @Get('webhooks')
    @UseGuards(AuthGuard('jwt'))
    async getAllWebHooks(@LoginUser() user: LoginUserDto) {
        try {
            const { uid } = user;

            const listResult = await this.userService.listWebHooks(uid);
            const result = [];
            for (const repo of listResult) {
                result.push({ id: repo.id, url: repo.url });
            }
            return respSuccess({ data: result, count: result.length });
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            )
        }
    }

    @ApiOperation({
        summary: "获取登陆用户WebHook信息",
        description: '用于获取当前登陆用户指定的WebHook信息'
    })
    @ApiBearerAuth()
    @Get('webhooks/:id')
    @UseGuards(AuthGuard('jwt'))
    async GetWebHook(
        @LoginUser() user: LoginUserDto,
        @Param() findUuidIdParamDto: FindUUIDIdParamDto
    ) {
        try {
            const { uid } = user;
            const { id } = findUuidIdParamDto;

            const webhooks = await this.userService.listWebHooks(uid, { id });
            if (webhooks.length <= 0) {
                return respFailure(
                    RespErrorCode.NOT_FOUND,
                    "WebhookId not found!"
                );
            }

            return respSuccess({
                id: webhooks[0].id,
                url: webhooks[0].url
            });
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '添加登陆用户WebHook',
        description: '用于添加当前登陆用户的WebHook，用于系统事件与消息推送'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Post("webhooks")
    @HttpCode(HttpStatus.OK)
    async addWebHook(
        @LoginUser() user: LoginUserDto,
        @Body() addWebHook: AddWebHookDto
    ) {
        try {
            const { uid } = user;

            const result = this.userService.addWebHook(uid, addWebHook);
            return respSuccess(result);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    // TODO: update needed???
    // @ApiOperation({summary: ''})
    // @Put('webhooks/:id')
    // async updateWebHook(
    //     @LoginUser() user: LoginUserDto,
    //     @Param('id') id: string
    // ) {

    // }

    @ApiOperation({
        summary: '删除登陆用户的WebHook信息',
        description: '用于删除登陆用户指定Id的WebHook信息'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Delete('webhooks/:id')
    @HttpCode(HttpStatus.OK)
    async deleteWebHook(
        @LoginUser() user: LoginUserDto,
        @Param() findUuidIdParamDto: FindUUIDIdParamDto
    ) {
        try {
            const { uid } = user;
            const { id } = findUuidIdParamDto;

            const result = await this.userService.delWebHook(uid, id);

            return result
                ? respSuccess({ id })
                : respFailure(RespErrorCode.NOT_FOUND, 'WebhookId not found!');
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    // desposit 
    @ApiOperation({
        summary: '获取登陆用户充币地址',
        description: '用于获取当前登陆用户各平台的充币地址(BitCoin, Ethereum)'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('desposit/:coin')
    async getBlockchainAddress(
        @LoginUser() user: LoginUserDto,
        @Param() despositCoinDto: DespositCoinDto
    ) {
        const { uid } = user;
        try {
            const result = await this.userService.getBlockchainAddress(uid, despositCoinDto.coin);
            return respSuccess(result);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '获取余额',
        description: '用于获取当前登陆用户的余额'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('balance/:coin')
    async getBalance(
        @LoginUser() user: LoginUserDto,
        @Param() coinType: CoinTypeDto
    ) {
        const { uid } = user;
        try {
            const balance = await this.userService.getBalance(uid, coinType.coin);
            return respSuccess(balance);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    // TODO: Permissions
    // END TODO
}
