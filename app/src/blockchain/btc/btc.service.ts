import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IService } from '../common/service.interface';
import { TransferDef, TransferResp, BalanceResp, BitcoinTransaction } from '../common/types';

import { Buffer } from 'buffer';
import { ECPair, networks, Psbt } from 'bitcoinjs-lib';
import Bignumber from 'bignumber.js';
import coinSelect = require('coinselect');

import Client = require('bitcoin-core');
import { FeePriority } from 'src/libs/types';
const client = new Client({
    host: '47.95.3.22',
    port: 8332,
    network: 'regtest',
    username: 'entanmo_bitcoin',
    password: 'Entanmo2018',
    version: '0.18.0',
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
            if (!this.addresses || this.addresses.length == 0) {// 没有需要监听的地址
                return
            }
            // console.log('addresses =0=>', this.addresses)

            let lastBlockHash = await client.command('getbestblockhash')
            // console.log('lastBlockHash =1=>', lastBlockHash)
            if (this.lastHash && this.lastHash === lastBlockHash) {// 没有更新区块
                return
            }

            this.lastHash = lastBlockHash;
            let block = await client.command('getblock', lastBlockHash)
            // console.log('getblock =2=>', block)

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
                                    amount: (new Bignumber(vout.value).div(PRECISION)).toString()
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
                                amount: (new Bignumber(vout.value).div(PRECISION)).toString()
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
                this.provider.onNewTransaction(txs);
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

    /**
     * @note override
     * 获取账号余额信息
     * @param addresses - 地址集合
     */
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
        // console.log('getbalance ==>', result)
        return result;
    }

    /**
     * @note override
     * @param data 
     */
    async transfer(data: TransferDef): Promise<TransferResp> {
        try {
            let unspents = await client.command('listunspent', { addresses: [data.keyPair.address] });
            console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            let txdata = await this.generateTxData(data, unspents);
            // console.log('txdata ==>', txdata)

            let txhash = await this.buildTx(data, txdata);
            // console.log('txhash ==>', txhash)

            let txid = await client.command('sendrawtransaction', txhash);
            console.log('sendrawtransaction ==>', txid)

            // let txdata2 = await this.generateTxData2(data, unspents);
            // // console.log('txdata2 ==>', txdata2)

            // let txhash2 = await this.buildTx(data, txdata2);
            // // console.log('txhash2 ==>', txhash2)

            // let txid2 = await client.command('sendrawtransaction', txhash2);
            // console.log('sendrawtransaction ==>', txid2)

            return { success: true, txId: txid };
        } catch (error) {
            console.log(error)
            return { success: false, error };
        }
    }

    private async generateTxData(data: TransferDef, unspents) {
        try {
            let feeRate = 10;
            let utxos = [];
            for (let unspent of unspents) {
                let txHex = await client.command('getrawtransaction', { txid: unspent.txid });
                utxos.push({
                    txid: unspent.txid,
                    vout: unspent.vout,
                    value: unspent.amount / PRECISION,
                    nonWitnessUtxo: Buffer.from(txHex, 'hex')
                });
            }
            let targets = [{
                address: 'mfyu2dWfZEuZQkHmMD5cuPoa1uaEA6Bfin',
                value: Number(data.amount)
            }];
            let txdata = coinSelect(utxos, targets, feeRate);
            if (!txdata.inputs || !txdata.outputs) {
                throw new Error('tansfer data error');
            }

            return txdata;
        } catch (error) {
            throw error;
        }
    }

    private async generateTxData2(data: TransferDef, unspents) {
        try {
            let getfee = await this.getFee(data.feePriority);
            let fee = new Bignumber(getfee);
            let total = new Bignumber(0);
            let amount = new Bignumber(data.amount);
            let trans = amount.plus(fee);
            let rest = new Bignumber(0);
            let inputs = [];
            for (let unspent of unspents) {
                let txHex = await client.command('getrawtransaction', { txid: unspent.txid });
                inputs.push({
                    txid: unspent.txid,
                    vout: unspent.vout,
                    nonWitnessUtxo: Buffer.from(txHex, 'hex')
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

            let outputs = [];
            outputs.push({
                address: data.address,
                value: amount.toNumber()
            });
            if (rest.times(PRECISION).toNumber() > 0) {
                outputs.push({
                    address: data.keyPair.address,
                    value: rest.toNumber()
                });
            }

            return { inputs, outputs, fee: getfee };
        } catch (error) {
            throw error;
        }
    }

    private async buildTx(data: TransferDef, txdata) {
        try {
            let { inputs, outputs, fee } = txdata;
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
            const psbtHash = psbt.extractTransaction().toHex();

            return psbtHash;
        } catch (error) {
            throw error;
        }
    }

    private async buildTx2(data: TransferDef, txdata) {

    }

    // 手续费计算
    private async getFee(fee: FeePriority) {
        return 1000;
    }
}
