import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Secret } from '../entities/secrets.entity';

@Injectable()
export class SecretsCurd {
    constructor(
        @InjectRepository(Secret) private readonly secretRepo: Repository<Secret>
    ) { }


    async add(uid: string, secret: string) {
        const findRepo = await this.findByUid(uid);
        if (findRepo) {
            throw new Error();
        }

        const repo = new Secret();
        repo.uid = uid;
        repo.secret = secret;

        const saveResult = await this.secretRepo.save(repo);
        return saveResult;
    }

    async find(cond: any): Promise<Secret[]> {
        const findRepos = await this.secretRepo.find(cond);
        return findRepos || [];
    }

    async findOne(cond: any): Promise<Secret> {
        const findRepo = await this.secretRepo.findOne(cond);
        return findRepo || null;
    }

    async findByUid(uid: string): Promise<Secret> {
        const findRepo = await this.findOne({ uid });

        return findRepo;
    }
}
