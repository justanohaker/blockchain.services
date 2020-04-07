import { createParamDecorator } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Request } from 'express';

export class ClientIPDto {
    @ApiProperty({ description: 'remote ip address' })
    ip: string;

    @ApiProperty({ description: 'request route path' })
    routePath: string;
};

export const ClientIP = createParamDecorator((data, req: Request) => {
    return {
        ip: req.ip,
        routePath: req.path,
    } as ClientIPDto;
});
