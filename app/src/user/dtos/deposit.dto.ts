import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';
import { CoinType } from '../../libs/common/coin-define';

export class DespositCoinDto {
    @ApiProperty({
        description: '指定的链平台(BitCoin, Ethereum)',
        example: CoinType.BITCOIN,
        enum: [CoinType.BITCOIN, CoinType.ETHEREUM]
    })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType
}