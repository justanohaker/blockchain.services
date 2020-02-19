import { createParamDecorator } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDto {
    @ApiProperty({ description: 'username' })
    username: string;

    @ApiProperty({ description: 'userId' })
    uid: string;
}

export const LoginUser = createParamDecorator((data, req) => req.user);
