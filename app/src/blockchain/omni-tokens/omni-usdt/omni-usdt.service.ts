import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IService } from '../../common/service.interface';
import {
    TransferDef, TransferResp, BalanceResp, OmniUsdtTransactin, TransferWithFeeDef,
    TransferWithPayedDef, FeeRangeDef, PrepareTransferDef
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
            if (!this.addresses || this.addresses.length == 0) {// 没有需要监听的地址
                return
            }
            // console.log('addresses =0=>', this.addresses)

            let chainInfo = await client.command('omni_getinfo');
            // console.log('chainInfo =1=>', chainInfo)
            let lastBlockHeght = chainInfo.block;
            // console.log('lastBlockHash =1=>', lastBlockHash)
            if (this.lastHeight === lastBlockHeght) {// 没有更新区块 
                return
            }

            this.lastHeight = lastBlockHeght;
            this.provider.onNewBlock({ height: lastBlockHeght });

            let transactions = await client.command('omni_listblocktransactions', lastBlockHeght);
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
                        blockHeight: lastBlockHeght,
                        blockTime: tx.blocktime,
                        propertyId: tx.propertyid,
                        version: tx.version,
                        typeInt: tx.type_int,
                        sending: tx.sendingaddress,
                        reference: tx.referenceaddress,
                        amount: tx.amount,
                        fee: tx.fee
                    };
                    txs.push(omniTx);
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

    async isBalanceEnought(address: string, amount: string, fee: string): Promise<boolean> {
        try {
            let total = new Bignumber(fee).plus(546);
            let groupsList = await client.command('listaddressgroupings');
            for (let groups of groupsList) {
                for (let group of groups) {
                    if (group.includes(address)) {
                        let balance = new Bignumber(group[1]).div(PRECISION);
                        if(new Bignumber(balance).gte(total)){
                            return true;
                        }
                    }
                }
            }

            return false
        } catch (error) {
            throw error
        }
    }

    //代付地址向发送地址转最少量btc(546聪明)+手续费
    async prepareTransfer(data: PrepareTransferDef): Promise<TransferResp> {
        try {
            let unspents = await client.command('listunspent', 0, 99999999, [data.payedKeyPair.address]);
            // console.log('listunspent ==>', unspents)
            if (unspents.length === 0) {
                throw new Error('listunspent is empty');
            }

            // 组织psbt数据
            let psbt = new Psbt({ network: networks.testnet });
            let fee = new Bignumber(data.fee);
            let total = new Bignumber(0);
            let amount = new Bignumber(546).plus(fee);
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
                address: data.keyPair.address,
                value: amount.toNumber()
            });
            if (rest.times(PRECISION).toNumber() > 0) {
                psbt.addOutput({
                    address: data.payedKeyPair.address,
                    value: rest.toNumber()
                });
            }

            // 签名psbt
            const ecpair = ECPair.fromPrivateKey(Buffer.from(data.payedKeyPair.privateKey, 'hex'), { network: networks.testnet });
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
            for (let unspent of unspents) {
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

            let fee = new Bignumber(data.fee).times(PRECISION).toNumber();
            let rawtx3 = await client.command('omni_createrawtx_change', rawtx2, utxos, data.keyPair.address, fee);
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

    //代付地址(btc)+发送地址(omni)一起向接受地址转账
    async transferWithPayed(data: TransferWithPayedDef): Promise<TransferResp> {
        try {
            let balance = await client.command('omni_getbalance', data.keyPair.address, PROPERTY);
            // console.log('omni_getbalance ==>', balance)
            let amount = new Bignumber(data.amount).times(PRECISION).toFixed(8);
            // console.log('amount ==>', amount);
            if (balance.balance < amount) {
                throw new Error('not enough balance');
            }

            let unspents = await client.command('listunspent', 0, 99999999, [data.keyPair.address, data.payedKeyPair.address]);
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

            let payload = await client.command('omni_createpayload_simplesend', PROPERTY, amount);
            // console.log('omni_createpayload_simplesend ==>', payload);

            let txhash = await client.command('createrawtransaction', utxos, {});
            // console.log('createrawtransaction ==>', txhash)

            let rawtx = await client.command('omni_createrawtx_opreturn', txhash, payload);
            // console.log('omni_createrawtx_opreturn ==>', rawtx);

            let rawtx2 = await client.command('omni_createrawtx_reference', rawtx, data.address);
            // console.log('omni_createrawtx_reference ==>', rawtx2);

            let fee = new Bignumber(data.fee).times(PRECISION).toNumber();
            let rawtx3 = await client.command('omni_createrawtx_change', rawtx2, utxos, data.payedKeyPair.address, fee);
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

    async getFeeRange(): Promise<FeeRangeDef> {
        return { min: '200000000', max: '500000000', default: '200000000' };
    }

}
