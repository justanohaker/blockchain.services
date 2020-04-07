import { TransferDef, TransferResp, BalanceResp, TransferWithFeeDef, TransferWithPayedDef, FeeRangeDef, PrepareTransferDef } from './types';
import { IServiceProvider } from './service.provider';

const UPDATE_TIMEOUT: number = 2 * 1000;
const UPDATE_IDLE: number = 10 * 1000;
const MAX_UPDATE_ADDRESSES = 10;

export class IService {
    protected provider?: IServiceProvider;
    public addresses: string[];
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
     * 检测指定地址余额是否满足转账需求
     * @param address   - 转账地址
     * @param amount    - 转账金额
     * @param fee       - 转账交易费
     */
    async isBalanceEnought(address: string, amount: string, fee: string): Promise<boolean> {
        // TODO: implemented by subclass!
        throw new Error('Unimplemented...');
    }

    /**
     * 预提币 - 在提币请求中，发现提币账号上的余额不足以提币时，先从代付账号上转账，以满足提币需求
     * @param data 
     * @param data.keyPair - 代付账号信息
     * @param data.address - 提币账号地址
     * @param data.amount - 提币的数量
     * @param data.fee - 提币指定的交易费
     * @note - 模块要计算提币账号的余额信息，对比提币数量和交易费用，进行预转账处理，
     * @note - 特别注意Token与主链币的问题
     */
    async prepareTransfer(data: PrepareTransferDef): Promise<TransferResp> {
        throw new Error('Unimplemented...');
    }

    /**
     * @note override
     * @param data - 转账参数
     */
    async transfer(data: TransferDef): Promise<TransferResp> {
        // TODO: implemented by subclass
        throw new Error('Unimplemented...');
    }

    async transferWithFee(data: TransferWithFeeDef): Promise<TransferResp> {
        // TODO: implemented by subclass
        throw new Error('Unimplemented...');
    }

    /**
     * @note override
     * 获取账号余额信息
     * @param addresses - 地址集合
     */
    async getBalance(addresses: string[]): Promise<BalanceResp> {
        // TODO: implemented by subclass
        throw new Error('Unimplemented...');
    }

    /**
     * 获取一笔交易的交易费区间(Min, Max)，以及推荐值(Default)
     */
    async getFeeRange(): Promise<FeeRangeDef> {
        //TODO: implemented by subclass
        throw new Error('Unimplemented...');
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
                if (balances && this.provider && balances.success) {
                    this.provider.onBalanceChanged(balances.result);
                }
            })
            .catch(error => { /* // TODO */ })
            .finally(() => {
                setTimeout(this._updateBalanceHandler, UPDATE_TIMEOUT);
            });
    }
}