import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Notification } from './types/notification';
import {
    buildBtcTransactionNotification,
    buildBtcBalanceNotification,
    buildEthTransactionNotification,
    buildEthBalanceNotification
} from './types/notification';
import { BtcTransactionNotification } from './types/bitcoin-transaction.notification';
import { EthTransactionNotification } from './types/ethereum-transaction.notification';
import { BtcBalanceNotification } from './types/bitcoin-balance.notification';
import { EthBalanceNotification } from './types/ethereum-balance.notification';

const TICK_TIMEOUT = 200;
const TICK_IDLE = 2 * 1000;

@Injectable()
export class NotifierService implements OnModuleInit, OnModuleDestroy {
    private notifyProvider?: ChildProcess;
    private _cachedNotifications: Notification[];
    constructor() {
        this.onSubProcessError = this.onSubProcessError.bind(this);
        this.onSubProcessClose = this.onSubProcessClose.bind(this);
        this.onSubProcessExit = this.onSubProcessExit.bind(this);
        this.onSubProcessDisconnect = this.onSubProcessDisconnect.bind(this);
        this.onSubProcessMessage = this.onSubProcessMessage.bind(this);

        this._tick = this._tick.bind(this);
        this._cachedNotifications = [];

        // TEST
        // setTimeout(() => {
        //     this._cachedNotifications.push(buildBtcTransactionNotification({
        //         url: 'http://192.168.2.1/'
        //     }));
        // }, 3 * 1000);

    }

    async addBtcTransactionNotification(
        data: BtcTransactionNotification
    ): Promise<void> {
        const notification = buildBtcTransactionNotification(data);
        this._cachedNotifications.push(notification);
    }

    async addEthTransactionNotification(
        data: EthTransactionNotification
    ): Promise<void> {
        const notification = buildEthTransactionNotification(data);
        this._cachedNotifications.push(notification);
    }

    async addBtcBalanceNotification(
        data: BtcBalanceNotification
    ): Promise<void> {
        const notification = buildBtcBalanceNotification(data);
        this._cachedNotifications.push(notification);
    }

    async addEthBalanceNotification(
        data: EthBalanceNotification
    ): Promise<void> {
        const notification = buildEthBalanceNotification(data);
        this._cachedNotifications.push(notification);
    }

    async onModuleInit(): Promise<void> {
        const subprocessPath = path.resolve(path.join(__dirname, 'sub_process', 'index.js'));
        this.notifyProvider = fork(subprocessPath);

        this.notifyProvider.on('error', this.onSubProcessError);
        this.notifyProvider.on('close', this.onSubProcessClose);
        this.notifyProvider.on('exit', this.onSubProcessExit);
        this.notifyProvider.on('disconnect', this.onSubProcessDisconnect);
        this.notifyProvider.on('message', this.onSubProcessMessage);

        setTimeout(this._tick, TICK_TIMEOUT);
    }

    async onModuleDestroy(): Promise<void> {
        if (this.notifyProvider) {
            this.notifyProvider.kill("SIGTERM")
        }
    }

    private onSubProcessExit(code: number, signal: string) {
        console.log('notify.Provider event("exit")', `code(${code}) signal(${signal})`);
        this.notifyProvider = null;
    }

    private onSubProcessError(error: Error) {
        console.log('notify.Provider event("error")', `${error}`);
        this.notifyProvider = null;
    }

    private onSubProcessClose(code: number, signal: string) {
        console.log('notify.Provider event("close")', `code(${code}) signal(${signal})`);
        this.notifyProvider = null;
    }

    private onSubProcessMessage(message: Object, sendHandle: Object | undefined) {
        console.log('notify.Provider event("message")', `message(${message})`);
    }

    private onSubProcessDisconnect() {
        console.log('notify.Provider event("disconnect")');
        this.notifyProvider = null;
    }

    private _tick() {
        if (this._cachedNotifications.length > 0) {
            const [notification] = this._cachedNotifications.splice(0, 1);
            this.notifyProvider.send(notification, () => {
                setTimeout(this._tick, TICK_TIMEOUT);
            });
            return;
        }

        // Idle
        setTimeout(this._tick, TICK_IDLE);
    }
}
