import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { IService } from '../../common/service.interface';
import {
    TransferDef, TransferResp, BalanceResp, OmniUsdtTransactin, TransferWithFeeDef,
    TransferWithPayedDef, FeeRangeDef, PrepareTransferDef, TransactionQueryResultDef
} from '../../../blockchain/common/types';
import { Psbt, networks, ECPair } from 'bitcoinjs-lib';
import { FeePriority } from 'src/libs/types';
import Bignumber from 'bignumber.js';
import coinSelect = require('coinselect');
import Axios from 'axios';

import { AppConfig } from '../../../config/app.config';
import Client = require('bitcoin-core');
const client = new Client({
    host: AppConfig.mainnet ? '120.53.0.176' : '111.231.105.174',
    port: 8332,
    network: AppConfig.mainnet ? 'mainnet' : 'regtest',
    username: 'entanmo_bitcoin',
    password: 'Entanmo2018',
    version: '',
    agentOptions: {},
    wallet: 'sy'
});
const PROPERTY = AppConfig.mainnet ? 31 : 2; //propertyid  1:OMNI,2:TOMNI,31:USDT
const PRECISION = 1e-8;

@Injectable()
export class OmniUsdtService extends IService implements OnModuleInit, OnModuleDestroy {
    private interval = null;
    private lastHeight = -1;
    private logger: Logger = new Logger('OmniUsdtServie', true);

    constructor() {
        super();
    }

    async onModuleInit(): Promise<void> {
        await this.monitor();
        this.interval = setInterval(() => {
            this.monitor();
        }, 60000);
    }

    async onModuleDestroy(): Promise<void> {
        if (this.interval !== null) {
            clearInterval(this.interval)
        }
    }

