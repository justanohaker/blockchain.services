import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BTCvIn, BTCvOut } from '../blockchain/common/types';
import { BTCTransaction } from '../entities/btc_trs.entity';
import { BTCTransactionIndex } from '../entities/btc_trs_index.entity';

@Injectable()
export class BtctransactionsCurd {
    constructor(
        @InjectRepository(BTCTransaction) private readonly btcTrsRepo: Repository<BTCTransaction>,
        @InjectRepository(BTCTransactionIndex) private readonly btcTrsIndexRepo: Repository<BTCTransactionIndex>
    ) { }

    async add(
        txId: string,
        blockHeight: number,
        blockTime: number,
        vIns: Array<BTCvIn>,
        vOuts: Array<BTCvOut>
    ) {
        const checkTxId = await this.hasTxId(txId);
        if (checkTxId) {
            return;
        }

        const repo = new BTCTransaction();
        repo.txId = txId;
        repo.blockHeight = blockHeight;
        repo.blockTime = blockTime;
        repo.vIns = vIns;
        repo.vOuts = vOuts;
        await this.btcTrsRepo.save(repo);

        for (const vin of vIns) {
            const index = new BTCTransactionIndex();
            index.address = vin.address;
            index.txId = txId;
            index.isSender = true;
            await this.btcTrsIndexRepo.save(index);
        }

        for (const vout of vOuts) {
            const index = new BTCTransactionIndex();
            index.address = vout.address;
            index.txId = txId;
            index.isSender = false;
            await this.btcTrsIndexRepo.save(index);
        }
        // TODO: maybe return somethings??
    }

    async find(cond: any): Promise<BTCTransaction[]> {
        return await this.btcTrsRepo.find(cond);
    }

    async findOne(cond: any): Promise<BTCTransaction> {
        return await this.btcTrsRepo.findOne(cond);
    }

    async hasTxId(txId: string): Promise<boolean> {
        const findRepo = await this.findOne({ txId });
        return findRepo ? true : false;
    }

}
