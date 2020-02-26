import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
    @ApiProperty({
        description: '用户名|三方用户Id',
        example: '请输入您的用户名或三方用户Id'
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        description: '密码',
        example: '请输入你的密码或三方用户Id登记时返回的密码'
    })
    @IsString()
    @IsNotEmpty()
    password: string;
}