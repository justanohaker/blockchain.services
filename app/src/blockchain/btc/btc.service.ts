import { Injectable } from '@nestjs/common';
import { IService } from '../common/service.interface';
import { TransferDef, TransferResp, BalanceResp } from '../common/types';

import { Buffer } from 'buffer';
import { ECPair, networks, Psbt } from 'bitcoinjs-lib';
import axios from 'axios';
import Client = require('bitcoin-core');
import { w3cwebsocket } from 'websocket';

const client = new Client({
    host: '47.95.3.22',
    port: 8332,
    username: 'entanmo_bitcoin',
    password: 'Entanmo2020',
    version: '0.18.0',
    agentOptions: {},
    wallet: ''
})

@Injectable()
export class BtcService extends IService {
    constructor() {
        super()

        this.startMonitor()
    }

    // 启动监听数据变更
    async startMonitor() {

    }

    // 停止监听数据变更
    async stopMonitor() {

    }

    /**
     * @note override
     * @param data 
     */
    async transfer(data: TransferDef): Promise<TransferResp> {
        let result = await this.transferByPsbt(data);
        console.log(result)
        return { success: true, txId: result };
    }

    // 通过交易签名方式创建交易
    private async transferBySign(data: TransferDef) {
        let result: any;
        const newtx = {
            inputs: [{ addresses: [data.keyPair.address] }],
            outputs: [{ addresses: [data.address], value: Number(data.amount) }]
        };
        let keys = ECPair.fromPrivateKey(Buffer.from(data.keyPair.privateKey, 'hex'), { network: networks.testnet });

        await axios.post('https://api.blockcypher.com/v1/btc/test3/txs/new', newtx)
            .then(async res => {
                console.log(res.data);
                // signing each of the hex-encoded string required to finalize the transaction
                const tmptx = res.data;
                tmptx.pubkeys = [];
                tmptx.signatures = tmptx.tosign.map((tosign: string) => {
                    tmptx.pubkeys.push(keys.publicKey.toString("hex"));
                    return keys.sign(Buffer.from(tosign, "hex")).toString("hex");
                });
                console.log(tmptx)

                // sending back the transaction with all the signatures to broadcast
                // await axios.post('https://api.blockcypher.com/v1/btc/test3/txs/send', tmptx)
                //     .then((res: any) => {
                //         console.log('2222222222222222222222222', res.data);
                //         result = res;
                //     })
                //     .catch((err: any) => {
                //         console.log('333333333333333333333333333333', err)
                //         return { success: false, error: err };
                //     });
            })
            .catch(err => {
                console.log(err)
                return { success: false, error: err };
            });
        return { success: true, txId: result };
    }

    // 通过Psbt方式创建交易
    private async transferByPsbt(data: TransferDef) {
        try {
            let tmptx = await this.buildTransaction(data.keyPair.address, data.address, Number(data.amount));
            let inputs = await this.getInputs(tmptx.tx.inputs);
            let outputs = await this.getOutputs(tmptx.tx.outputs);
            let txHex = await this.buildPsbt(inputs, outputs, data.keyPair.privateKey);
            let pushHash = await this.broadcastTx(txHex);
            return pushHash;
        } catch (error) {
            throw error;
        }
    }

    private async buildTransaction(sender: string, recipient: string, amount: number): Promise<any> {
        const body = {
            inputs: [{ addresses: [sender] }],
            outputs: [{ addresses: [recipient], value: amount }]
        };

        try {
            const buildResp = await axios.post(
                'https://api.blockcypher.com/v1/btc/test3/txs/new',
                JSON.stringify(body)
            );
            if (buildResp.status !== 200 &&
                buildResp.status !== 201) {
                throw new Error()
            }

            return buildResp.data;
        } catch (error) {
            throw error;
        }
    }

