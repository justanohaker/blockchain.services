import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ChildProcess, fork } from 'child_process';
import * as path from 'path';
import { PushData, InternalMessageType } from './types';

const IDLE = 2 * 1000;
const WORK = 400;

@Injectable()
export class PusherService implements OnModuleInit, OnModuleDestroy {
    private _pusher?: ChildProcess;
    private _pushData: PushData[];
    private _timer?: NodeJS.Timeout;
    constructor() {
        this._pushData = [];

        this.onPusherClose = this.onPusherClose.bind(this);
        this.onPusherError = this.onPusherError.bind(this);
        this.onPusherExit = this.onPusherExit.bind(this);
        this.onPusherMessage = this.onPusherMessage.bind(this);
        this.onPusherDisconnect = this.onPusherDisconnect.bind(this);

        this.dispatcher = this.dispatcher.bind(this);
    }

    async addPush(url: string, data: any): Promise<void> {
        // TODO: Check url and data valid
        this._pushData.push({ url, data });
    }

    // implement OnModuleInit
    async onModuleInit(): Promise<void> {
        const pusherPath = path.resolve(path.join(__dirname, 'internals', 'index.js'));
        this._pusher = fork(pusherPath);

        this._pusher.on('error', this.onPusherError);
        this._pusher.on('close', this.onPusherClose);
        this._pusher.on('exit', this.onPusherExit);
        this._pusher.on('disconnect', this.onPusherDisconnect);
        this._pusher.on('message', this.onPusherMessage);


        this._timer = setTimeout(this.dispatcher, IDLE);
    }

    // implement OnModuleDestroy
    async onModuleDestroy(): Promise<void> {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    // callbacks
    private onPusherExit(code: number, signal: string) {
        console.log('[PusherService] OnExit', `code(${code}) signal(${signal})`);
        this._pusher = null;
    }

    private onPusherError(error: Error) {
        console.log('[PusherService] OnError', `${error}`);
        this._pusher = null;
    }

    private onPusherClose(code: number, signal: string) {
        console.log('[PusherService] OnClose', `code(${code}) signal(${signal})`);
        this._pusher = null;
    }

    private onPusherMessage(message: Object, sendHandle: Object | undefined) {
        console.log('[PusherService] OnMessage', `message(${message})`);
    }

    private onPusherDisconnect() {
        console.log('[PusherService] OnDisconnect');
        this._pusher = null;
    }

    // dispacher
    private dispatcher() {
        if (this._pushData.length <= 0) {
            this._timer = setTimeout(this.dispatcher, IDLE);
            return;
        }

        const [pushData] = this._pushData.splice(0, 1);
        this._pusher.send({
            type: InternalMessageType.PUSH,
            data: pushData
        }, (error) => {
            // TODO: needs??
            if (error) {
                this._pushData.push(pushData);
            }
            this._timer = setTimeout(this.dispatcher, WORK);
        });
    }
}
