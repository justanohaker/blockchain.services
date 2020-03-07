import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { NewWalletDto, sendCoinDto, balanceDto, transactionDto } from './eth.dto';
import { BalanceDef, BalanceResp, TransferDef, TransferResp, EthereumTransaction } from '../common/types';
import { IService } from '../common/service.interface';
import { IServiceProvider } from '../common/service.provider';
import { ethers, utils } from 'ethers';
// import { EthaccountsCurd } from '../../curds/ethaccounts-curd';
// const async= require('async');
// var Web3 = require('web3');
// var web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/ "));
const crypto = require('crypto');
const secret = 'abcdefg';


const UPDATE_TIMEOUT: number = 2 * 1000;
const UPDATE_IDLE: number = 10 * 1000;
const MAX_UPDATE_ADDRESSES = 10;

@Injectable()
export class EthService extends IService implements OnApplicationBootstrap, OnModuleInit {
    private logger: Logger = new Logger('Logger', true);
    private mnemonic = ethers.Wallet.createRandom().mnemonic
    private httpProvider: ethers.providers.Provider
    private wallet: ethers.Wallet
    private interval_count = 5//同时获取tx数量的异步数量
    private tx_cache: Array<string> = new Array();

    constructor() {
        super();
        this.httpProvider = ethers.getDefaultProvider('ropsten');
        //new ethers.providers.JsonRpcProvider();//=http://127.0.0.1:8545
        let path = "m/44'/60'/1'/0/0";
        this.wallet = ethers.Wallet.fromMnemonic(this.mnemonic, path);
    }

    onModuleInit() {
        // this.httpProvider.on('block', async (blockNumber) => {
        //     //    console.log('New Eth Block: ' + blockNumber);
        //     const b = await this.httpProvider.getBlock(blockNumber);
        //     //    console.log('New Block: ',JSON.stringify(b));
        //     this.tx_cache = this.tx_cache.concat(b.transactions)
        //     //   console.log('New Eth Block: ' + blockNumber,JSON.stringify(this.tx_cache.length))
        // });

        this.httpProvider.on('block', (blockNumber) => {
            this.httpProvider.getBlock(blockNumber)
                .then(block => {
                    this.tx_cache = this.tx_cache.concat(block?.transactions);
                })
                .catch(error => {
                    // Error Happend!!
                });
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
                        let transaction: EthereumTransaction = {
                            type: "ethereum",                   // 以太坊主网 - 标记
                            sub: "eth",                         // 以太坊代币ETH - 标记
                            txId: tx.hash,                      // 交易Id
                            blockHeight: tx.blockNumber,        // 交易打包高度
                            nonce: tx.nonce,                    // 交易打包时间
                            sender: tx.from,                    // 交易发送者地址
                            recipient: tx.to,                   // 交易接收者地址
                            amount: tx.value.toString()         // 转账金额
                        }
                        if (this.addresses && (
                            this.addresses.includes(transaction.sender) ||
                            this.addresses.includes(transaction.recipient)
                        )) {
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

    async newWallet(param: NewWalletDto) {
        this.logger.log("newWallet = " + JSON.stringify(param));
        let path = "m/44'/60'/1'/0/0";
        let wallet = ethers.Wallet.fromMnemonic(this.mnemonic, path);
        const wid = crypto.createHmac('sha256', secret)
            .update(this.mnemonic)
            .digest('hex');
        this.logger.log(wid);

        let res = { walletId: wid, privateKey: wallet.privateKey, address: wallet.address }
        console.log(res);
        return res
    }
    async balance(address: string): Promise<BalanceDef> {
        let bl = await this.httpProvider.getBalance(address)
        return { address: address, "balance": bl.toString() }
    }
    async getBalance(addresses: string[]): Promise<BalanceResp> {
        // // let bl =await this.httpProvider.getBalance(param.address)
        // // return {address:param.address,"balance":bl.toString()}
        // // let list =new Array<BalanceDef>()
        // // addresses.forEach(async(ele)=>{需要异步调用
        // //    let b = await this.balance(ele);
        // //     list.push(b) ;
        // // })
        // return { success: true, result: [] }

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
    // /**
    //  * 设置provider - 用于处理一个回调或服务端信息获取
    //  * @param provider - IServiceProvider
    //  */
    // setProvider(provider: IServiceProvider): void {
    //     this.provider = provider;
    //     this.provider.setDirtyFn(this.onDirty);
    //     console.log('EthService.setProvider:', `${this.provider}`);
    // }

    // /**
    //  * @note 需要其它逻辑处理，请重载此方法
    //  */
    // async onDirty(): Promise<void> {
    //     this.validAddresses = await this.provider.getValidAddresses();
    //     // TODO: other logic implemented by subclass
    // }

    /**
     * @note override
     * @param data 
     */
    async transfer(param: TransferDef): Promise<TransferResp> {
        let nonce = await this.httpProvider.getTransactionCount(param.keyPair.address)
        let transaction = {
            nonce: nonce,
            gasLimit: 21000,
            gasPrice: utils.bigNumberify("20000000000"),
            to: param.address,
            value: utils.bigNumberify(param.amount),//wei utils.parseEther("1.0"),
            chainId: ethers.utils.getNetwork('ropsten').chainId
        }
        console.log(transaction);
        let wallet2 = new ethers.Wallet(param.keyPair.privateKey);
        let signedTransaction = await wallet2.sign(transaction)
        let tx = await this.httpProvider.sendTransaction(signedTransaction)
        console.log('tx:', tx);
        this.httpProvider.waitForTransaction(tx.hash, 1).then(
            (receipt) => {
                let sendaddress = receipt.from
                console.log(receipt);
            }
        )
        return { success: true, txId: tx.hash }
    }
}
