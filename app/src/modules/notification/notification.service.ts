import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../../models/user.webhook.model';
import { RespErrorCode } from '../../libs/responseHelper';
import { AddWebHookDto, AddRespDto, ListRespDto, GetRespDto, DelRespDto } from './notification.dto';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Webhook) private readonly webhookRepo: Repository<Webhook>
    ) { }

    async add(
        clientId: string,
        addWebHookDto: AddWebHookDto
    ): Promise<AddRespDto> {
        const result: AddRespDto = { success: true };
        const findRepo = await this.webhookRepo.findOne({ clientId, postUrl: addWebHookDto.url });
        if (findRepo) {
            result.success = false;
            result.errorCode = RespErrorCode.BAD_REQUEST;
            result.error = `postUrl(${addWebHookDto.url}) exists!`;
            return result;
        }

        const webhookIns = new Webhook();
        webhookIns.clientId = clientId;
        webhookIns.postUrl = addWebHookDto.url;
        const repo = await this.webhookRepo.save(webhookIns);
        result.id = repo.id;
        return result;
    }

    async list(
        clientId: string,
    ): Promise<ListRespDto> {
        const result: ListRespDto = { success: true };
        const founds = await this.webhookRepo.find({ clientId });
        result.ids = [];
        for (const found of founds) {
            result.ids.push(found.id);
        }

        return result;
    }

    async get(
        clientId: string,
        id: string
    ): Promise<GetRespDto> {
        const result: GetRespDto = { success: true };
        const repo = await this.webhookRepo.findOne({ clientId, id });
        if (!repo) {
            result.success = false;
            result.error = `WebHook not exist with ID(${id})`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        result.id = repo.id;
        result.postUrl = repo.postUrl;
        return result;
    }

    async del(
        clientId: string,
        id: string
    ): Promise<DelRespDto> {
        const result: DelRespDto = { success: true };
        const repo = await this.webhookRepo.findOne({ clientId, id });
        if (!repo) {
            result.success = false;
            result.error = `WebHook not exist with ID(${id})`;
            result.errorCode = RespErrorCode.BAD_REQUEST;
            return result;
        }

        await this.webhookRepo.remove(repo);

        return result;
    }
}
