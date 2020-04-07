import { Injectable } from '@nestjs/common';
import { IChainProvider } from './provider.interface';
import { User } from '../../../models/users.model';
import { Account } from '../../../models/accounts.model';
import { TransferResult, TransferWithCallbackResult } from './types';
import { FeeRangeDef } from 'src/blockchain/common/types';

@Injectable()
export class NullProvider implements IChainProvider {
    constructor() { }

    async addAccount(user: User, secret: string): Promise<Account> {
        void (user);
        void (secret);
        throw new Error('Unsupported.');
    }

    async retrieveAccount(clientId: string, accountId: string): Promise<Account> {
        void (clientId);
        void (accountId);
        throw new Error('Unsupported.');
    }

    async getAddress(): Promise<string> {
        throw new Error('Unsupported.');
    }

    async getBalance(): Promise<string> {
        throw new Error('Unsupported.');
    }

    async getTransactions(): Promise<string[]> {
        throw new Error('Unsupported.');
    }

    async getTransaction(): Promise<any> {
        throw new Error('Unsupported.');
    }

    async getFeeRange(): Promise<FeeRangeDef> {
        throw new Error('Unsupported.');
    }

    async deposit(): Promise<TransferResult> {
        throw new Error('Unsupported.');
    }

    async transfer(): Promise<TransferWithCallbackResult> {
        throw new Error('Unsupported.');
    }

    async onNewAccount(accounts: string[]): Promise<void> {
        // nothing to do;
    }
}