    private async getInputs(inputs: any[]): Promise<any[]> {
        const result = [];
        try {
            for (const i of inputs) {
                const txInfoUrl = `https://api.blockcypher.com/v1/btc/test3/txs/${i.prev_hash}`;
                // console.log('txInfoUrl:', txInfoUrl);
                const txGet = await axios.get(txInfoUrl, {
                    params: { includeHex: true }
                });
                if (txGet.status !== 200 &&
                    txGet.status !== 201) {
                    throw new Error();
                }

                // console.log('trHex:', txGet.data.hex);
                const input = {
                    hash: i.prev_hash,
                    index: i.output_index,
                    sequence: i.sequence,
                    nonWitnessUtxo: Buffer.from(txGet.data.hex, 'hex')
                };
                result.push(input);
            }
        } catch (error) {
            throw error;
        }

        return result;
    }

    private async getOutputs(outputs: any[]): Promise<any[]> {
        const result = [];

        for (const o of outputs) {
            for (const oo of o.addresses) {
                const output = {
                    address: oo,
                    value: o.value
                };
                result.push(output);
            }
        }

        return result;
    }

    private async buildPsbt(inputs: any[], outputs: any[], privateKey: string): Promise<string> {
        const ecPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'), { network: networks.testnet });
        const psbt = new Psbt({ network: networks.testnet });

        psbt.addInputs(inputs);
        psbt.addOutputs(outputs);

        // psbt.signAllInputs(ecPair);
        for (let i = 0; i < inputs.length; i++) {
            psbt.signInput(i, ecPair);
        }
        for (let i = 0; i < inputs.length; i++) {
            psbt.validateSignaturesOfInput(i);
        }
        // psbt.validateSignaturesOfAllInputs();
        psbt.finalizeAllInputs();
        const tr = psbt.extractTransaction();
        return tr.toHex();
    }

    private async broadcastTx(txHex: string): Promise<string> {
        const pushResult = await axios.post(
            'https://api.blockcypher.com/v1/btc/test3/txs/push',
            { tx: txHex }
        );
        if (pushResult.status !== 200 &&
            pushResult.status !== 201) {
            throw new Error();
        }
        // console.log('pushData:', pushResult.data);
        return pushResult.data.tx.hash;
    }

    /**
     * @note override
     * 获取账号余额信息
     * @param addresses - 地址集合
     */
    async getBalance(addresses: string[]): Promise<BalanceResp> {
        const result: BalanceResp = { success: true, result: [] };

        for (const address of addresses) {
            try {
                const btcBalanceResp = await axios.get(`https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`);
                if (btcBalanceResp.status !== 200 &&
                    btcBalanceResp.status !== 201) {
                    throw new Error();
                }
                const respData = btcBalanceResp.data;
                result.result.push({
                    address: respData.address,
                    balance: respData.balance
                });
            } catch (error) {
                result.result.push({ address: address, balance: '0' });
            }
        }

        return result;
    }

    /**
     * @note override
     * 查询交易信息
     * @param id - 交易id
     */
    async getTxInfo(id: string) {
        let result: any;
        axios.get('https://api.blockcypher.com/v1/btc/test3/txs/' + id)
            .then((res: { data: any; }) => {
                console.log(res.data);
                result = res.data;
            })
            .catch((err: any) => {
                return { success: false, error: err };
            });
        return { success: true, result };
    }

    async testBtcNode() {
        // let b = await client.getNewAddress()
        // let b = await client.getAddressInfo('33Yfjnqhr6F3vZEmj1iMAcAXN5Y2mL2Fi4')
        let b = await client.getBalance()
        console.log(b)
    }

    async testWs() {
        var ws = new w3cwebsocket("wss://socket.blockcypher.com/v1/btc/test3");
        ws.onopen = () => {
            console.log('WebSocket Connected');
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({ event: "new-block" }));
            }
            console.log(ws.readyState);
        }
        ws.onmessage = event => {
            console.log(event.data)
            var tx = JSON.parse(event.data.toString());
            console.log(tx)
        }
        ws.onerror = error => {
            console.log(error)
        }
        ws.onclose = () => {
            console.log('WebSocket Closed');
        };
    }

}
