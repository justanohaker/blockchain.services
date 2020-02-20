import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class FindUUIDIdParamDto {
    @ApiProperty()
    @IsString()
    @IsUUID()
    id: string
}