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

    async addSuccessRecord(
        token: Token,
        client: string,
        account: string,
        recipient: string,
        amount: string,
        serial: number,
        txId: string
    ) {
        const recordIns = new RequestRecord();
        recordIns.client = client;
        recordIns.account = account;
        recordIns.receipentId = recipient;
        recordIns.amount = amount;
        recordIns.token = token;
        recordIns.serial = serial;
        recordIns.timestamp = Date.now();
        recordIns.txId = txId;
        recordIns.status = RequestRecordStatus.SUCCESS;

        await this.requestRecordRepo.save(recordIns);
    }

    async addFailureRecord(
        token: Token,
        client: string,
        account: string,
        recipient: string,
        amount: string,
        serial: number,
        error: string
    ) {
        const recordIns = new RequestRecord();
        recordIns.client = client;
        recordIns.account = account;
        recordIns.receipentId = recipient;
        recordIns.amount = amount;
        recordIns.token = token;
        recordIns.serial = serial;
        recordIns.timestamp = Date.now();
        recordIns.error = error;
        recordIns.status = RequestRecordStatus.FAILURE;

        await this.requestRecordRepo.save(recordIns);
    }

    async addExceptionRecord(
        token: Token,
        client: string,
        account: string,
        recipient: string,
        amount: string,
        error: string
    ) {
        const recordIns = new RequestRecord();
        recordIns.client = client;
        recordIns.account = account;
        recordIns.receipentId = recipient;
        recordIns.amount = amount;
        recordIns.token = token;
        recordIns.timestamp = Date.now();
        recordIns.error = error;
        recordIns.status = RequestRecordStatus.EXCEPTION;

        await this.requestRecordRepo.save(recordIns);
    }

    async transactionConfirmed(
        token: Token,
        txId: string,
    ) {
        const find = await this.requestRecordRepo.findOne({
            token,
            txId
        });
        if (!find) {
            return;
        }

        find.confirmed = true;
        await this.requestRecordRepo.save(find);
    }
}