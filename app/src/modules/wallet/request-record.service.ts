import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestRecord, RequestRecordStatus } from '../../models/request_records.model';
import { Token } from '../../libs/types';

@Injectable()
export class RequestRecordService {
    constructor(
        @InjectRepository(RequestRecord) private readonly requestRecordRepo: Repository<RequestRecord>
    ) { }

    async addRequestRecordWithFee(
        ip: string,
        route: string,
        token: Token,
        clientId: string,
        accountId: string,
        recipientId: string,
        amount: string,
        fee: string,
        businessId: string,
        callbackURI: string
    ) {
        const recordIns = new RequestRecord();
        recordIns.ip = ip;
        recordIns.route = route;
        recordIns.clientId = clientId;
        recordIns.accountId = accountId;
        recordIns.recipientId = recipientId;
        recordIns.amount = amount;
        recordIns.fee = fee;
        recordIns.token = token;
        recordIns.timestamp = Date.now();
        recordIns.businessId = businessId;
        recordIns.callbackURI = callbackURI;
        recordIns.status = RequestRecordStatus.Init;

        const result = await this.requestRecordRepo.save(recordIns);
        return result.id;
    }

    async addRequestRecordWithFeePriority(
        ip: string,
        route: string,
        token: Token,
        clientId: string,
        accountId: string,
        recipientId: string,
        amount: string,
        feePriority: string,
        businessId: string,
        callbackURI: string,
    ) {
        const recordIns = new RequestRecord();
        recordIns.ip = ip;
        recordIns.route = route;
        recordIns.clientId = clientId;
        recordIns.accountId = accountId;
        recordIns.recipientId = recipientId;
        recordIns.amount = amount;
        recordIns.feePriority = feePriority;
        recordIns.token = token;
        recordIns.timestamp = Date.now();
        recordIns.businessId = businessId;
        recordIns.callbackURI = callbackURI;
        recordIns.status = RequestRecordStatus.Init;

        const result = await this.requestRecordRepo.save(recordIns);
        return result.id;
    }

    async updateRequestRecordSuccess(
        rowid: string
    ) {
        const recordIns = await this.requestRecordRepo.findOne({ id: rowid });
        if (!recordIns) { return; }
        recordIns.status = RequestRecordStatus.Success;
        await this.requestRecordRepo.save(recordIns);
    }

    async updateRequestRecordFailure(
        rowid: string
    ) {
        const recordIns = await this.requestRecordRepo.findOne({ id: rowid });
        if (!rowid) { return; }
        recordIns.status = RequestRecordStatus.Failure;
        await this.requestRecordRepo.save(recordIns);
    }
}