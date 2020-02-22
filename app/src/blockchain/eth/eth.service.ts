import { Injectable,Logger } from '@nestjs/common';
import { NewWalletDto, sendCoinDto, balanceDto,transactionDto} from './eth.dto';
import { BalanceDef,BalanceResp,TransferDef,TransferResp} from '../common/types';
import { IService} from '../common/service.interface';
import { IServiceProvider} from '../common/service.provider';
import { ethers,utils } from 'ethers';
import { EthaccountsCurd } from '../../curds/ethaccounts-curd';

const crypto = require('crypto');
const secret = 'abcdefg';

                   

@Injectable()
export class EthService extends IService{
    private logger: Logger = new Logger('Logger', true);
    private mnemonic = ethers.Wallet.createRandom().mnemonic
    private httpProvider :ethers.providers.Provider
    private wallet:ethers.Wallet
    constructor() {
        super();
        this.httpProvider =ethers.getDefaultProvider('ropsten');
         //new ethers.providers.JsonRpcProvider();//=http://127.0.0.1:8545
        let path = "m/44'/60'/1'/0/0";
        this.wallet = ethers.Wallet.fromMnemonic(this.mnemonic, path);
    }
    async newWallet( param: NewWalletDto) {
        this.logger.log("newWallet = "+JSON.stringify(param));
        let path = "m/44'/60'/1'/0/0";
        let wallet = ethers.Wallet.fromMnemonic(this.mnemonic, path);
        const wid = crypto.createHmac('sha256', secret)
                   .update(this.mnemonic)
                   .digest('hex');
        this.logger.log(wid);

        let res = {walletId:wid,privateKey:wallet.privateKey,address:wallet.address}
        console.log(res);
        return res
    }
    async balance(address: string): Promise<BalanceDef> {
           let bl =await this.httpProvider.getBalance(address)
           return {address:address,"balance":bl.toString()}
    }
    async getBalance(addresses: string[]): Promise<BalanceResp> {
        // let bl =await this.httpProvider.getBalance(param.address)
        // return {address:param.address,"balance":bl.toString()}
        // let list =new Array<BalanceDef>()
        // addresses.forEach(async(ele)=>{需要异步调用
        //    let b = await this.balance(ele);
        //     list.push(b) ;
        // })
        return {success:true,result:[]}
 }
    // async sendTransaction(param: sendCoinDto) {
    //     let path = "m/44'/60'/1'/0/0";
    //     if(param.coinName != "eth") throw Error("coinName ")
    //     let privateKey = "0x320d35b4c250c95d7331798a295fdcf69e876718f42cfa86b91b313c00f71731";
    //     let nonce = await this.httpProvider.getTransactionCount("0xC4100A97dD815626E57A13886650060F914cc782")
    //     let transaction = {
    //         nonce: Number.parseInt(param.nonce),
    //         gasLimit: 21000,
    //         gasPrice: utils.bigNumberify("20000000000"),
    //         to: param.toAddress,
    //         value: utils.parseEther("1.0"),
    //         chainId: 123456 //ethers.utils.getNetwork('homestead').chainId
    //     }

    //     let wallet2 = new ethers.Wallet(privateKey);
    //     // let signedTransaction =await this.wallet.sign(transaction)
    //     let signedTransaction =await wallet2.sign(transaction)  
    //     // This can now be sent to the Ethereum network

    //    let tx =await this.httpProvider.sendTransaction(signedTransaction)
    //     this.httpProvider.waitForTransaction(tx.hash,12).then(
    //         (receipt) => {
    //             let sendaddress = receipt.from
    //             console.log(receipt);
    //         }
    //     )
    //     // this.httpProvider.once(tx.hash, async (receipt) => {
    //     //     console.log('Transaction Minded: ' + receipt.hash);
    //     //     receipt =  await this.httpProvider.waitForTransaction(tx.hash,12)
    //     //     console.log(receipt);
    //     // });

    //     return {tx}
    // }
    async getTransaction(param: transactionDto) {
        let transaction =await this.httpProvider.getTransaction(param.transactionId)
        return transaction
    }
    /**
     * 设置provider - 用于处理一个回调或服务端信息获取
     * @param provider - IServiceProvider
     */
    setProvider(provider: IServiceProvider): void {
        this.provider = provider;
        this.provider.setDirtyFn(this.onDirty);
    }

    /**
     * @note 需要其它逻辑处理，请重载此方法
     */
    async onDirty(): Promise<void> {
        this.validAddresses = await this.provider.getValidAddresses();
        // TODO: other logic implemented by subclass
    }

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

        let wallet2 = new ethers.Wallet(param.keyPair.privateKey);
        let signedTransaction =await wallet2.sign(transaction)  
       let tx =await this.httpProvider.sendTransaction(signedTransaction)
        this.httpProvider.waitForTransaction(tx.hash,1).then(
            (receipt) => {
                let sendaddress = receipt.from
                console.log(receipt);
            }
        )
        return {success:true,txId:tx.hash}
    }

}
