import { Injectable } from '@nestjs/common';
import { IService } from '../common/service.interface';
import { TransferDef, TransferResp, BalanceResp } from '../common/types';

import { Buffer } from 'buffer';
import { ECPair, networks, Psbt } from 'bitcoinjs-lib';
import axios from 'axios';
import { w3cwebsocket } from 'websocket';
import Bignumber from 'bignumber.js'

import Client = require('bitcoin-core');
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
export class BtcService extends IService {
    private interval = null;
    private lastHash = '';

    constructor() {
        super()

        setTimeout(() => {
            this.startMonitor()
        }, 1000)
    }

    // 启动监听数据变更
    async startMonitor() {
        await this.monitor();
        this.interval = setInterval(() => {
            this.monitor();
        }, 60000);
    }

    // 停止监听数据变更
    async stopMonitor() {
        if (this.interval !== null) {
            clearInterval(this.interval)
        }
    }

    private async monitor() {
        try {
            if (!this.validAddresses || this.validAddresses.length == 0) {// 没有需要监听的地址
                return
            }
            // console.log('validAddresses =0=>', this.validAddresses)

            let lastBlockHash = await client.command('getbestblockhash')
            // console.log('lastBlockHash =1=>', lastBlockHash)

            if (this.lastHash && this.lastHash === lastBlockHash) {// 没有更新区块
                return
            }

            this.lastHash = lastBlockHash;
            let block = await client.command('getblock', lastBlockHash)
            // console.log('getblock =2=>', block)
            for (let id of block.tx) {
                // console.log('txId =3=>', id)
                let tx = await client.command('getrawtransaction', id, true)
                // console.log('txId =4=>', tx)
                let txs = [];
                for (let vin of tx.vin) {
                    // console.log('vin =5=>', vin)
                    if (vin.scriptPubKey && vin.scriptPubKey.addresses) {
                        for (let address of vin.scriptPubKey.addresses) {
                            // console.log('scriptPubKey =6=>', vin.scriptPubKey)
                            if (this.validAddresses && this.validAddresses.includes(address)) {
                                console.log('tx =7=>:', address, tx)
                                txs.push(tx);
                            }
                        }
                    }
                }
                for (let vout of tx.vout) {
                    // console.log('vout =5=>', vout)
                    if (vout.scriptPubKey && vout.scriptPubKey.addresses) {
                        for (let address of vout.scriptPubKey.addresses) {
                            // console.log('scriptPubKey =6=>', vout.scriptPubKey)
                            if (this.validAddresses && this.validAddresses.includes(address)) {
                                console.log('tx =7=>:', address, tx)
                                txs.push(tx);
                            }
                        }
                    }
                }

                if (txs.length > 0) {
                    this.provider.onNewTransaction(txs);
                }
            }
        } catch (error) {
            console.log(error)
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
                            info.balance = group[1].toString();
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

    async importAddress(address: string) {
        try {
            await client.command('importaddress', address, '', true)
        } catch (error) {
            // do nothing
        }
    }

    /**
     * @note override
     * 查询交易信息
     * @param id - 交易id
     */
    async getTxInfo(id: string) {
        try {
            let tx = await client.command('getrawtransaction', id, true)
            return { success: true, result: tx };
        } catch (error) {
            throw error;
        }
    }

    /**
     * @note override
     * @param data 
     */
    async transfer(data: TransferDef): Promise<TransferResp> {
        let result = await this.transferByPsbt(data);
        // console.log(result)
        return { success: true, txId: result };
    }

    private async transferByPsbt(data: TransferDef) {
        try {
            // 读取为花费交易列表
            let unspents = await client.command('listunspent', 1, 9999, [data.keyPair.address])
            // console.log('listunspent ==>', unspents)

            // 组织psbt数据
            let psbt = new Psbt({ network: networks.testnet });

            let total = new Bignumber(0);
            let fee = new Bignumber(this.getFee());
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
                if (total.gt(trans)) {
                    rest = total.minus(trans);
                    // console.log(total.toNumber(), amount.toNumber(), rest.toNumber(), trans.toNumber(), rest.toNumber())
                    break;
                }
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
            // console.log('psbtHash ==>',psbtHash)

            //发送交易
            let txHash = await client.command('sendrawtransaction', psbtHash);
            // console.log('sendrawtransaction ==>', txHash)

            return txHash;
        } catch (error) {
            throw error;
        }
    }

    // 手续费计算
    private getFee() {
        return 500;
    }
}
