import { TransferDef, TransferResp, BalanceResp } from './types';
import { IServiceProvider } from './service.provider';

const UPDATE_TIMEOUT: number = 2 * 1000;
const UPDATE_IDLE: number = 10 * 1000;
const MAX_UPDATE_ADDRESSES = 10;

export class IService {
    protected provider?: IServiceProvider;
    protected addresses: string[];
    private _updateAddresses: string[];

    constructor() {
        this.addresses = [];
        this._updateAddresses = [];

        this._updateBalanceHandler = this._updateBalanceHandler.bind(this);
        setTimeout(this._updateBalanceHandler, UPDATE_IDLE);
    }

    /**
     * 设置provider - 用于处理一个回调或服务端信息获取
     * @param provider - IServiceProvider
     */
    async setProvider(provider: IServiceProvider): Promise<void> {
        this.provider = provider;

        this.addresses = await this.provider.getAddresses();
    }

    /**
     * 当系统有新账号产生时将调用此接口
     * @param addresses 新账号地址列表
     */
    async onNewAccounts(addresses: string[]): Promise<void> {
        // TODO
        this.addresses = await this.provider.getAddresses();
    }

    /**
     * @note override
     * 请求Service更新地址列表对应的余额信息
     * 更新完成之后，调用this.provider.onBalanceChanged()
     * 
     * @param addresses 地址列表
     */
    async onUpdateBalances(addresses: string[]): Promise<void> {
        for (const address of addresses) {
            this._updateAddresses.push(address);
        }
    }

    /**
     * @note override
     * @param data - 转账参数
     */
    async transfer(data: TransferDef): Promise<TransferResp> {
        // TODO: implemented by subclass
        throw new Error('Implemented by subclass!');
    }

    /**
     * @note override
     * 获取账号余额信息
     * @param addresses - 地址集合
     */
    async getBalance(addresses: string[]): Promise<BalanceResp> {
        // TODO: implemented by subclass
        throw new Error('Implemented by subclasses!');
    }

    private _updateBalanceHandler(): void {
        if (this._updateAddresses.length <= 0) {
            setTimeout(this._updateBalanceHandler, UPDATE_IDLE);
            return;
        }

        const spliceSize = Math.min(
            this._updateAddresses.length,
            MAX_UPDATE_ADDRESSES
        );
        const addresses = this._updateAddresses.splice(0, spliceSize);
        this.getBalance(addresses)
            .then((balances: BalanceResp) => {
                if (this.provider && balances.success) {
                    this.provider.onBalanceChanged(balances.result);
                }
            })
            .finally(() => {
                setTimeout(this._updateBalanceHandler, UPDATE_TIMEOUT);
            });
    }
}