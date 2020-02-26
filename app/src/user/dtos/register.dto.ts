import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class RegisterDto {
    @ApiProperty({
        description: '用户名',
        example: '请输入您的用户名',
    })
    @IsString()
    username: string;

    @ApiProperty({
        description: '密码',
        type: String,
        example: '请输入您的密码'
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class NewUserDto {
    @ApiProperty({
        description: '三方用户Id',
        example: '请输入您的三方UserId'
    })
    @IsNumberString()
    userId: string;
}