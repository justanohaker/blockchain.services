import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { IdDto, IdAndCoinTypeDto } from './dtos/query.dto';
import { ApiTags } from '@nestjs/swagger';
import { AddWebHooksDto } from './dtos/webhooks.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
    constructor() { }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return registerDto;
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return loginDto;
    }

    @Get()
    async detail() {
        return '';
    }

    // webhooks
    @Get('webhooks')
    async getAllWebHooks() {

    }

    @Get('webhooks/:id')
    async GetWebHook() {

    }

    @Post("webhooks")
    async addWebHook() {

    }

    @Put('webhooks/:id')
    async updateWebHook() {

    }

    @Delete('webhooks/:id')
    async deleteWebHook() {

    }

    // TODO: Permissions
    // END TODO
}
