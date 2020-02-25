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
import { bipHexPrivFromxPriv, Platform } from '../libs/helpers/bipHelper';

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
    ) {

        /*
        setTimeout(() => {
            //
            this.btcProvider.onBalanceChanged([{
                address: 'mpGPRT5MZuvKok2Bnttf4poLQHn1AQ3yen',
                balance: '100000000'
            }]);

            this.btcProvider.onBalanceChanged([{
                address: 'mvBJ6ntnd5H47XrbA9tFY4ktmb4HXzaX8i',
                balance: '2000000000'
            }]);

            this.btcProvider.onBalanceChanged([{
                address: 'n3NHmHSoAM6pqvG94SoXAhqXiassUyRxBP',
                balance: '4000000'
            }]);

            this.btcProvider.onNewTransaction([{
                type: 'bitcoin',
                sub: 'btc',
                txId: 'user1 - user2',
                blockHeight: 1,
                blockTime: 1010,
                vIns: [{ address: 'mpGPRT5MZuvKok2Bnttf4poLQHn1AQ3yen', amount: '100' }],
                vOuts: [{ address: 'mvBJ6ntnd5H47XrbA9tFY4ktmb4HXzaX8i', amount: '200' }]
            }]);
            this.btcProvider.onNewTransaction([{
                type: 'bitcoin',
                sub: 'btc',
                txId: 'user1 - outter',
                blockHeight: 2,
                blockTime: 2,
                vIns: [{ address: 'mpGPRT5MZuvKok2Bnttf4poLQHn1AQ3yen', amount: '300' }],
                vOuts: [{ address: 'n3NHmHSoAM6pqvG94SoXAhqXiassUyRxBP', amount: '400' }]
            }]);
            this.btcProvider.onNewTransaction([{
                type: 'bitcoin',
                sub: 'btc',
                txId: 'outter - user2',
                blockHeight: 3,
                blockTime: 10,
                vIns: [{ address: 'n3NHmHSoAM6pqvG94SoXAhqXiassUyRxBP', amount: '500' }],
                vOuts: [{ address: 'mvBJ6ntnd5H47XrbA9tFY4ktmb4HXzaX8i', amount: '600' }]
            }])
        }, 10 * 1000);
        // */

    }

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
                        privateKey: await bipHexPrivFromxPriv(findRepo.priv, Platform.BITCOIN_TESTNET),
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
                        privateKey: await bipHexPrivFromxPriv(findRepo.priv, Platform.ETHEREUM),
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
