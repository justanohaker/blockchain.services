import { TransferDef, TransferResp, BalanceResp } from './types';
import { IServiceProvider } from './service.provider';

export class IService {
    protected provider?: IServiceProvider;
    protected validAddresses: string[];

    constructor() {
        this.onDirty = this.onDirty.bind(this);
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
     * 请求Service更新地址列表对应的余额信息
     * 更新完成之后，调用this.provider.onBalanceChanged()
     * 
     * @param addresses 地址列表
     */
    async onUpdateBalances(addresses: string[]): Promise<void> {
        // TODO: implemented by subclass
        throw new Error('Implemented by subclass!');
    }

    /**
     * @note override
     * @param data 
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
}