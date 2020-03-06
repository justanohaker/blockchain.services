import { createParamDecorator } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class AuthClientDto {
    @ApiProperty({ description: 'clientName' })
    name: string;

    @ApiProperty({ description: 'clientId' })
    id: string;
}

export const AuthClient = createParamDecorator((data, req) => req.user);
