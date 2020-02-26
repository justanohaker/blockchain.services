import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsIn } from 'class-validator';
import { CoinType } from '../../libs/common/coin-define';

export class FindUUIDIdParamDto {
    @ApiProperty({
        description: 'Id信息',
        example: '请输入您需要操作的Id信息'
    })
    @IsString()
    @IsUUID()
    id: string
}

export class CoinTypeDto {
    @ApiProperty({
        description: '指定的链平台(BitCoin, Ethereum)',
        example: CoinType.BITCOIN,
        enum: [CoinType.BITCOIN, CoinType.ETHEREUM]
    })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType
}