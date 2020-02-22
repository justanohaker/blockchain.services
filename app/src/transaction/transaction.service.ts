import { Injectable } from '@nestjs/common';
import { CoinType } from '../libs/common/coin-define';
import { TransferTrRespDto } from './dtos/transfer.dto';

import { BtcProvider } from '../provider/btc-provider/btc.provider';
import { EthProvider } from '../provider/eth-provider/eth.provider';
import { Transaction, AccountKeyPair } from '../blockchain/common/types';
import { TransactionRole } from '../libs/libs.types';
import { IServiceGetter } from '../libs/interfaces/iservice-getter.interface';
import { ITransactionGetter } from '../libs/interfaces/itransaction-getter.interface';

export type GetTransactionResult = {
    success: boolean;
    error?: string;
    data?: Transaction[];
}

@Injectable()
export class TransactionService {
    constructor(
        private readonly btcProvider: BtcProvider,
        private readonly ethProvider: EthProvider
    ) { }

    async getTransactions(
        uid: string,
        coin: CoinType,
        mode: TransactionRole = TransactionRole.ALL
    ): Promise<GetTransactionResult> {
        let provider: ITransactionGetter = null;
        switch (coin) {
            case CoinType.BITCOIN:
                provider = this.btcProvider;
                break;
            case CoinType.ETHEREUM:
                provider = this.ethProvider;
                break;
            default:
                return {
                    success: false,
                    error: `Unsupported CoinType(${coin})`
                };
        }

        const findTrs = await provider.getTransactions(uid, mode);
        return {
            success: true,
            data: findTrs || []
        };
    }

    async transfer(
        uid: string,
        coin: CoinType,
        toAddress: string,
        amount: string
    ): Promise<TransferTrRespDto> {

        let keyPair: AccountKeyPair = null;
        let service: IServiceGetter = null;
        switch (coin) {
            case CoinType.BITCOIN: {
                service = this.btcProvider;
                // TODO: getKeyPair
                // TODO: validate toAddress
                break;
            }
            case CoinType.ETHEREUM: {
                service = this.ethProvider;
                // TODO: getKeyPair
                // TODO: validate toAddress
                break;
            }
            default: {
                return {
                    success: false,
                    error: `Unsupported CoinType(${coin})`
                };
            }
        }

        const transferResult = await service.Service.transfer({
            keyPair,
            address: toAddress,
            amount
        });

        const result = new TransferTrRespDto();
        if (transferResult.success) {
            result.success = true;
            result.txId = transferResult.txId;
        } else {
            result.success = false;
            result.error = typeof (transferResult.error) === 'string'
                ? transferResult.error
                : JSON.stringify(transferResult.error);
        }
        return result;
    }
}
