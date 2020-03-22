import {  EventEmitter }   from 'events' 
import { ethers, utils } from 'ethers';
import * as usdt_config from "src/blockchain/erc20-tokens/configs/erc20-usdt.json";
const InputDataDecoder = require('ethereum-input-data-decoder');
import {  EthereumTransaction, Erc20UsdtTransaction } from '../common/types';
import { IService } from '../common/service.interface';

export class EthMonitor extends EventEmitter{ 
    private httpProvider: ethers.providers.Provider
    private interval_count = 5//同时获取tx数量的异步数量
    private tx_cache: Array<string> = new Array();
    private contracts: Array<string> = new Array();
    private serviceMap:Map<string,IService> = new Map();
    private static instance: EthMonitor;
    constructor() {
        super();
        this.httpProvider = //ethers.getDefaultProvider('ropsten');
        new ethers.providers.JsonRpcProvider("http://111.231.105.174:8545");//=http://127.0.0.1:8545
        this.contracts.push(usdt_config.address)
        }
        public static getInstance(): EthMonitor {
            if (!EthMonitor.instance) {
                EthMonitor.instance = new EthMonitor();
            }
    
            return EthMonitor.instance;
        }
        public monit() {
            this.httpProvider.on('block', (blockNumber) => {
                this.httpProvider.getBlock(blockNumber)
                    .then(block => {
                        this.tx_cache = this.tx_cache.concat(block?.transactions);
                    })
                    .catch(error => {
                        // Error Happend!!
                    });
                    this.emit("block",blockNumber);
            });
    
            // error handle
            this.httpProvider.on('error', (error) => {
                console.log(`[EthService] HttpProvider error: ${error}`);
            });
        }
        public setIService(name:string,service:IService){
            this.serviceMap.set(name,service)
        }
        public async startTx() {
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
                                if (this.serviceMap.get("Erc20Usdt").addresses && (
                                    this.serviceMap.get("Erc20Usdt").addresses.includes(transaction.sender) ||
                                    this.serviceMap.get("Erc20Usdt").addresses.includes(transaction.recipient)
                                )) {
                                    console.log('[[[Erc20Usdt loopTx]]]:', JSON.stringify(transaction))
                                    this.emit("Erc20Usdt",[transaction]);
                                }
                            } else if (this.serviceMap.get("Eth").addresses && (
                                this.serviceMap.get("Eth").addresses.includes(transaction.sender) ||
                                this.serviceMap.get("Eth").addresses.includes(transaction.recipient)
                            )) {//TODO other contracts？
                                console.log('[[[EthService loopTx]]] original tx:', JSON.stringify(tx));
                                console.log('[[[EthService loopTx]]]:', JSON.stringify(transaction));
                                this.emit("Eth",[transaction]);
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
}

