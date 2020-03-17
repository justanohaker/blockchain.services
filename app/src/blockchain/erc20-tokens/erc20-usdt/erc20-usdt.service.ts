import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { BalanceDef, BalanceResp, TransferDef, TransferResp, Erc20UsdtTransaction } from 'src/blockchain/common/types';
import { IService } from 'src/blockchain/common/service.interface';
import { FeePriority } from 'src/libs/types'
import { ethers, utils } from 'ethers';
// var usdt_config = require('src/blockchain/erc20-tokens/configs/erc20-usdt.json');
const InputDataDecoder = require('ethereum-input-data-decoder');
// import usdt_config from "src/blockchain/erc20-tokens/configs/erc20-usdt.json";
import * as usdt_config from "../configs/erc20-usdt.json";
const UPDATE_TIMEOUT: number = 2 * 1000;
const UPDATE_IDLE: number = 10 * 1000;
const MAX_UPDATE_ADDRESSES = 10;

@Injectable()
export class Erc20UsdtService extends IService implements OnApplicationBootstrap, OnModuleInit {
    private logger: Logger = new Logger('Logger', true);
    private mnemonic = ethers.Wallet.createRandom().mnemonic
    private httpProvider: ethers.providers.Provider
    private wallet: ethers.Wallet
    private interval_count = 5//同时获取tx数量的异步数量
    private tx_cache: Array<string> = new Array();
    private contract: ethers.Contract
    private decimals: ethers.utils.BigNumber
    constructor() {
        super();
        this.httpProvider = //ethers.getDefaultProvider('ropsten');
            new ethers.providers.JsonRpcProvider(usdt_config.url);
        this.contract = new ethers.Contract(usdt_config.address, usdt_config.abi, this.httpProvider);
        this.contract.decimals().then((res) => {
            this.decimals = res
        })
    }

    onModuleInit() {

    }

    onApplicationBootstrap() {
        // this.startTx();
    }

    async balance(address: string): Promise<BalanceDef> {
        let bl = await this.contract.balanceOf(address)
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
                const bl = await this.contract.balanceOf(address);
                result.result.push({ address, balance: bl.toString() });
            } catch (error) {
                result.result.push({ address, balance: '0' });
            }
        }
        return result;
    }

    async getTransaction(param: string) {
        let tx = await this.httpProvider.getTransaction(param)
        const decoder = new InputDataDecoder(usdt_config.abi);
        const transfer = decoder.decodeData(tx.data);
        let to_address = "0x" + transfer["inputs"][0]
        let amount = transfer["inputs"][1].toString()
        let costWei = tx.gasPrice.mul(tx.gasLimit)
        // console.log(to_address, amount)
        // console.log(tx)
        let transaction: Erc20UsdtTransaction = {
            type: "ethereum",                   // 以太坊主网 - 标记
            sub: "erc20_usdt",                         // 以太坊代币ETH - 标记
            txId: tx.hash,                      // 交易Id
            blockHeight: tx.blockNumber,        // 交易打包高度
            fee: costWei.toString(),                            // TODO: need transaction fee
            sender: tx.from,                    // 交易发送者地址
            recipient: to_address,                   // 交易接收者地址
            amount: amount //.div( this.decimals).toString()         // 转账金额
        }
        console.log(JSON.stringify(transaction))
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
        let wallet = new ethers.Wallet(param.keyPair.privateKey, this.httpProvider);
        let contractWithSigner = this.contract.connect(wallet);
        let tx = await contractWithSigner.functions.transfer(param.address, ethers.utils.bigNumberify(param.amount));
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