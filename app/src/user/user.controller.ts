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
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UserService } from './user.service';
import { UserBasic } from '../entities/user_basic.entity';
import { LoginUser, LoginUserDto } from '../libs/decorators/login-user.decorator';
import { AddWebHookDto } from './dtos/webhook.dto';
import { respSuccess, respFailure, RespErrorCode } from 'src/libs/responseHelper';
import { DespositCoinDto } from './dtos/deposit.dto';
import { FindUUIDIdParamDto } from './dtos/common.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
    constructor(
        private readonly userService: UserService
    ) { }

    @ApiOperation({ summary: '注册' })
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

    @ApiOperation({ summary: '登陆' })
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

    @ApiOperation({ summary: '获取用户详情' })
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
    @ApiOperation({ summary: '获取用户设置webhooks' })
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

    @ApiOperation({ summary: "获取对应id的webhook信息" })
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

    @ApiOperation({ summary: '设置用户webhook' })
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

    @ApiOperation({ summary: '删除指定id的webhook设置' })
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
    @ApiOperation({ summary: '获取对就的充币地址' })
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

    // TODO: Permissions
    // END TODO
}
