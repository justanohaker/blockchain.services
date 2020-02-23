import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class RegisterDto {
    @ApiProperty()
    @IsString()
    username: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class NewUserDto {
    @ApiProperty()
    @IsNumberString()
    userId: string;
}