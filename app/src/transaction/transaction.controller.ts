import { Controller, Get, Post, UseGuards, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LoginUser, LoginUserDto } from 'src/libs/decorators/login-user.decorator';
import { CoinDto } from './dtos/coin.dto';
import { TransactionService } from './transaction.service';
import { respFailure, RespErrorCode, respSuccess } from 'src/libs/responseHelper';
import { TransferDto, DespositDto } from './dtos/transfer.dto';
import { TransactionRole } from '../libs/libs.types';

@ApiTags('交易')
@Controller('transaction')
export class TransactionController {
    constructor(
        private readonly trsService: TransactionService
    ) { }

    @ApiOperation({
        summary: '查询交易记录',
        description: '用于查询当前登陆账号的历史交易记录'
    })
    @ApiBearerAuth()
    @Get(':coin')
    @UseGuards(AuthGuard('jwt'))
    async getTransactions(
        @LoginUser() user: LoginUserDto,
        @Param() coinDto: CoinDto
    ) {
        try {
            const { uid } = user;
            const { coin } = coinDto;
            const result = await this.trsService.getTransactions(
                uid,
                coin,
                TransactionRole.ALL
            );
            if (result.success) {
                return respSuccess(result.data);
            } else {
                return respFailure(
                    RespErrorCode.BAD_REQUEST,
                    result.error
                );
            }
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '查询提币',
        description: '查询当前登陆用户的历史提币记录'
    })
    @ApiBearerAuth()
    @Get(':coin/withdraw')
    @UseGuards(AuthGuard('jwt'))
    async getWithdrawTransactions(
        @LoginUser() user: LoginUserDto,
        @Param() coinDto: CoinDto
    ) {
        try {
            const { uid } = user;
            const { coin } = coinDto;
            const result = await this.trsService.getTransactions(
                uid,
                coin,
                TransactionRole.SENDER
            );
            if (result.success) {
                return respSuccess(result.data);
            } else {
                return respFailure(
                    RespErrorCode.BAD_REQUEST,
                    result.error
                );
            }
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '查询充币',
        description: '查询当前登陆用户的充币历史记录'
    })
    @ApiBearerAuth()
    @Get(':coin/desposit')
    @UseGuards(AuthGuard('jwt'))
    async getDespositTransactions(
        @LoginUser() user: LoginUserDto,
        @Param() coinDto: CoinDto
    ) {
        try {
            const { uid } = user;
            const { coin } = coinDto;

            const result = await this.trsService.getTransactions(
                uid,
                coin,
                TransactionRole.RECIPIENT
            );
            if (result.success) {
                return respSuccess(result.data);
            } else {
                return respFailure(
                    RespErrorCode.BAD_REQUEST,
                    result.error
                );
            }
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '转账',
        description: '用于处理当前登陆用户的转账请求'
    })
    @ApiBearerAuth()
    @Post('sendTo')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('jwt'))
    async sendTransaction(
        @LoginUser() user: LoginUserDto,
        @Body() transferDto: TransferDto
    ) {
        return respFailure(RespErrorCode.NOT_IMPLEMENTED, '功能未实现!');
        try {
            const { uid } = user;
            const { coin, address, amount } = transferDto;

            const result = await this.trsService.transfer(
                uid,
                coin,
                address,
                amount
            );
            if (result.success) {
                return respSuccess({
                    txId: result.txId
                });
            } else {
                return respFailure(
                    RespErrorCode.BAD_REQUEST,
                    result.error
                );
            }
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '提币',
        description: '用于当前登陆用户提币到其它地址'
    })
    @ApiBearerAuth()
    @Post('despositTo')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('jwt'))
    async desposit(
        @LoginUser() user: LoginUserDto,
        @Body() despositDto: DespositDto
    ) {
        try {
            const { uid } = user;
            const { coin, address, amount } = despositDto;
            const result = await this.trsService.transfer(
                uid,
                coin,
                address,
                amount
            );
            if (result.success) {
                return respSuccess({
                    txId: result.txId
                });
            } else {
                return respFailure(
                    RespErrorCode.BAD_REQUEST,
                    result.error
                );
            }
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    // @Post('notification')
    // async onWebHookNotification(@Body() body: any) {
    //     console.log(`transaction/notification body:`, body);
    // }

    // @Post('notification1')
    // async onWebHookNotification1(@Body() body: any) {
    //     console.log(`transaction/notification1 body:`, body);
    // }
}
