import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { IService } from '../../common/service.interface';
import { TransferDef, TransferResp, BalanceResp } from '../../../blockchain/common/types';

@Injectable()
export class OmniUsdtService extends IService implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super();
    }

    async onModuleInit(): Promise<void> { }

    async onModuleDestroy(): Promise<void> { }

    async transfer(data: TransferDef): Promise<TransferResp> {
        // TODO
        throw new Error('Unimplemented!');
    }

    async getBalance(addresses: string[]): Promise<BalanceResp> {
        // TODO
        throw new Error('Unimplemented!');
    }
}