    private async monitor() {
        try {
            this.logger.log('start monitor');
            if (!this.addresses || this.addresses.length == 0) {// 没有需要监听的地址
                return
            }
            // console.log('addresses =0=>', this.addresses)

            let chainInfo = await client.command('omni_getinfo');
            // console.log('chainInfo =1=>', chainInfo)
            let lastBlockHeght = chainInfo.block;
            this.logger.log(`lastestBlockHeight:${lastBlockHeght}, cursorBlockHeight:${this.lastHeight}`);
            // console.log('lastBlockHash =1=>', lastBlockHash)
            if (this.lastHeight >= lastBlockHeght) {// 没有更新区块 
                return
            }

            if (this.lastHeight === -1) {//重新启动时从最新区块开始更新
                this.lastHeight = lastBlockHeght - 1;
            }

            let offset = lastBlockHeght - this.lastHeight;//一分钟可能产生多个区块
            for (let i = 0; i < offset; i++) {
                this.lastHeight += 1;
                await this.provider.onNewBlock({ height: this.lastHeight });

                let transactions = await client.command('omni_listblocktransactions', this.lastHeight);
                // console.log('omni_listblocktransactions =2=>', transactions)

                let txs = [];
                for (let txid of transactions) {
                    let tx = await client.command('omni_gettransaction', txid);
                    // console.log('txId =3=>', tx, JSON.stringify(tx))

                    if (this.addresses.includes(tx.sendingaddress) || this.addresses.includes(tx.referenceaddress)) {
                        let omniTx: OmniUsdtTransactin = {
                            type: 'bitcoin',
                            sub: 'omni_usdt',
                            txId: txid,
                            blockHeight: this.lastHeight,
                            blockTime: tx.blocktime,
                            propertyId: tx.propertyid,
                            version: tx.version,
                            typeInt: tx.type_int,
                            sending: tx.sendingaddress,
                            reference: tx.referenceaddress,
                            amount: new Bignumber(tx.amount).div(PRECISION).toString(),
                            fee: new Bignumber(tx.fee).div(PRECISION).toString()
                        };
                        txs.push(omniTx);
                    }
                }
                if (txs.length > 0) {
                    await this.provider?.onNewTransaction(txs);
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

    async onNewAccounts(addresses: string[]): Promise<void> {
        await super.onNewAccounts(addresses);

        try {
            for (let address of addresses) {
                await client.command('importaddress', address, '', false)
            }
        } catch (error) {
            // do nothing
        }
    }

    async getBalance(addresses: string[]): Promise<BalanceResp> {
        const result: BalanceResp = { success: true, result: [] };
        for (const address of addresses) {
            let info = { address: address, balance: '0' }
            try {
                let balance = await client.command('omni_getbalance', address, PROPERTY);
                info.balance = new Bignumber(balance.balance).div(PRECISION).toString();
            } catch (error) {
                console.log(error);
            }
            result.result.push(info);
        }
        console.log('getbalance ==>', result)
        return result;
    }

    async getTransactionInfo(txId: string): Promise<TransactionQueryResultDef> {
        const result: TransactionQueryResultDef = { blocked: false, blockHeight: -1 };
        try {
            let tx = await client.command('getrawtransaction', txId, true);
            let block = await client.command('getblock', tx.blockhash);
            // console.log('getblock =2=>', block.height)
            result.blocked = true;
            result.blockHeight = block.height;
        } catch (error) {
            // 自己捕获的异常就不需要再抛出了，直接处理成blocked=false即可
            result.blocked = false;
        }
        return result;
    }

    // async getTransactionInfo(txId: string): Promise<TransactionQueryResultDef> {
    //     const result: TransactionQueryResultDef = { blocked: false, blockHeight: -1 };
    //     try {
    //         let tx = await client.command('omni_gettransaction', txId);
    //         // 只要能获取到交易信息，说明交易已经被打包
    //         // 在获取交易信息的时候，不需要处理确认数
    //         result.blocked = true;
    //         result.blockHeight = tx.block;
    //         // if (tx.confirmations > 0) {
    //         // result.blocked = true;
    //         // result.blockHeight = tx.block;
    //         // }
    //     } catch (error) {
    //         throw error;
    //     }
    //     return result;
    // }

    async getFeeRange(): Promise<FeeRangeDef> {
        return { min: '200000000', max: '500000000', default: '200000000' };
    }

    async transfer(data: TransferDef): Promise<TransferResp> {
        try {
            let unspents = await client.command('listunspent', 0, 99999999, [data.keyPair.address]);
            console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            let utxos = [];
            let utxos2 = [];
            for (let unspent of unspents) {
                let txHex = await client.command('getrawtransaction', unspent.txid);
                utxos.push({
                    txid: unspent.txid,
                    vout: unspent.vout,
                    value: new Bignumber(unspent.amount).div(PRECISION).toNumber(),
                    nonWitnessUtxo: Buffer.from(txHex, 'hex')
                });

                utxos2.push({
                    txid: unspent.txid,
                    vout: unspent.vout,
                    value: unspent.amount,
                    scriptPubKey: unspent.scriptPubKey,
                });
            }
            let targets = [{
                address: data.address,
                value: new Bignumber(data.amount).toNumber()
            }];

            let feeRate = await this.getFeeRate(data.feePriority);
            let { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate);
            console.log("coinSelect result ==>", inputs, outputs, fee)
            if (!inputs || !outputs) {
                throw new Error('tansfer data error');
            }

            let amount = new Bignumber(data.amount).times(PRECISION).toFixed(8);
            // console.log('amount ==>', amount);

            let payload = await client.command('omni_createpayload_simplesend', PROPERTY, amount);
            // console.log('omni_createpayload_simplesend ==>', payload);

            let txhash = await client.command('createrawtransaction', utxos2, {});
            // console.log('createrawtransaction ==>', txhash)

            let rawtx = await client.command('omni_createrawtx_opreturn', txhash, payload);
            // console.log('omni_createrawtx_opreturn ==>', rawtx);

            let rawtx2 = await client.command('omni_createrawtx_reference', rawtx, data.address);
            // console.log('omni_createrawtx_reference ==>', rawtx2);

            let fee0 = new Bignumber(fee).times(PRECISION).toNumber();
            let rawtx3 = await client.command('omni_createrawtx_change', rawtx2, utxos2, data.keyPair.address, fee0);
            // console.log('omni_createrawtx_change ==>', rawtx3);

            let txsign = await client.command('signrawtransactionwithkey', rawtx3, [data.keyPair.wif]);
            // console.log('signrawtransactionwithkey ==>', txsign)

            // let tx = await client.command('decoderawtransaction', rawtx3, false)
            // console.log('decoderawtransaction ==>', JSON.stringify(tx))

            let txid = await client.command('sendrawtransaction', txsign.hex);
            console.log('sendrawtransaction ==>', txid)

            return { success: true, txId: txid };
        } catch (error) {
            console.log(error)
            return { success: false, error };
        }
    }

    private async getFeeRate(fee: FeePriority) {
        let feeRate = 40;
        let feedata = await Axios.get('https://bitcoinfees.earn.com/api/v1/fees/recommended');
        if (feedata.status == 200) {
            switch (fee) {
                case FeePriority.HIGH:
                    feeRate = feedata.data.fastestFee;
                    break;
                case FeePriority.NORMAL:
                    feeRate = feedata.data.halfHourFee;
                    break;
                case FeePriority.LOWER:
                    feeRate = feedata.data.hourFee;
                    break;
                default:
                    break;
            }
        }
        console.log('feeRate ==>', feeRate)
        return feeRate;
    }

    // 预付阶段，代付地址向发送地址转固定金额（最小转账金额546）的btc,给发送地址做手续费用
    async prepareTransfer(data: PrepareTransferDef): Promise<TransferResp> {
        try {
            let unspents = await client.command('listunspent', 0, 99999999, [data.payedKeyPair.address]);
            console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            let feeRate = await this.getFeeRate(FeePriority.HIGH);
            let utxos = [];
            for (let unspent of unspents) {
                let txhex = await client.command('getrawtransaction', unspent.txid);
                utxos.push({
                    txid: unspent.txid,
                    vout: unspent.vout,
                    value: new Bignumber(unspent.amount).div(PRECISION).toNumber(),
                    nonWitnessUtxo: Buffer.from(txhex, 'hex')
                });
            }
            let targets = [{
                address: data.keyPair.address,
                value: new Bignumber(546).toNumber()
            }];
            let { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate);
            if (!inputs || !outputs) {
                throw new Error('tansfer data error');
            }

            let psbt = new Psbt({ network: networks.testnet });
            inputs.forEach(input =>
                psbt.addInput({
                    hash: input.txid,
                    index: input.vout,
                    nonWitnessUtxo: input.nonWitnessUtxo,
                })
            );
            outputs.forEach(output => {
                if (!output.address) {
                    output.address = data.payedKeyPair.address;
                }
                psbt.addOutput({
                    address: output.address,
                    value: output.value,
                });
            });
            const ecpair = ECPair.fromPrivateKey(Buffer.from(data.payedKeyPair.privateKey, 'hex'), { network: networks.testnet });
            psbt.signAllInputs(ecpair);
            psbt.validateSignaturesOfAllInputs();
            psbt.finalizeAllInputs();
            const txhash = psbt.extractTransaction().toHex();

            let txid = await client.command('sendrawtransaction', txhash);
            console.log('sendrawtransaction ==>', txid)

            return { success: true, txId: txid };
        } catch (error) {
            console.log(error)
            return { success: false, error };
        }
    }

    //转账阶段，代付地址和发送地址中指定为fee的交易一起完成转账，最终找零都放回代付地址
    async transferWithFee(data: TransferWithFeeDef): Promise<TransferResp> {
        try {
            let balance = await client.command('omni_getbalance', data.keyPair.address, PROPERTY);
            // console.log('omni_getbalance ==>', balance)
            let amount = new Bignumber(data.amount).times(PRECISION).toFixed(8);
            // console.log('amount ==>', amount);
            if (balance.balance < amount) {
                throw new Error('not enough balance');
            }

            let unspents = await client.command('listunspent', 0, 99999999, [data.keyPair.address]);
            console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            let utxos = [];
            let hasFeeUnspent = false;
            for (let unspent of unspents) {
                if (unspent.txid === data.inputTxId) {
                    utxos.push({
                        txid: unspent.txid,
                        vout: unspent.vout,
                        value: unspent.amount,
                        scriptPubKey: unspent.scriptPubKey,
                    });
                    hasFeeUnspent = true;
                }
            }
            if (!hasFeeUnspent) {
                throw new Error('listunspent not found tx for fee');
            }

            let unspentsPayed = await client.command('listunspent', 0, 99999999, [data.payedKeyPair.address]);
            console.log('listunspent ==>', unspentsPayed)
            if (unspentsPayed.length === 0) {
                throw new Error('payed listunspent is empty');
            }
            for (let unspent of unspentsPayed) {
                utxos.push({
                    txid: unspent.txid,
                    vout: unspent.vout,
                    value: unspent.amount,
                    scriptPubKey: unspent.scriptPubKey,
                });
            }

            let payload = await client.command('omni_createpayload_simplesend', PROPERTY, amount);
            // console.log('omni_createpayload_simplesend ==>', payload);

            let txhash = await client.command('createrawtransaction', utxos, {});
            // console.log('createrawtransaction ==>', txhash)

            let rawtx = await client.command('omni_createrawtx_opreturn', txhash, payload);
            // console.log('omni_createrawtx_opreturn ==>', rawtx);

            let rawtx2 = await client.command('omni_createrawtx_reference', rawtx, data.address);
            // console.log('omni_createrawtx_reference ==>', rawtx2);

            let feeRate = await this.getFeeRate(FeePriority.NORMAL);
            let fee = (utxos.length * 148 + 3 * 34 + 10) * feeRate;
            let fee0 = new Bignumber(fee).times(PRECISION).toNumber();
            let rawtx3 = await client.command('omni_createrawtx_change', rawtx2, utxos, data.payedKeyPair.address, fee0);
            // console.log('omni_createrawtx_change ==>', rawtx3);

            let txsign = await client.command('signrawtransactionwithkey', rawtx3, [data.payedKeyPair.wif, data.keyPair.wif]);
            // console.log('signrawtransactionwithkey ==>', txsign)

            // let tx = await client.command('decoderawtransaction', rawtx3, false)
            // console.log('decoderawtransaction ==>', JSON.stringify(tx))

            let txid = await client.command('sendrawtransaction', txsign.hex);
            console.log('sendrawtransaction ==>', txid)

            return { success: true, txId: txid };
        } catch (error) {
            console.log(error)
            return { success: false, error };
        }
    }

    async isBalanceEnought(address: string, amount: string, fee: string): Promise<boolean> {
        try {
            let total = new Bignumber(fee).plus(546);
            let groupsList = await client.command('listaddressgroupings');
            for (let groups of groupsList) {
                for (let group of groups) {
                    if (group.includes(address)) {
                        let balance = new Bignumber(group[1]).div(PRECISION);
                        if (new Bignumber(balance).gte(total)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        } catch (error) {
            throw error;
        }
    }

}
