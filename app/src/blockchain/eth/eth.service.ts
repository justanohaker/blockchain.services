import {
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleInit,
} from '@nestjs/common';
import {
    NewWalletDto,
    sendCoinDto,
    balanceDto,
    transactionDto,
} from './eth.dto';
import {
    FeeRangeDef,
    TransferWithFeeDef,
    BalanceDef,
    BalanceResp,
    TransferDef,
    TransferResp,
    EthereumTransaction,
    Erc20UsdtTransaction,
} from '../common/types';
import { IService } from '../common/service.interface';
import { FeePriority } from '../../libs/types';
import { ethers, utils } from 'ethers';
import * as usdt_config from 'src/blockchain/erc20-tokens/configs/erc20-usdt.json';
// import { EthMonitor } from './eth.monitor';
const UPDATE_TIMEOUT: number = 2 * 1000;
const UPDATE_IDLE: number = 10 * 1000;
const MAX_UPDATE_ADDRESSES = 10;
const LRU = require('lru-cache');
const InputDataDecoder = require('ethereum-input-data-decoder');
const options = { max: 20000, maxAge: 1000 * 60 * 30 };
@Injectable()
export class EthService extends IService
    implements OnApplicationBootstrap, OnModuleInit {
    private logger: Logger = new Logger('Logger', true);
    private httpProvider: ethers.providers.Provider;
    private nonceCache = new LRU(options);
    private contracts: Array<string> = new Array();
    constructor() {
        super();
        this.httpProvider = new ethers.providers.JsonRpcProvider( //ethers.getDefaultProvider('ropsten');
            'http://111.231.105.174:8545',
        ); //=http://127.0.0.1:8545
        this.contracts.push(usdt_config.address);
        // EthMonitor.getInstance().setIService("Eth",this)
    }

    onModuleInit() {
        // EthMonitor.getInstance().monit();
        // EthMonitor.getInstance().on("Eth",(data)=>{
        //     this.provider.onNewTransaction(data);
        // })
    }

    onApplicationBootstrap() {
        // EthMonitor.getInstance().startTx();
    }

    async balance(address: string): Promise<BalanceDef> {
        let bl = await this.httpProvider.getBalance(address);
        return { address: address, balance: bl.toString() };
    }
    async getBalance(addresses: string[]): Promise<BalanceResp> {
        const result: BalanceResp = {
            success: true,
            result: [],
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
        let transaction = await this.httpProvider.getTransaction(
            param.transactionId,
        );
        return transaction;
    }
    getFeeLevel() {
        return {
            fast: GASPRICE['2'],
            normal: GASPRICE['1'],
            slow: GASPRICE['0'],
        };
    }

    /**
     * @note override
     * @param data
     */
    async transfer(param: TransferDef): Promise<TransferResp> {
        let nonce = await this.httpProvider.getTransactionCount(
            param.keyPair.address,
        );
        if (this.nonceCache.has(param.keyPair.address)) {
            nonce += this.nonceCache.get(param.keyPair.address);
        }
        let transaction = {
            nonce: nonce,
            gasLimit: 21000,
            gasPrice: utils.bigNumberify(getFee(param.feePriority)), // Gwei   ,slow 5000000000 normal 15000000000 fast 30000000000
            to: param.address,
            value: utils.bigNumberify(param.amount), //wei utils.parseEther("1.0"),
            chainId: ethers.utils.getNetwork('ropsten').chainId,
        };
        let wallet2 = new ethers.Wallet(param.keyPair.privateKey);
        let signedTransaction = await wallet2.sign(transaction);
        if (this.nonceCache.has(param.keyPair.address)) {
            this.nonceCache.set(
                param.keyPair.address,
                this.nonceCache.get(param.keyPair.address) + 1,
            );
        } else {
            this.nonceCache.set(param.keyPair.address, 1);
        }
        let tx = await this.httpProvider.sendTransaction(signedTransaction);

        // console.log('tx:', tx);
        this.httpProvider.waitForTransaction(tx.hash).then(receipt => {
            if (this.nonceCache.has(param.keyPair.address)) {
                this.nonceCache.set(
                    param.keyPair.address,
                    this.nonceCache.get(param.keyPair.address) - 1,
                );
            }
            console.log(
                'nonceCache nonce:',
                this.nonceCache.get(param.keyPair.address),
            );
        });
        return { success: true, txId: tx.hash };
    }
    /***
     * 1 ether = 10的18次方wei
     * 1 Gwei = 10的9次方wei
     * gasprice 一般在5Gwei - 50Gwei也就是 5000000000 wei 到 50000000000 wei
     * gaslimit转账一般是21000个gas这里写死了
     */
    async transferWithFee(param: TransferWithFeeDef): Promise<TransferResp> {
        if (utils.bigNumberify(param.fee).lt(getFee(FeePriority.LOWER))) {
            throw new Error('fee too low');
        }
        let nonce = await this.httpProvider.getTransactionCount(
            param.keyPair.address,
        );
        if (this.nonceCache.has(param.keyPair.address)) {
            nonce += this.nonceCache.get(param.keyPair.address);
        }
        let transaction = {
            nonce: nonce,
            gasLimit: 21000,
            gasPrice: utils.bigNumberify(param.fee), // Gwei   ,slow 5000000000 normal 15000000000 fast 30000000000
            to: param.address,
            value: utils.bigNumberify(param.amount), //wei utils.parseEther("1.0"),
            chainId: ethers.utils.getNetwork('ropsten').chainId,
        };
        let wallet2 = new ethers.Wallet(param.keyPair.privateKey);
        let signedTransaction = await wallet2.sign(transaction);
        if (this.nonceCache.has(param.keyPair.address)) {
            this.nonceCache.set(
                param.keyPair.address,
                this.nonceCache.get(param.keyPair.address) + 1,
            );
        } else {
            this.nonceCache.set(param.keyPair.address, 1);
        }
        let tx = await this.httpProvider.sendTransaction(signedTransaction);

        // console.log('tx:', tx);
        this.httpProvider.waitForTransaction(tx.hash).then(receipt => {
            if (this.nonceCache.has(param.keyPair.address)) {
                this.nonceCache.set(
                    param.keyPair.address,
                    this.nonceCache.get(param.keyPair.address) - 1,
                );
            }
            console.log(
                'nonceCache nonce:',
                this.nonceCache.get(param.keyPair.address),
            );
        });
        return { success: true, txId: tx.hash };
    }
    /***
     * 1 ether = 10的18次方wei
     * 1 Gwei = 10的9次方wei
     * Range最小5Gwei 最大50Gwei
     * */
    async getFeeRange(): Promise<FeeRangeDef> {
        return {
            min: '5000000000',
            max: '50000000000',
            default: '15000000000',
        };
    }
}

function getFee(param) {
    switch (param) {
        case FeePriority.HIGH:
            return GASPRICE['2'];
        case FeePriority.NORMAL:
            return GASPRICE['1'];
        case FeePriority.LOWER:
            return GASPRICE['0'];
        default:
            return GASPRICE['1'];
    }
}
export const GASPRICE = {
    '2': '30000000000', //快
    '1': '15000000000', //普通
    '0': '5000000000', //慢
};
