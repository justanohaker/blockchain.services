import { DespositDto } from "../wallet.dto";
import { User } from "src/models/users.model";
import { TxDef } from "./types";

export interface IChainProvider {
    addAccount(
        userRepo: User,
        secret: string
    ): Promise<any>;

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
    ): Promise<TxDef>;

    transfer(
        clientId: string,
        account: string,
        despositDto: DespositDto
    ): Promise<string>;

    onNewAccount(
        accounts: string[]
    ): Promise<void>;
}