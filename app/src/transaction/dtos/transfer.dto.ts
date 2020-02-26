import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsNumberString } from 'class-validator';
import { CoinType } from 'src/libs/common/coin-define';

export class TransferDto {
    @ApiProperty({
        description: '指定的链平台(BitCoin, Ethereum)',
        example: CoinType.BITCOIN,
        enum: [CoinType.BITCOIN, CoinType.ETHEREUM]
    })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType;

    @ApiProperty({
        description: '转账目标地址',
        example: '请输入你的到账地址'
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: '转账金额',
        example: '请输入您的转账金额(1000), 各平台的最小单位'
    })
    @IsNumberString()
    amount: string;
}

export class DespositDto {
    @ApiProperty({
        description: '指定的链平台(BitCoin, Ethereum)',
        example: CoinType.BITCOIN,
        enum: [CoinType.BITCOIN, CoinType.ETHEREUM]
    })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType;

    @ApiProperty({
        description: '转账目标地址',
        example: '请输入你的到账地址'
    })
    @IsString()
    address: string;

    @ApiProperty({
        description: '转账金额',
        example: '请输入您的转账金额(1000), 各平台的最小单位'
    })
    @IsNumberString()
    amount: string;
}

export class TransferTrRespDto {
    @ApiProperty({
        description: '请求是否成功',
        example: 'true | false'
    })
    success: boolean;

    @ApiProperty({
        description: '交易Id',
    })
    txId?: string;

    @ApiProperty({
        description: '请求失败错误信息'
    })
    error?: string;
}