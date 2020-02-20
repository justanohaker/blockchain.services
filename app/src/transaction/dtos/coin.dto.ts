import { CoinType } from '../../libs/common/coin-define';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class CoinDto {
    @ApiProperty({ enum: [CoinType.BITCOIN, CoinType.ETHEREUM] })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType
}