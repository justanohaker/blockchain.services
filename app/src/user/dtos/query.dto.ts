import { ApiProperty } from '@nestjs/swagger';

export class IdDto {
    @ApiProperty()
    id: string;
}

export class IdAndCoinTypeDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    cointype: number;
}