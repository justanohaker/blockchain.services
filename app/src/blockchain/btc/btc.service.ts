import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IService } from '../common/service.interface';
import {
    TransferDef, TransferResp, BalanceResp, BitcoinTransaction, TransferWithFeeDef,
    FeeRangeDef, TransferWithPayedDef, PrepareTransferDef, TransactionQueryResultDef
} from '../common/types';
import { FeePriority } from 'src/libs/types';

import { Buffer } from 'buffer';
import { ECPair, networks, Psbt } from 'bitcoinjs-lib';
import Bignumber from 'bignumber.js';
import coinSelect = require('coinselect');
import Axios from 'axios';

import { AppConfig } from '../../config/app.config';
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
const PRECISION = 1e-8;

@Injectable()
export class BtcService extends IService implements OnModuleInit, OnModuleDestroy {
    private interval = null;
    private lastHash = '';

    constructor() {
        super();
    }

    async onModuleInit() {
        await this.monitor();
        this.interval = setInterval(() => {
            this.monitor();
        }, 60000);
    }

    async onModuleDestroy() {
        if (this.interval !== null) {
            clearInterval(this.interval);
        }
    }

    private async monitor() {
        try {


            let lastBlockHash = await client.command('getbestblockhash')
            // console.log('lastBlockHash =1=>', lastBlockHash)
            if (this.lastHash && this.lastHash === lastBlockHash) {// 没有更新区块
                return
            }

            this.lastHash = lastBlockHash;

            let block = await client.command('getblock', lastBlockHash);
            // console.log('getblock =2=>', block)
            this.provider?.onNewBlock({ height: block.height });

            if (!this.addresses || this.addresses.length == 0) {// 没有需要监听的地址
                return
            }
            // console.log('addresses =0=>', this.addresses)
            let txs = [];
            for (let txid of block.tx) {
                let tx = await client.command('getrawtransaction', txid, true)
                // console.log('txId =3=>', tx, JSON.stringify(tx))

                let btcTx: BitcoinTransaction = {
                    type: 'bitcoin',
                    sub: 'btc',
                    txId: tx.txid,
                    blockHeight: block.height,
                    blockTime: tx.blocktime,
                    fee: tx.fee,
                    vIns: [],
                    vOuts: []
                };
                let isRelative = false;
                for (let vin of tx.vin) {
                    if (vin.txid) {
                        let txVin = await client.command('getrawtransaction', vin.txid, true);
                        let vout = txVin.vout[vin.vout];
                        if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
                            for (let address of vout.scriptPubKey.addresses) {
                                btcTx.vIns.push({
                                    address: address,
                                    amount: new Bignumber(vout.value).div(PRECISION).toString()
                                });
                                if (this.addresses && this.addresses.includes(address)) {
                                    isRelative = true;
                                }
                            }
                        };
                    }
                }
                for (let vout of tx.vout) {
                    if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
                        for (let address of vout.scriptPubKey.addresses) {
                            // console.log('scriptPubKey =6=>', vout.scriptPubKey)
                            btcTx.vOuts.push({
                                address: address,
                                amount: new Bignumber(vout.value).div(PRECISION).toString()
                            });
                            if (this.addresses && this.addresses.includes(address)) {
                                isRelative = true;
                            }
                        }
                    }
                }
                if (isRelative) {
                    txs.push(btcTx);
                    console.log('tx =7=>:', btcTx)
                }
            }
            if (txs.length > 0) {
                this.provider?.onNewTransaction(txs);
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

        let groupsList = await client.command('listaddressgroupings')
        // console.log('listaddressgroupings ==>', groupsList)
        for (const address of addresses) {
            let info = { address: address, balance: '0' }
            try {
                for (let groups of groupsList) {
                    for (let group of groups) {
                        if (group.includes(address)) {
                            info.balance = new Bignumber(group[1]).div(PRECISION).toString();
                        }
                    }
                }
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
            throw error;
        }
        return result;
    }

    async transfer(data: TransferDef): Promise<TransferResp> {
        try {
            let unspents = await client.command('listunspent', 0, 99999999, [data.keyPair.address]);
            // console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            let feeRate = await this.getFeeRate(data.feePriority);
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
                address: data.address,
                value: new Bignumber(data.amount).toNumber()
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
                    output.address = data.keyPair.address;
                }
                psbt.addOutput({
                    address: output.address,
                    value: output.value,
                });
            });
            const ecpair = ECPair.fromPrivateKey(Buffer.from(data.keyPair.privateKey, 'hex'), { network: networks.testnet });
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

    async transferWithFee(data: TransferWithFeeDef): Promise<TransferResp> {
        try {
            let unspents = await client.command('listunspent', 0, 99999999, [data.keyPair.address]);
            // console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            // 组织psbt数据
            let psbt = new Psbt({ network: networks.testnet });
            let fee = new Bignumber(data.fee);
            let total = new Bignumber(0);
            let amount = new Bignumber(data.amount);
            let trans = amount.plus(fee);
            let rest = new Bignumber(0);
            for (let unspent of unspents) {
                let txhex = await client.command('getrawtransaction', unspent.txid);
                psbt.addInput({
                    hash: unspent.txid,
                    index: unspent.vout,
                    nonWitnessUtxo: Buffer.from(txhex, 'hex')
                });

                total = total.plus(new Bignumber(unspent.amount).div(PRECISION));
                if (total.gte(trans)) {
                    rest = total.minus(trans);
                    break;
                }
            }
            if (total.lt(trans)) {
                throw new Error('not enough balance');
            }

            psbt.addOutput({
                address: data.address,
                value: amount.toNumber()
            });
            if (rest.times(PRECISION).toNumber() > 0) {
                psbt.addOutput({
                    address: data.keyPair.address,
                    value: rest.toNumber()
                });
            }

            // 签名psbt
            const ecpair = ECPair.fromPrivateKey(Buffer.from(data.keyPair.privateKey, 'hex'), { network: networks.testnet });
            psbt.signAllInputs(ecpair);
            psbt.validateSignaturesOfAllInputs();
            psbt.finalizeAllInputs();
            const psbthash = psbt.extractTransaction().toHex();
            // console.log('psbthash ==>', psbthash)

            let txid = await client.command('sendrawtransaction', psbthash);
            console.log('sendrawtransaction ==>', txid)

            return { success: true, txId: txid };
        } catch (error) {
            console.log(error)
            return { success: false, error };
        }
    }

    async getFeeRange(): Promise<FeeRangeDef> {
        return { min: '40000', max: '1000000', default: '40000' };
    }

}
