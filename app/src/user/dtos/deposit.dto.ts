import { CoinType } from '../../libs/common/coin-define';
import { ApiProperty } from '@nestjs/swagger';

export class DespositCoinDto {
    @ApiProperty({ enum: [CoinType.BITCOIN, CoinType.ETHEREUM] })
    coin: CoinType
}