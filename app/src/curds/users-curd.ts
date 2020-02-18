import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/users.entity';

class BlockchainBalance {
    constructor(private btc: string, private eth: string) { }

    toJson(): string {
        return JSON.stringify({ btc: this.btc, eth: this.eth });
    }

    fromJson(jsonStr: string): this {
        try {
            const parseResult = JSON.parse(jsonStr);
            // Check btc and eth
            this.btc = parseResult.btc;
            this.eth = parseResult.eth;

        } catch (error) {
            throw error;
        }
        return this;
    }

    get Btc(): string {
        return this.btc;
    }

    set Btc(btc: string) {
        // TODO: Check
        this.btc = btc;
    }

    get Eth(): string {
        return this.eth;
    }

    set Eth(eth: string) {
        // TODO: Check
        this.eth = eth;
    }
}

@Injectable()
export class UsersCurd {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>
    ) { }

    async add(uid: string): Promise<User> {
        const checkUid = await this.userRepo.find({ uid });
        if (checkUid) {
            throw new Error("");
        }

        const repo = new User();
        repo.uid = uid;
        const initBalance = new BlockchainBalance('0', '0');
        repo.balance = initBalance.toJson();

        const saveResult = await this.userRepo.save(repo);
        return saveResult;
    }

    async find(cond: any): Promise<User[]> {
        const findRepos = await this.userRepo.find(cond);

        return findRepos || [];
    }

    async findOne(cond: any): Promise<User> {
        const findRepo = await this.userRepo.findOne(cond);

        return findRepo || null;
    }

    async findByUid(uid: string): Promise<User> {
        const findRepo = await this.findOne({ uid });

        return findRepo;
    }

    // TODO: Update balance 
}   
