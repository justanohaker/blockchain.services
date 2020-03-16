import { Controller, Post, HttpCode, HttpStatus, Get, Put, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthClient, AuthClientDto } from '../../libs/decorators/authclient.decorator';
import { respFailure, RespErrorCode, respSuccess } from '../../libs/responseHelper';
import { AddWebHookDto, IdParam } from './notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('通知')
@Controller('notification')
export class NotificationController {
    private logger: Logger = new Logger('NotificationController');
    constructor(
        private readonly notificationService: NotificationService
    ) { }

    @ApiOperation({
        summary: '添加回调WebAPI',
        description: '用户添加用于获取系统通知的回调WebAPI'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Post('addwebhook')
    @HttpCode(HttpStatus.OK)
    async addWebHook(
        @AuthClient() client: AuthClientDto,
        @Body() addWebHookDto: AddWebHookDto
    ) {
        try {
            const result = await this.notificationService.add(client.id, addWebHookDto);
            if (result.success) {
                return respSuccess({ id: result.id! });
            }
            return respFailure(
                result.errorCode!,
                result.error!
            );
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '获取WebAPI回调列表Id',
        description: '用户用于获取自己的所有WebAPI通知回调列表Id'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('listwebhooks/')
    async listWebHooks(
        @AuthClient() client: AuthClientDto,
    ) {
        try {
            const result = await this.notificationService.list(client.id);
            if (result.success) {
                return respSuccess({ ids: result.ids! });
            }
            return respFailure(
                result.errorCode!,
                result.error!
            );
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '获取WebAPI回调详情',
        description: '用户用于获取指定WEBAPI Id的详细信息'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('webhook/:id')
    async getWebHook(
        @AuthClient() client: AuthClientDto,
        @Param() idParam: IdParam
    ) {
        try {
            const result = await this.notificationService.get(client.id, idParam.id);
            if (result.success) {
                return respSuccess({
                    id: result.id!,
                    postUrl: result.postUrl!
                });
            }

            return respFailure(
                result.errorCode!,
                result.error
            );
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '删除WebAPI回调',
        description: '用户删除指定的WebAPI Id的回调信息'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Put('delwebhook/:id')
    @HttpCode(HttpStatus.OK)
    async delWebHook(
        @AuthClient() client: AuthClientDto,
        @Param() idParam: IdParam,
    ) {
        try {
            const result = await this.notificationService.del(client.id, idParam.id);
            if (result.success) {
                return respSuccess({});
            }
            return respFailure(
                result.errorCode!,
                result.error!
            );
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    // @Post('webhook')
    // async webhookPostTest(@Body() body: any) {
    //     // console.log('[NotificationController] WebHook:', body);
    //     this.logger.log(`WebHook: ${JSON.stringify(body, null, 2)}`);
    // }
}
