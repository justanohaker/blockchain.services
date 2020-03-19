import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { NewWalletDto, sendCoinDto, balanceDto, transactionDto } from './eth.dto';
import { BalanceDef, BalanceResp, TransferDef, TransferResp, EthereumTransaction, Erc20UsdtTransaction } from '../common/types';
import { IService } from '../common/service.interface';
import { FeePriority } from '../../libs/types'
import { ethers, utils } from 'ethers';
import * as usdt_config from "src/blockchain/erc20-tokens/configs/erc20-usdt.json";
const UPDATE_TIMEOUT: number = 2 * 1000;
const UPDATE_IDLE: number = 10 * 1000;
const MAX_UPDATE_ADDRESSES = 10;
const LRU = require("lru-cache")
const InputDataDecoder = require('ethereum-input-data-decoder');
const options = { max: 20000, maxAge: 1000 * 60 * 30 }
@Injectable()
export class EthService extends IService implements OnApplicationBootstrap, OnModuleInit {
    private logger: Logger = new Logger('Logger', true);
    private httpProvider: ethers.providers.Provider
    private interval_count = 5//同时获取tx数量的异步数量
    private nonceCache =  new LRU(options); 
    private tx_cache: Array<string> = new Array();
    private contracts: Array<string> = new Array();
    constructor() {
        super();
        this.httpProvider = //ethers.getDefaultProvider('ropsten');
            new ethers.providers.JsonRpcProvider("http://111.231.105.174:8545");//=http://127.0.0.1:8545
        this.contracts.push(usdt_config.address)

        }

    onModuleInit() {
        this.httpProvider.on('block', (blockNumber) => {
            this.httpProvider.getBlock(blockNumber)
                .then(block => {
                    this.tx_cache = this.tx_cache.concat(block?.transactions);
                })
                .catch(error => {
                    // Error Happend!!
                });
        });

        // error handle
        this.httpProvider.on('error', (error) => {
            console.log(`[EthService] HttpProvider error: ${error}`);
        });
    }

    onApplicationBootstrap() {
        this.startTx();
    }

    async startTx() {
        let loop_tx = () => {
            //  console.log("tx cache length ",JSON.stringify(this.tx_cache.length),this.interval_count)
            if (this.tx_cache.length <= 0) {
                this.interval_count++
                // console.log("tx interval_count ",this.interval_count)
                return
            }
           
            const txid = this.tx_cache.shift();
            try {
                this.httpProvider.getTransaction(txid).then(
                    (tx) => {
                        let costWei = tx.gasPrice.mul(tx.gasLimit)
                        let transaction: EthereumTransaction = {
                            type: "ethereum",                   // 以太坊主网 - 标记
                            sub: "eth",                         // 以太坊代币ETH - 标记
                            txId: tx.hash,                      // 交易Id
                            blockHeight: tx.blockNumber,        // 交易打包高度
                            nonce: tx.nonce,                    // 交易打包时间
                            fee: costWei.toString(),              // 交易费
                            sender: tx.from,                    // 交易发送者地址
                            recipient: tx.to,                   // 交易接收者地址
                            amount: tx.value.toString()         // 转账金额
                        }
                        if (this.contracts.includes(tx.to)) {
                            const decoder = new InputDataDecoder(usdt_config.abi);
                            const transfer = decoder.decodeData(tx.data);
                            let to_address = ethers.utils.getAddress("0x" + transfer["inputs"][0]);
                            let amount = transfer["inputs"][1].toString()
                            if(transfer["method"] != "transfer") return
                            let transaction: Erc20UsdtTransaction = {
                                type: "ethereum",                   // 以太坊主网 - 标记
                                sub: "erc20_usdt",                  // 以太坊代币ETH - 标记
                                txId: tx.hash,                      // 交易Id
                                blockHeight: tx.blockNumber,        // 交易打包高度
                                fee: costWei.toString(),              // TODO: 交易费
                                sender: tx.from,                    // 交易发送者地址
                                recipient: to_address,              // 交易接收者地址
                                amount: amount //.div( this.decimals).toString()         // 转账金额
                            }
                            if (this.addresses && (
                                this.addresses.includes(transaction.sender) ||
                                this.addresses.includes(transaction.recipient)
                            )) {
                                console.log('[[[Erc20Usdt loopTx]]]:', JSON.stringify(transaction))
                                this.provider.onNewTransaction([transaction]);
                            }
                        } else if (this.addresses && (
                            this.addresses.includes(transaction.sender) ||
                            this.addresses.includes(transaction.recipient)
                        )) {//TODO other contracts？
                            console.log('[[[EthService loopTx]]] original tx:', JSON.stringify(tx));
                            console.log('[[[EthService loopTx]]]:', JSON.stringify(transaction));
                            this.provider.onNewTransaction([transaction]);
                        }
                    }
                )
            } catch (error) {
                // console.log(error)
                this.tx_cache.unshift(txid);
            }
            loop_tx();
        }
        setInterval(async () => {//每3秒启动一个递归获取tx-cache中的tx
            if (this.interval_count <= 0) {
                return;
            }
            // console.log("setInterval interval_count ",this.interval_count)
            this.interval_count--
            loop_tx()
        }, 3000)

    }

