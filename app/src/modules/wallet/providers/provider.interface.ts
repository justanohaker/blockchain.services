import { DespositDto } from "../wallet.dto";
import { User } from "../../../models/users.model";
import { Account } from '../../../models/accounts.model'
import { TxDef, TransferResult } from "./types";

// 链相关功能提供者接口
export interface IChainProvider {
    /**
     * 添加账号
     * @param userRepo 用户信息
     * @param secret 此账号对应的secret
     */
    addAccount(userRepo: User, secret: string): Promise<Account>;

    /**
     * 获取账号
     * @param clientId 账号对应的AppId
     * @param accountId 账号Id
     */
    retrieveAccount(clientId: string, accountId: string): Promise<Account>;

    /**
     * 获取账号交易列表
     * @param clientId 账号对应的AppId
     * @param accountId 账号Id
     */
    getTransactions(clientId: string, accountId: string): Promise<string[]>;

    /**
     * 获取交易详情
     * @param clientId 账号对应的AppId
     * @param accountId 账号Id
     * @param txId 交易Id
     */
    getTransaction(clientId: string, accountId: string, txId: string): Promise<TxDef>;

    /**
     * 转账
     * @param clientId 账号对应的AppId
     * @param account 账号Id
     * @param despositDto 转账参数
     */
    transfer(clientId: string, accountId: string, despositDto: DespositDto): Promise<TransferResult>;

    /**
     * 添加新的账号信息
     * @param addresses 地址列表
     */
    onNewAccount(addresses: string[]): Promise<void>;
}