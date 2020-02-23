import { Injectable } from '@nestjs/common';

import { IServiceProvider } from '../../blockchain/common/service.provider';
import { BalanceDef, Transaction, EthereumTransaction } from '../../blockchain/common/types';
import { IService } from '../../blockchain/common/service.interface';
import { TransactionRole } from '../../libs/libs.types';
import { IServiceGetter } from '../../libs/interfaces/iservice-getter.interface';
import { ITransactionGetter } from '../../libs/interfaces/itransaction-getter.interface';
import { IUserChanger } from '../../libs/interfaces/iuser-changed.interface';
import { EthaccountsCurd } from '../../curds/ethaccounts-curd';
import { EthtransactionsCurd } from '../../curds/ethtransactions-curd';
import { EthService } from '../../blockchain/eth/eth.service';

@Injectable()
export class EthProvider
    implements IServiceProvider, IServiceGetter, ITransactionGetter, IUserChanger {
    private _service: IService;
    private _onDirtyCallback: () => Promise<void>;
    private _cachedAddresses?: string[] = null;
    constructor(
        private readonly ethAccountCurd: EthaccountsCurd,
        private readonly ethTransactionCurd: EthtransactionsCurd,
        private readonly ethService: EthService
    ) {
        // this._service = this.ethService;
        // this._service.setProvider(this);

        if (this.ethService instanceof IService) {
            this._service = this.ethService;
            this._service.setProvider(this);
        }
    }

    /**
     * @note override IServiceGetter 
     */
    get Service(): IService {
        return this._service;
    }

    /**
     * @note override ITransactionGetter->getTransactions
     */
    async getTransactions(uid: string, mode: TransactionRole): Promise<Transaction[]> {
        const findRepo = await this.ethAccountCurd.findByUid(uid);
        if (!findRepo) {
            throw new Error(`User(${uid}) not exists!`);
        }

        let cond: any = null;
        if (mode === TransactionRole.SENDER) {
            cond = { sender: findRepo.address };
        } else if (mode === TransactionRole.RECIPIENT) {
            cond = { recipient: findRepo.address };
        } else {
            cond = {
                where: [
                    { sender: findRepo.address },
                    { recipient: findRepo.address }
                ]
            };
        }
        cond.order = { blockHeight: 'DESC', txId: 'DESC' }

        const validTrRepos = await this.ethTransactionCurd.find(cond);
        const result: Transaction[] = [];
        for (const repo of validTrRepos) {
            const tr = new EthereumTransaction();
            tr.type = 'ethereum';
            tr.sub = 'eth';
            tr.txId = repo.txId;
            tr.blockHeight = repo.blockHeight;
            tr.sender = repo.sender;
            tr.recipient = repo.recipient;
            tr.amount = repo.amount;

            result.push(tr);
        }
        return result;
    }

    /**
     * @note override ITransactionGetter->getTransactionById
     */
    async getTransactionById(txId: string): Promise<Transaction> {
        const findRepo = await this.ethTransactionCurd.findOne({ txId });
        if (!findRepo) {
            throw new Error(`TxId(${txId}) not exists!`);
        }

        const result = new EthereumTransaction();
        result.type = 'ethereum';
        result.sub = 'eth';
        result.txId = findRepo.txId;
        result.blockHeight = findRepo.blockHeight;
        result.sender = findRepo.sender;
        result.recipient = findRepo.recipient;
        result.amount = findRepo.amount;

        return result;
    }

    /**
     * @note override IUserChanger->onUserChanged
     */
    async onUserChanged(): Promise<void> {
        const findRepos = await this.ethAccountCurd.find({});
        const newValidAddresses: string[] = [];
        for (const repo of findRepos) {
            newValidAddresses.push(repo.address);
        }
        this._cachedAddresses = newValidAddresses;
        this._onDirtyCallback && await this._onDirtyCallback();
    }

    async getValidAddresses(): Promise<string[]> {
        if (this._cachedAddresses == null) {
            const findRepos = await this.ethAccountCurd.find({});
            const validAddresses: string[] = [];
            for (const repo of findRepos) {
                validAddresses.push(repo.address);
            }
            this._cachedAddresses = validAddresses;
        }
        return this._cachedAddresses;
    }

    async setDirtyFn(fn: () => Promise<void>): Promise<void> {
        this._onDirtyCallback = fn;
    }

    async onBalanceChanged(newBalances: BalanceDef[]): Promise<void> {
        for (const a of newBalances) {
            const { address, balance } = a;
            await this.ethAccountCurd.updateBalanceByAddress(address, balance);
            // maybe notify???
        }
    }

    async onNewTransaction(newTrs: Transaction[]): Promise<void> {
        for (const t of newTrs) {
            if (t.type !== 'ethereum' || t.sub !== 'eth') {
                //TODO: Unsupported!!
                continue;
            }

            const {
                txId,
                blockHeight,
                blockTime,
                sender,
                recipient,
                amount
            } = t;
            await this.ethTransactionCurd.add(
                txId,
                blockHeight,
                blockTime,
                sender,
                recipient,
                amount
            );
            //TODO: maybe notify???
        }
    }
}
