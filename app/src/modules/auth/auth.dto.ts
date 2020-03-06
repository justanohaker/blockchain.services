import { ResponseBase } from '../../libs/responseHelper';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

// request
export class RegisterClientDto {
    @ApiProperty({
        description: 'appId- 用户自定义',
        example: 'appId'
    })
    @IsString()
    client: string;

    @ApiProperty({
        description: 'appSecret - 用户自定义，用于获取授权',
        example: 'appSecret'
    })
    @IsString()
    secret: string;
}

export class GetTokenDto {
    @ApiProperty({
        description: 'app名称 - 用户注册时的名称',
        example: 'appId'
    })
    @IsString()
    client: string;

    @ApiProperty({
        description: 'appSecret - 用户注册时用的secret',
        example: 'appSecret'
    })
    @IsString()
    secret: string;
}

// response
export class RegisterClientRespDto extends ResponseBase {
    client_id?: string;
}

export class GetTokenRespDto extends ResponseBase {
    access_token?: string;
}