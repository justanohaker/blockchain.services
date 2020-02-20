import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, IsNumberString, IsBoolean } from 'class-validator';
import { CoinType } from 'src/libs/common/coin-define';

export class TransferDto {
    @ApiProperty({ enum: [CoinType.BITCOIN, CoinType.ETHEREUM] })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType;

    @ApiProperty()
    @IsString()
    address: string;

    @ApiProperty()
    @IsNumberString()
    amount: string;
}

export class DespositDto {
    @ApiProperty({ enum: [CoinType.BITCOIN, CoinType.ETHEREUM] })
    @IsString()
    @IsIn([CoinType.BITCOIN, CoinType.ETHEREUM])
    coin: CoinType;

    @ApiProperty()
    @IsString()
    address: string;

    @ApiProperty()
    @IsNumberString()
    amount: string;
}

export class TransferTrRespDto {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    txId?: string;

    @ApiProperty()
    error?: string;
}