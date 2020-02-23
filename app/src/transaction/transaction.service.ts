import { Injectable } from '@nestjs/common';
import { CoinType } from '../libs/common/coin-define';
import { TransferTrRespDto } from './dtos/transfer.dto';

import { BtcaccountsCurd } from '../curds/btcaccounts-curd';
import { EthaccountsCurd } from '../curds/ethaccounts-curd';
import { BtcProvider } from '../provider/btc-provider/btc.provider';
import { EthProvider } from '../provider/eth-provider/eth.provider';
import { Transaction, AccountKeyPair } from '../blockchain/common/types';
import { TransactionRole } from '../libs/libs.types';
import { IServiceGetter } from '../libs/interfaces/iservice-getter.interface';
import { ITransactionGetter } from '../libs/interfaces/itransaction-getter.interface';
import { addressIsBitcoin, addressIsEthereum } from '../libs/helpers/addressHelper';
import { bipHexPrivFromxPriv } from '../libs/helpers/bipHelper';

export type GetTransactionResult = {
    success: boolean;
    error?: string;
    data?: Transaction[];
}

@Injectable()
export class TransactionService {
    constructor(
        private readonly btcProvider: BtcProvider,
        private readonly ethProvider: EthProvider,
        private readonly btcAccountCurd: BtcaccountsCurd,
        private readonly ethAccountCurd: EthaccountsCurd
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

        try {
            const findTrs = await provider.getTransactions(uid, mode);
            return {
                success: true,
                data: findTrs || []
            };
        } catch (error) {
            return {
                success: false,
                error: `${error}`
            };
        }
    }

    async transfer(
        uid: string,
        coin: CoinType,
        toAddress: string,
        amount: string
    ): Promise<TransferTrRespDto> {

        let keyPair: AccountKeyPair = null;
        let service: IServiceGetter = null;
        try {
            switch (coin) {
                case CoinType.BITCOIN: {
                    service = this.btcProvider;
                    const checkAddress = await addressIsBitcoin(toAddress);
                    if (!checkAddress) {
                        throw new Error(`Invalid Bitcoin address(${toAddress})`);
                    }
                    const findRepo = await this.btcAccountCurd.findByUid(uid);
                    if (!findRepo) {
                        throw new Error(`User(${uid}) not exists!`);
                    }
                    keyPair = {
                        privateKey: await bipHexPrivFromxPriv(findRepo.priv),
                        address: findRepo.address
                    };
                    console.log('bitcon:', JSON.stringify(keyPair));

                    break;
                }
                case CoinType.ETHEREUM: {
                    service = this.ethProvider;
                    const checkAddress = await addressIsEthereum(toAddress);
                    if (!checkAddress) {
                        throw new Error(`Invalid Ethereum address(${toAddress})`);
                    }
                    const findRepo = await this.ethAccountCurd.findByUid(uid);
                    if (!findRepo) {
                        throw new Error(`User(${uid}) not exists!`);
                    }
                    keyPair = {
                        privateKey: await bipHexPrivFromxPriv(findRepo.priv),
                        address: findRepo.address
                    };
                    console.log('ethereum:', JSON.stringify(keyPair));
                    break;
                }
                default: {
                    throw new Error(`Unsupported CoinType(${coin})`);
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
        } catch (error) {
            return {
                success: false,
                error: `${error}`
            };
        }
    }
}
