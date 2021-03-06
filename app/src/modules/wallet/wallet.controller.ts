import { Controller, Post, Body, UseGuards, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiProperty, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { respSuccess, respFailure, RespErrorCode } from '../../libs/responseHelper';
import { AuthClient, AuthClientDto, } from '../../libs/decorators/authclient.decorator';
import { WalletService } from './wallet.service';
import {
    AddAccountDto,
    IdParam,
    CoinParam,
    TxidParam,
    DespositDto,
    OnlyCoinParam,
    TransferDto
} from './wallet.dto';
import { ClientIP, ClientIPDto } from 'src/libs/decorators/ip.decorator';

@ApiTags('钱包')
@Controller('wallet')
export class WalletController {
    constructor(
        private readonly walletService: WalletService
    ) { }

    @ApiOperation({
        summary: '获取代付地址列表',
        description: ''
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('payedInfo')
    async getPayedAddress(
        @AuthClient() client: AuthClientDto,
    ) {
        try {
            const result = await this.walletService.getProvidedInfo(client.id);
            return respSuccess({
                addresses: result
            });
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '获取代付地址余额信息',
        description: ''
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('payedBalance/:coin')
    async getPayedBalance(
        @AuthClient() client: AuthClientDto,
        @Param() coinParam: OnlyCoinParam
    ) {
        try {
            const tokenBalance = await this.walletService.getProvidedBalance(
                client.id,
                coinParam.coin
            );
            if (tokenBalance == null) {
                return respFailure(
                    RespErrorCode.BAD_REQUEST,
                    'Parameter Error!'
                );
            }

            return respSuccess(tokenBalance);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '添加账号',
        description: '用户通过指定的AccountId添加账号信息，用于提币，查询(区块链地址，余额，交易信息)'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Post('addaccount')
    @HttpCode(HttpStatus.OK)
    async addAccount(
        @AuthClient() client: AuthClientDto,
        @Body() newAccountDto: AddAccountDto
    ) {
        try {
            const result = await this.walletService.addAccount(
                client.id,
                newAccountDto.accountId
            );
            if (result.success) {
                return respSuccess({
                    accountId: result.accountId!,
                    addresses: result.addresses!
                });
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
        summary: '获取账号Id列表',
        description: '用户用于获取当前App下的所有账号Id列表'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('listaccounts')
    async listAccounts(@AuthClient() client: AuthClientDto) {
        try {
            const result = await this.walletService.listAccounts(client.id);
            if (result.success) {
                return respSuccess({ accounts: result.accountIds! });
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
        summary: '获取账号详情',
        description: '用户用于获取指定账号Id的详细信息(用于只返回账号Id本身)'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('account/:id')
    async getAccountInfo(
        @AuthClient() client: AuthClientDto,
        @Param() idParam: IdParam
    ) {
        try {
            const result = await this.walletService.getAccount(
                client.id,
                idParam.id
            );
            if (result.success) {
                return respSuccess({
                    accountId: result.accountId!,
                    tokens: result.tokens!
                });
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
        summary: '获取链地址',
        description: '用户用于获取指定账号在指定区块链平台下的地址'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('address/:coin/:id')
    async getAddress(
        @AuthClient() client: AuthClientDto,
        @Param() coinAndIdParam: CoinParam
    ) {
        try {
            const result = await this.walletService.getAddress(
                client.id,
                coinAndIdParam.id,
                coinAndIdParam.coin
            );
            if (result.success) {
                return respSuccess({ address: result.address! });
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
        summary: '获取链余额',
        description: '用户用于获取指定账号在指定区块链平台下的余额信息'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('balance/:coin/:id')
    async getBalance(
        @AuthClient() client: AuthClientDto,
        @Param() coinAndIdParam: CoinParam
    ) {
        try {
            const result = await this.walletService.getBalance(
                client.id,
                coinAndIdParam.id,
                coinAndIdParam.coin
            );
            if (result.success) {
                return respSuccess({ balance: result.balance! });
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
        summary: '获取交易Id列表',
        description: '用户用于获取指定账号在指定区块链平台上的交易Id列表'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('transactions/:coin/:id')
    async getTransactions(
        @AuthClient() client: AuthClientDto,
        @Param() coinAndIdParam: CoinParam
    ) {
        try {
            const result = await this.walletService.getTransactions(
                client.id,
                coinAndIdParam.id,
                coinAndIdParam.coin
            );
            if (result.success) {
                return respSuccess({ txids: result.txids! });
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
        summary: '获取交易详情',
        description: '用户用于获取指定账号在指定区块链平台上指定的交易详情'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('transaction/:coin/:id/:txid')
    async getTransaction(
        @AuthClient() client: AuthClientDto,
        @Param() txidParam: TxidParam
    ) {
        try {
            const result = await this.walletService.getTransaction(
                client.id,
                txidParam.id,
                txidParam.coin,
                txidParam.txid
            );
            if (result.success) {
                return respSuccess({ data: result.data! });
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
        summary: '获取指定Token的交易费区间以及推荐值',
        description: ''
    })
    @Get('feeRange/:coin')
    async getFeeRange(
        @Param() param: OnlyCoinParam
    ) {
        try {
            const result = await this.walletService.getFeeRange(param.coin);
            return respSuccess(result);
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({
        summary: '提币',
        description: '用户使用指定的账号在指定的区块链平台上进行提币操作'
    })
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Post('desposit/:coin/:id')
    @HttpCode(HttpStatus.OK)
    async desposit(
        @ClientIP() ip: ClientIPDto,
        @AuthClient() client: AuthClientDto,
        @Param() param: CoinParam,
        @Body() body: DespositDto
    ) {
        try {
            const { id: clientId } = client;
            const { id: accountId, coin: token } = param;
            const result = await this.walletService.deposit(ip, clientId, accountId, token, body);
            if (result.success) {
                return respSuccess({});
            }
            return respFailure(
                result.errorCode,
                result.error
            );
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }

    @ApiOperation({})
    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Post('transfer/:coin/:id')
    @HttpCode(HttpStatus.OK)
    async transferWithCallback(
        @ClientIP() ip: ClientIPDto,
        @AuthClient() client: AuthClientDto,
        @Param() param: CoinParam,
        @Body() body: TransferDto
    ) {
        try {
            const { id: clientId } = client;
            const { id: accountId, coin: token } = param;
            const result = await this.walletService.transfer(ip, clientId, accountId, token, body);
            if (result.success) {
                // success
                return respSuccess({});
            }
            // failure
            return respFailure(
                result.errorCode,
                result.error
            );
        } catch (error) {
            return respFailure(
                RespErrorCode.INTERNAL_SERVER_ERROR,
                `${error}`
            );
        }
    }
}
