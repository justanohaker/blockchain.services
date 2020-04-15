import { Injectable, OnModuleInit, OnModuleDestroy, OnApplicationBootstrap, Logger } from '@nestjs/common';
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
import * as path from 'path';
import * as fs from 'fs';

import { AppConfig } from '../../config/app.config';
import Client = require('bitcoin-core');
const client = new Client({
    host: AppConfig.mainnet ? '120.53.0.176' : '111.231.105.174',
    port: 8332,
    // network: AppConfig.mainnet ? 'mainnet' : 'regtest',
    username: 'entanmo_bitcoin',
    password: 'Entanmo2018',
    version: '',
    agentOptions: {},
    wallet: 'sy'
});
const PRECISION = 1e-8;

@Injectable()
export class BtcService extends IService implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap {
    private interval = null;
    private lastHeight = -1;

    private logger: Logger = new Logger('BtcService', true);
    private blockCursor: number = -1;
    private blockLatestHeight: number = -1;
    private blockSchedHandler: NodeJS.Timeout = null;
    private transactionSchedHandler: NodeJS.Timeout = null;
    private backupFilePath: string = '';

    private static BLOCK_SCHED_INTERVAL: number = 60 * 1000;
    private static TRANSACTION_SCHED_INTERVAL: number = 1 * 1000;

    constructor() {
        super();

        this.backupFilePath = path.resolve(path.join(__dirname, '../../../', 'btc.service.dat'));
        this.syncBlockSched = this.syncBlockSched.bind(this);
        this.syncTransactionSched = this.syncTransactionSched.bind(this);
    }

    async onModuleInit() {
        // await this.monitor();
        // this.interval = setInterval(() => {
        //     this.monitor();
        // }, 60000);

        try {
            const fileContent = fs.readFileSync(this.backupFilePath, { encoding: 'utf8' });
            const unmarshalDat = JSON.parse(fileContent);
            if (unmarshalDat.blockCursor) {
                this.blockCursor = unmarshalDat.blockCursor;
                this.logger.log(`load blockCursor(${this.blockCursor})`);
            }
        } catch (error) { }
    }

    async onModuleDestroy() {
        // if (this.interval !== null) {
        //     clearInterval(this.interval);
        // }

        if (this.blockSchedHandler) {
            clearTimeout(this.blockSchedHandler);
            this.blockSchedHandler = null;
        }
        if (this.transactionSchedHandler) {
            clearTimeout(this.transactionSchedHandler);
            this.transactionSchedHandler = null;
        }

        const backupData = JSON.stringify({
            blockCursor: this.blockCursor
        });
        try {
            fs.writeFileSync(this.backupFilePath, backupData, { encoding: 'utf8' });
            this.logger.log(`backup btc.service.dat:${backupData}`);
        } catch (error) { }
    }

    async onApplicationBootstrap() {
        this.blockSchedHandler = setTimeout(this.syncBlockSched, 0);
        this.transactionSchedHandler = setTimeout(this.syncTransactionSched, BtcService.TRANSACTION_SCHED_INTERVAL);
    }

    private syncBlockSched() {
        this.blockSchedHandler = null;
        (async () => {
            let lastBlockHash = await client.command('getbestblockhash');
            let lastBlock = await client.command('getblock', lastBlockHash);
            if (this.blockLatestHeight != lastBlock.height) {
                this.blockLatestHeight = lastBlock.height;
                this.logger.log(`syncBlock(${lastBlock.height})`);
            }

            if (this.blockCursor == -1) {
                // init blockCursor
                this.blockCursor = this.blockLatestHeight;
            }
        })()
            .then(() => {
                this.blockSchedHandler = setTimeout(
                    this.syncBlockSched,
                    BtcService.BLOCK_SCHED_INTERVAL
                );

            }, (error) => {
                this.blockSchedHandler = setTimeout(
                    this.syncBlockSched,
                    BtcService.BLOCK_SCHED_INTERVAL
                );
                this.logger.log(`syncBlockSched error: ${error}`);
            });
    }

