import { Transaction, BalanceDef } from "./types";

export interface IServiceProvider {
    /**
     * 获取当前链的有效地址列表，用于监控余额变化，交易变化
     * @returns - 当前链在服务上有效的地址列表
     */
    getValidAddresses(): Promise<string[]>;

    /**
     * 设置服务端有效地址列表变更时的通知
     * @param cb - 服务里有效用户地址列表变化后回调的函数
     */
    setDirtyFn(cb: () => Promise<void>): Promise<void>;

    /**
     * 回调
     * 当监控程序监控到有新的地址的余额变化时调用此回调
     * @param newBalance - 变化的账号信息
     */
    onBalanceChanged(newBalance: BalanceDef[]): Promise<void>;

    /**
     * 回调
     * 当监控程序监控到一批不同的地址有余额变化时调用此回调
     * @param newBalances - 批量变量的账号信息
     */
    // onBatchBalancesChanged(newBalances: BalanceDef[]): Promise<void>;

    /**
     * @note 回调
     * 当监控程序监控到新的交易时调用此回调
     * @param tr - 一个或多个新交易的结构
     */
    onNewTransaction(tr: Transaction[]): Promise<void>;
}