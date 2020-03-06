import { DespositDto } from "../wallet.dto";

export interface IChainProvider {
    getAddress(
        clientId: string,
        accountId: string
    ): Promise<string>;

    getBalance(
        clientId: string,
        accountId: string
    ): Promise<string>;

    getTransactions(
        clientId: string,
        accountId: string
    ): Promise<string[]>;

    getTransaction(
        clientId: string,
        accountId: string,
        txId: string
    ): Promise<any>;

    transfer(
        clientId: string,
        account: string,
        despositDto: DespositDto
    ): Promise<string>;

    onNewAccount(
        accounts: string[]
    ): Promise<void>;
}