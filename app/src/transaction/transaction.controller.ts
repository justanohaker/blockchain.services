import { Controller, Get, Post, UseGuards, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LoginUser, LoginUserDto } from 'src/libs/decorators/login-user.decorator';
import { CoinDto } from './dtos/coin.dto';
import { TransactionService, TransactionMode } from './transaction.service';
import { respFailure, RespErrorCode, respSuccess } from 'src/libs/responseHelper';
import { TransferDto, DespositDto } from './dtos/transfer.dto';
import { CoinType } from 'src/libs/common/coin-define';

@ApiTags('transaction')
@Controller('transaction')
export class TransactionController {
    constructor(
        private readonly trsService: TransactionService
    ) { }

    @ApiOperation({ summary: '查询交易记录' })
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
            const result = await this.trsService.getTransactions(uid, coin);
            return respSuccess(result);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({ summary: '查询提币' })
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
                TransactionMode.WITHDRAW
            );
            return respSuccess(result);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({ summary: '查询充币' })
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
                TransactionMode.DESPOSIT
            );
            return respSuccess(result);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({ summary: '转账' })
    @ApiBearerAuth()
    @Post('sendTo')
    @UseGuards(AuthGuard('jwt'))
    async sendTransaction(
        @LoginUser() user: LoginUserDto,
        @Body() transferDto: TransferDto
    ) {
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

    @ApiOperation({ summary: '提币' })
    @ApiBearerAuth()
    @Post('despositTo')
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
}
