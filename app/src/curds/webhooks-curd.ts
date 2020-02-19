import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Webhook } from '../entities/webhooks.entity';

@Injectable()
export class WebhooksCurd {
    constructor(
        @InjectRepository(Webhook) private readonly webhookRepo: Repository<Webhook>
    ) { }

    async add(uid: string, url: string): Promise<Webhook> {
        // TODO: Check same uid and url;
        const repo = new Webhook();
        repo.uid = uid;
        repo.url = url;

        const saveRepo = await this.webhookRepo.save(repo);
        return saveRepo;
    }

    async del(id: string): Promise<boolean> {
        const findRepo = await this.webhookRepo.findOne({ id });
        if (findRepo) {
            await this.webhookRepo.remove(findRepo);
            return true;
        }
        return false;
    }

    async delAll(uid: string): Promise<boolean> {
        const findRepos = await this.webhookRepo.find({ uid });
        if (findRepos) {
            await this.webhookRepo.remove(findRepos);
            return true;
        }
        return false;
    }

    async find(cond: any): Promise<Webhook[]> {
        const findRepos = await this.webhookRepo.find(cond);

        return findRepos || [];
    }

    async findOne(cond: any): Promise<Webhook> {
        const findRepo = await this.webhookRepo.findOne(cond);

        return findRepo || null;
    }

    async findById(id: string): Promise<Webhook> {
        const findRepo = await this.findOne({ id });

        return findRepo;
    }

    async findByUid(uid: string): Promise<Webhook[]> {
        const findRepos = await this.find({ uid });

        return findRepos || [];
    }
}
