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
            let result = await this.transferByPsbtCoinselect(data);
            console.log(result)
            return { success: true, txId: result };
        } catch (error) {
            console.log(error)
            return { success: false, error };
        }
    }

    private async transferBySign(data: TransferDef) {
        try {
            let unspents = await client.command('listunspent', 0, 999999, [data.keyPair.address]);
            console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            let utxos = [];
            for (let unspent of unspents) {
                utxos.push({
                    txid: unspent.txid,
                    vout: unspent.vout,
                    value: unspent.amount,
                    scriptPubKey: unspent.scriptPubKey,
                });
            }
            let txhash = await client.command('createrawtransaction', utxos);
            console.log('createrawtransaction ==>', txhash)

        } catch (error) {
            throw error;
        }
    }

    private async transferByPsbt(data: TransferDef) {
        try {
            // 读取为花费交易列表
            // let unspents = await client.command('listunspent', 1, 9999, [data.keyPair.address]);
            let unspents = await client.command('listunspent', { addresses: [data.keyPair.address] });
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }
            // console.log('listunspent ==>', unspents, data.keyPair.address);

            // 组织psbt数据
            let psbt = new Psbt({ network: networks.testnet });
            let getfee = await this.getFee(data.feePriority);
            let fee = new Bignumber(getfee);
            let total = new Bignumber(0);
            let amount = new Bignumber(data.amount);
            let trans = amount.plus(fee);
            let rest = new Bignumber(0);
            for (let unspent of unspents) {
                let txHex = await client.command('getrawtransaction', { txid: unspent.txid });
                psbt.addInput({
                    hash: unspent.txid,
                    index: unspent.vout,
                    nonWitnessUtxo: Buffer.from(txHex, 'hex')
                });

                total = total.plus(new Bignumber(unspent.amount).div(PRECISION));
                if (total.gte(trans)) {
                    rest = total.minus(trans);
                    // console.log(total.toNumber(), amount.toNumber(), rest.toNumber(), trans.toNumber(), rest.toNumber())
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
            const psbtHash = psbt.extractTransaction().toHex();
            // console.log('psbtHash ==>', psbtHash)

            //发送交易
            let txHash = await client.command('sendrawtransaction', psbtHash);
            // console.log('sendrawtransaction ==>', txHash)

            return txHash;
        } catch (error) {
            throw error;
        }
    }

    private async transferByPsbtCoinselect(data: TransferDef) {
        try {
            let unspents = await client.command('listunspent', { addresses: [data.keyPair.address] });
            console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            let feeRate = 10;
            let utxos = [];
            for (let unspent of unspents) {
                let txHex = await client.command('getrawtransaction', { txid: unspent.txid });
                utxos.push({
                    txId: unspent.txid,
                    vout: unspent.vout,
                    value: unspent.amount / PRECISION,
                    nonWitnessUtxo: Buffer.from(txHex, 'hex')
                });
            }
            let targets = [{
                address: 'mfyu2dWfZEuZQkHmMD5cuPoa1uaEA6Bfin',
                value: 10
            }];
            let { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate);
            if (!inputs || !outputs) return;

            let psbt = new Psbt({ network: networks.testnet });
            inputs.forEach(input =>
                psbt.addInput({
                    hash: input.txId,
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


            // 签名psbt
            const ecpair = ECPair.fromPrivateKey(Buffer.from(data.keyPair.privateKey, 'hex'), { network: networks.testnet });
            psbt.signAllInputs(ecpair);
            psbt.validateSignaturesOfAllInputs();
            psbt.finalizeAllInputs();
            const psbtHash = psbt.extractTransaction().toHex();
            // console.log('psbtHash ==>', psbtHash)

            //发送交易
            let txHash = await client.command('sendrawtransaction', psbtHash);
            // console.log('sendrawtransaction ==>', txHash)

            return txHash;
        } catch (error) {
            throw error;
        }
    }

    // 手续费计算
    private async getFee(fee: FeePriority) {
        return 500;
    }
}
