import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CoinType } from '../libs/common/coin-define';
import { RespErrorCode } from '../libs/responseHelper'
import { TransferTrRespDto } from './dtos/transfer.dto';

export const enum TransactionMode {
    ALL = 0,
    WITHDRAW = 1,
    DESPOSIT = 2,
}

@Injectable()
export class TransactionService {
    constructor() { }

    async getTransactions(
        uid: string,
        coin: CoinType,
        mode: TransactionMode = TransactionMode.ALL
    ) {
        return {
            error: 'Not Implemented!'
        };
    }

    async transfer(
        uid: string,
        coin: CoinType,
        toAddress: string,
        amount: string
    ): Promise<TransferTrRespDto> {

        return {
            success: false,
            error: 'Not Implemented!',
        };
    }

    // private 
    // bitcoin
    // ethereum
}
