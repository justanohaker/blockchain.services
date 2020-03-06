import { Injectable } from '@nestjs/common';
import { IChainProvider } from './provider.interface';
import { User } from '../../../models/users.model';

@Injectable()
export class NullProvider implements IChainProvider {
    constructor() { }

    async addAccount(user: User, secret: string): Promise<any> {
        throw new Error('parameter error!');
    }

    async getAddress(): Promise<string> {
        throw new Error('parameter error!');
    }

    async getBalance(): Promise<string> {
        throw new Error('parameter error!');
    }

    async getTransactions(): Promise<string[]> {
        throw new Error('parameter error!');
    }

    async getTransaction(): Promise<any> {
        throw new Error('parameter error!');
    }

    async transfer(): Promise<string> {
        throw new Error('parameter error!');
    }

    async onNewAccount(accounts: string[]): Promise<void> {
        // nothing to do;
    }
}
