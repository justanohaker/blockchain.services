import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ETHTransaction } from '../entities/eth_trs.entity';

@Injectable()
export class EthtransactionsCurd {
    constructor(
        @InjectRepository(ETHTransaction) private readonly ethTrsRepo: Repository<ETHTransaction>
    ) { }

    async add(
        txId: string,
        blockHeight: number,
        nonce: number,
        sender: string,
        recipient: string,
        amount: string
    ): Promise<boolean> {
        const checkTxId = await this.hasTxId(txId);
        if (checkTxId) {
            return false;
        }

        const repo = new ETHTransaction();
        repo.txId = txId;
        repo.blockHeight = blockHeight;
        repo.nonce = nonce;
        repo.sender = sender;
        repo.recipient = recipient;
        repo.amount = amount;
        await this.ethTrsRepo.save(repo);

        // TODO: maybe return something??
        return true;
    }

    async find(cond: any): Promise<ETHTransaction[]> {
        return await this.ethTrsRepo.find(cond);
    }

    async findOne(cond: any): Promise<ETHTransaction> {
        return await this.ethTrsRepo.findOne(cond);
    }

    async hasTxId(txId: string): Promise<boolean> {
        const findRepo = await this.findOne({ txId });
        return findRepo ? true : false;
    }
}
