import { ApiProperty } from "@nestjs/swagger";
import { IsNumberString, IsString, IsIn } from "class-validator";
import { Account } from '../../models/accounts.model';
import { ResponseBase } from "../../libs/responseHelper";
import { Token, FeePriority } from '../../libs/types';

// request
export class AddAccountDto {
    @ApiProperty({
        description: '设置新建账号的Id值',
        example: '1234567890'
    })
    @IsNumberString()
    accountId: string;
}

export class OnlyCoinParam {
    @ApiProperty({
        description: '区块链平台(Bitcoin, Ethereum)',
        example: Token.BITCOIN,
        enum: [
            Token.BITCOIN,
            Token.ETHEREUM,
            Token.OMNI_USDT,
            Token.ERC20_USDT
        ]
    })
    @IsString()
    @IsIn([
        Token.BITCOIN,
        Token.ETHEREUM,
        Token.OMNI_USDT,
        Token.ERC20_USDT
    ])
    coin: Token;
}

export class IdParam {
    @ApiProperty({
        description: '待操作数据的Id值',
        example: 'dataId'
    })
    @IsNumberString()
    id: string;
}

export class CoinParam extends IdParam {
    @ApiProperty({
        description: '区块链平台(Bitcoin, Ethereum)',
        example: Token.BITCOIN,
        enum: [
            Token.BITCOIN,
            Token.ETHEREUM,
            Token.OMNI_USDT,
            Token.ERC20_USDT
        ]
    })
    @IsString()
    @IsIn([
        Token.BITCOIN,
        Token.ETHEREUM,
        Token.OMNI_USDT,
        Token.ERC20_USDT
    ])
    coin: Token;
}

export class TxidParam extends CoinParam {
    @ApiProperty({
        description: '交易Id',
        example: 'txid'
    })
    @IsString()
    txid: string;
}

export class DespositDto {
    @ApiProperty({
        description: '提币目标地址',
        example: 'address for blockchain'
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: '待提币金额 - 输入各平台最小单位(Satoshi, Gas)',
        example: '100000'
    })
    @IsString()
    amount: string;

    @ApiProperty({
        description: '提币交易费等级',
        example: FeePriority.NORMAL,
        enum: [FeePriority.HIGH, FeePriority.NORMAL, FeePriority.LOWER]
    })
    @IsString()
    @IsIn([FeePriority.HIGH, FeePriority.NORMAL, FeePriority.LOWER])
    feePriority: FeePriority;
}

export class TransferWithFeeDto {
    @ApiProperty({
        description: '提币目标地址',
        example: 'address for blockchain'
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: '待提币金额 - 输入各平台最小单位(Satoshi, Gas)',
        example: '100000'
    })
    @IsString()
    amount: string;

    @ApiProperty({
        description: '指定的交易费',
        example: '100000000'
    })
    @IsNumberString()
    fee: string;
}

export class TransferWithPayedDto {
    @ApiProperty({
        description: '提币目标地址',
        example: 'address for blockchain'
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: '待提币金额 - 输入各平台最小单位(Satoshi, Gas)',
        example: '100000'
    })
    @IsString()
    amount: string;

    @ApiProperty({
        description: '指定的交易费',
        example: '100000000'
    })
    @IsNumberString()
    fee: string;
}

// response
export type TokenInfo = {
    [key: string]: string;
}

export type TokenAccount = {
    token: Token;
    account: Account;
}

export type TokenBalance = {
    token: Token;
    address: string;
    balance: string;
}

export class AddAccountRespDto extends ResponseBase {
    accountId?: string;
    addresses?: TokenInfo;
}

export class ListAccountRespDto extends ResponseBase {
    accountIds?: string[];
}

export class AccountRespDto extends ResponseBase {
    accountId?: string;
    tokens?: TokenInfo[];
}

export class AddressRespDto extends ResponseBase {
    address?: string;
}

export class BalanceRespDto extends ResponseBase {
    balance?: string;
}

export class TransactionsRespDto extends ResponseBase {
    txids?: string[];
}

export class TransactionRespDto extends ResponseBase {
    data?: any;
}

export class DespositRespDto extends ResponseBase {
    serial?: number;
    txId?: string;
    error?: string;
}
