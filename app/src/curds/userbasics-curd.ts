import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserBasic } from '../entities/user_basic.entity';

@Injectable()
export class UserbasicsCurd {
    constructor(
        @InjectRepository(UserBasic) private readonly userbasicRepo: Repository<UserBasic>
    ) { }

    async add(uid: string, username: string, password: string): Promise<UserBasic> {
        const checkUid = await this.getByUID(uid);
        if (checkUid) {
            throw new Error("");
        }
        const checkUserName = await this.getByUserName(username);
        if (checkUserName) {
            throw new Error("");
        }

        const repo = new UserBasic();
        repo.uid = uid;
        repo.username = username;
        repo.password = password;

        const saveResult = await this.userbasicRepo.save(repo);
        return saveResult;
    }

    async all(): Promise<UserBasic[]> {
        const findRepos = await this.userbasicRepo.find();

        return findRepos || [];
    }

    async find(cond: any): Promise<UserBasic[]> {
        const findRepos = await this.userbasicRepo.find(cond);

        return findRepos || [];
    }

    async findOne(cond: any): Promise<UserBasic> {
        const findRepo = await this.userbasicRepo.findOne(cond);

        return findRepo || null;
    }

    // specified
    async getByUID(uid: string): Promise<UserBasic> {
        const findRepo = await this.findOne({ uid });

        return findRepo;
    }

    async getById(id: string): Promise<UserBasic> {
        const findRepo = await this.findOne({ id });

        return findRepo;
    }

    async getByUserName(username: string): Promise<UserBasic> {
        const findRepo = await this.findOne({ username });

        return findRepo;
    }


    // TODO: Modify or Update ??
}
