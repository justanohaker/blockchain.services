import { Injectable } from '@nestjs/common';
import { IChainProvider } from './provider.interface';
import { User } from '../../../models/users.model';
import { Account } from '../../../models/accounts.model';

@Injectable()
export class NullProvider implements IChainProvider {
    constructor() { }

    async addAccount(user: User, secret: string): Promise<Account> {
        void (user);
        void (secret);
        throw new Error('Parameter Error!');
    }

    async retrieveAccount(clientId: string, accountId: string): Promise<Account> {
        void (clientId);
        void (accountId);
        throw new Error('Parameter Error!');
    }

    async getAddress(): Promise<string> {
        throw new Error('Parameter Error!');
    }

    async getBalance(): Promise<string> {
        throw new Error('Parameter Error!');
    }

    async getTransactions(): Promise<string[]> {
        throw new Error('Parameter Error!');
    }

    async getTransaction(): Promise<any> {
        throw new Error('Parameter Error!');
    }

    async transfer(): Promise<string> {
        throw new Error('Parameter Error!');
    }

    async onNewAccount(accounts: string[]): Promise<void> {
        // nothing to do;
    }
}
