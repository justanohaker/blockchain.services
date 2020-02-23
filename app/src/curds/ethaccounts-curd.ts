import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ETHAccount } from '../entities/eth_accounts.entity';

@Injectable()
export class EthaccountsCurd {
    constructor(
        @InjectRepository(ETHAccount) private readonly ethaccountRepo: Repository<ETHAccount>
    ) { }

    async add(uid: string, priv: string, pub: string, address: string): Promise<ETHAccount> {
        const findRepo = await this.findByUid(uid);
        if (findRepo) {
            throw new Error();
        }

        const repo = new ETHAccount();
        repo.uid = uid;
        repo.priv = priv;
        repo.pub = pub;
        repo.address = address;
        repo.balance = '0';
        const saveResult = await this.ethaccountRepo.save(repo);
        return saveResult;
    }

    async updateBalanceByAddress(address: string, newBalance: string): Promise<ETHAccount> {
        const findRepo = await this.ethaccountRepo.findOne({ address });
        if (!findRepo) {
            return null;
        }

        await this.ethaccountRepo.update({ address }, { balance: newBalance });
        // return await this.ethaccountRepo.findOne({ address });
        findRepo.balance = newBalance;
        return findRepo;
    }

    async find(cond: any): Promise<ETHAccount[]> {
        const findRepos = await this.ethaccountRepo.find(cond);

        return findRepos || [];
    }

    async findOne(cond: any): Promise<ETHAccount> {
        const findRepo = await this.ethaccountRepo.findOne(cond);

        return findRepo || null;
    }

    async findByUid(uid: string): Promise<ETHAccount> {
        const findRepo = await this.findOne({ uid });

        return findRepo;
    }
}