    async balance(address: string): Promise<BalanceDef> {
        let bl = await this.httpProvider.getBalance(address)
        return { address: address, "balance": bl.toString() }
    }
    async getBalance(addresses: string[]): Promise<BalanceResp> {
        const result: BalanceResp = {
            success: true,
            result: []
        };

        for (const address of addresses) {
            // result.result.push({ address, balance: '0' });
            try {
                const bl = await this.httpProvider.getBalance(address);
                result.result.push({ address, balance: bl.toString() });
            } catch (error) {
                result.result.push({ address, balance: '0' });
            }
        }
        return result;
    }

    async getTransaction(param: transactionDto) {
        let transaction = await this.httpProvider.getTransaction(param.transactionId)
        return transaction
    }
    getFeeLevel() {
        return {
            "fast": GASPRICE['2'],
            "normal": GASPRICE['1'],
            "slow": GASPRICE['0']
        }
    }

    /**
     * @note override
     * @param data 
     */
    async transfer(param: TransferDef): Promise<TransferResp> {
        let nonce = await this.httpProvider.getTransactionCount(param.keyPair.address)
        if(this.nonceCache.has(param.keyPair.address)){
            nonce+=this.nonceCache.get(param.keyPair.address)
        }
        let transaction = {
            nonce: nonce,
            gasLimit: 21000,
            gasPrice: utils.bigNumberify(getFee(param.feePriority)),// Gwei   ,slow 5000000000 normal 15000000000 fast 30000000000
            to: param.address,
            value: utils.bigNumberify(param.amount),//wei utils.parseEther("1.0"),
            chainId: ethers.utils.getNetwork('ropsten').chainId
        }
        let wallet2 = new ethers.Wallet(param.keyPair.privateKey);
        let signedTransaction = await wallet2.sign(transaction)
        if(this.nonceCache.has(param.keyPair.address)){
            this.nonceCache.set(param.keyPair.address,this.nonceCache.get(param.keyPair.address)+1)
        }else{
            this.nonceCache.set(param.keyPair.address,1)
        }
        let tx = await this.httpProvider.sendTransaction(signedTransaction)
       
        // console.log('tx:', tx);
        this.httpProvider.waitForTransaction(tx.hash).then(
            (receipt) => {
                if(this.nonceCache.has(param.keyPair.address)){
                    this.nonceCache.set(param.keyPair.address,this.nonceCache.get(param.keyPair.address)-1)
                }
                console.log("nonceCache nonce:",this.nonceCache.get(param.keyPair.address));
            }
        )
        return { success: true, txId: tx.hash }
    }
}

function getFee(param) {
    switch (param) {
        case FeePriority.HIGH:
            return GASPRICE["2"];
        case FeePriority.NORMAL:
            return GASPRICE["1"];
        case FeePriority.LOWER:
            return GASPRICE["0"];
        default:
            return GASPRICE["1"];
    }
}
export const GASPRICE = {
    "2": "30000000000",//快
    "1": "15000000000",//普通
    "0": "5000000000",//慢
}