import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IService } from '../../common/service.interface';
import { TransferDef, TransferResp, BalanceResp, OmniUsdtTransactin } from '../../../blockchain/common/types';
import Bignumber from 'bignumber.js';

import Client = require('bitcoin-core');
import { FeePriority } from 'src/libs/types';
const client = new Client({
    host: '111.231.105.174',
    port: 8332,
    network: 'regtest',
    username: 'entanmo_bitcoin',
    password: 'Entanmo2018',
    version: '',
    agentOptions: {},
    wallet: 'sy'
});
const PRECISION = 1e-8;
const PROPERTY = 2; //propertyid  1:OMNI,2:TOMNI,31:USDT

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
            let lastBlockHeght = chainInfo.block;
            // console.log('lastBlockHash =1=>', lastBlockHash)
            if (this.lastHeight === lastBlockHeght) {// 没有更新区块
                return
            }

            this.lastHeight = lastBlockHeght;
            let transactions = await client.command('omni_listblocktransactions', lastBlockHeght);
            // console.log('getblock =2=>', block)

            let txs = [];
            for (let txid of transactions) {
                let tx = await client.command('omni_gettransaction', txid);
                // console.log('txId =3=>', tx, JSON.stringify(tx))

                if (this.addresses.includes(tx.sendingaddress) || this.addresses.includes(tx.referenceaddress)) {
                    let omniTx: OmniUsdtTransactin = {
                        type: 'bitcoin',
                        sub: 'omni-usdt',
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

    async transfer(data: TransferDef): Promise<TransferResp> {
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

            let payload = await client.command('omni_createpayload_simplesend', PROPERTY, data.amount);
            // console.log('omni_createpayload_simplesend ==>', payload);

            let txhash = await client.command('createrawtransaction', utxos, {});
            // console.log('createrawtransaction ==>', txhash)

            let rawtx = await client.command('omni_createrawtx_opreturn', txhash, payload);
            // console.log('omni_createrawtx_opreturn ==>', rawtx);

            let rawtx2 = await client.command('omni_createrawtx_reference', rawtx, data.address);
            // console.log('omni_createrawtx_reference ==>', rawtx2);

            let fee = this.getFee(data.feePriority);
            let rawtx3 = await client.command('omni_createrawtx_change', rawtx2, utxos, data.keyPair.address, fee);
            // console.log('omni_createrawtx_change ==>', rawtx3);

            let txsign = await client.command('signrawtransactionwithkey', rawtx3, [data.keyPair.wif]);
            // console.log('signrawtransactionwithkey ==>', txsign)

            let txHash = await client.command('sendrawtransaction', txsign.hex);
            console.log('sendrawtransaction ==>', txHash)

            return { success: true, txId: txHash };
        } catch (error) {
            console.log(error)
            return { success: false, error };
        }
    }

    // 手续费计算
    private async getFee(fee: FeePriority) {
        return 0.00000800;
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
}
