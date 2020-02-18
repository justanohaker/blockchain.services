import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('transaction')
@Controller('transaction')
export class TransactionController {
    constructor() { }

    @Get()
    async getTransactions() {

    }

    @Get('withdraw')
    async getWithdrawTransactions() {

    }

    @Get('desposit')
    async getDespositTransactions() {

    }

    @Post('send')
    async sendTransaction() {

    }
}
