import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BTCAccount } from '../entities/btc_accounts.entity';

@Injectable()
export class BtcaccountsCurd {
    constructor(
        @InjectRepository(BTCAccount) private readonly btcaccountRepo: Repository<BTCAccount>
    ) { }

    async add(uid: string, priv: string, pub: string, address: string) {
        const findRepo = await this.findByUid(uid);
        if (findRepo) {
            throw new Error();
        }

        const repo = new BTCAccount();
        repo.uid = uid;
        repo.priv = priv;
        repo.pub = pub;
        repo.address = address;
        repo.balance = '0';
        const saveResult = await this.btcaccountRepo.save(repo);
        return saveResult;
    }

    async updateBalanceByAddress(address: string, newBalance: string): Promise<BTCAccount> {
        const findRepo = await this.btcaccountRepo.findOne({ address });
        if (!findRepo) {
            return null;
        }

        await this.btcaccountRepo.update({ address }, { balance: newBalance });

        // return await this.btcaccountRepo.findOne({address});
        findRepo.balance = newBalance;
        return findRepo;
    }

    async find(cond: any): Promise<BTCAccount[]> {
        const findRepos = await this.btcaccountRepo.find(cond);

        return findRepos || [];
    }

    async findOne(cond: any): Promise<BTCAccount> {
        const findRepo = await this.btcaccountRepo.findOne(cond);

        return findRepo || null;
    }

    async findByUid(uid: string): Promise<BTCAccount> {
        const findRepo = await this.findOne({ uid });

        return findRepo;
    }
}