    private syncTransactionSched() {
        this.transactionSchedHandler = null;
        (async () => {
            this.logger.log(`start syncTransactionSched(${this.blockCursor},${this.blockLatestHeight})`);
            if (this.blockCursor > this.blockLatestHeight) {
                return false;
            }

            do {
                if (!this.addresses || this.addresses.length <= 0) {
                    break;
                }

                let blockhash = await client.command('getblockhash', this.blockCursor);
                let block = await client.command('getblock', blockhash);
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
                        fee: '',
                        vIns: [],
                        vOuts: []
                    };
                    let isRelative = false;
                    let fee = new Bignumber(0);
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
                                    fee = fee.plus(vout.value);
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
                                fee = fee.minus(vout.value);
                                if (this.addresses && this.addresses.includes(address)) {
                                    isRelative = true;
                                }
                            }
                        }
                    }
                    if (isRelative) {
                        btcTx.fee = fee.div(PRECISION).toString();
                        txs.push(btcTx);
                        console.log('tx =7=>:', btcTx)
                    }
                }
                if (txs.length > 0) {
                    await this.provider?.onNewTransaction(txs);
                    this.logger.log(`onNewTransaction(${txs.length}) event on BlockHeight(${this.blockCursor})...`);
                }
            } while (false);

            await this.provider?.onNewBlock({ height: this.blockCursor });
            this.logger.log(`onNewBlock(${this.blockCursor}) Event...`);

            return true;
        })()
            .then((success: boolean) => {
                success && this.blockCursor++;
                this.logger.log(`syncTransactionSched(${success}), cursor(${this.blockCursor})`);
                this.transactionSchedHandler = setTimeout(
                    this.syncTransactionSched,
                    BtcService.TRANSACTION_SCHED_INTERVAL
                );
            }, (error) => {
                this.transactionSchedHandler = setTimeout(
                    this.syncTransactionSched,
                    BtcService.TRANSACTION_SCHED_INTERVAL
                );
                this.logger.log(`syncTransactionSched error: ${error}`);
            });
    }

    private async monitor() {
        try {
            // if (!this.addresses || this.addresses.length == 0) {// 没有需要监听的地址
            //     return
            // }
            // console.log('addresses =0=>', this.addresses)

            let lastBlockHash = await client.command('getbestblockhash');
            let lastBlock = await client.command('getblock', lastBlockHash);
            if (this.lastHeight >= lastBlock.height) {
                return;
            }

            if (this.lastHeight === -1) {//重新启动时从最新区块开始更新
                this.lastHeight = lastBlock.height - 1;
            }

            let offset = lastBlock.height - this.lastHeight;//一分钟可能产生多个区块
            for (let i = 0; i < offset; i++) {
                this.lastHeight += 1;
                let blockhash = await client.command('getblockhash', this.lastHeight);
                let block = await client.command('getblock', blockhash);
                // console.log('getblock =2=>', block)
                await this.provider?.onNewBlock({ height: this.lastHeight });

                if (!this.addresses || this.addresses.length == 0) {// 没有需要监听的地址
                    continue;
                }
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
                        fee: '',
                        vIns: [],
                        vOuts: []
                    };
                    let isRelative = false;
                    let fee = new Bignumber(0);
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
                                    fee = fee.plus(vout.value);
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
                                fee = fee.minus(vout.value);
                                if (this.addresses && this.addresses.includes(address)) {
                                    isRelative = true;
                                }
                            }
                        }
                    }
                    if (isRelative) {
                        btcTx.fee = fee.div(PRECISION).toString();
                        txs.push(btcTx);
                        console.log('tx =7=>:', btcTx)
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
            const ecpair = ECPair.fromPrivateKey(Buffer.from(data.keyPair.privateKey, 'hex'),
                { network: AppConfig.mainnet ? networks.bitcoin : networks.testnet });
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
            const ecpair = ECPair.fromPrivateKey(Buffer.from(data.keyPair.privateKey, 'hex'),
                { network: AppConfig.mainnet ? networks.bitcoin : networks.testnet });
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
