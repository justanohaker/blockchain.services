import axios from 'axios';
import { InternalMessageDef, InternalMessageType, PushData } from "../types";
import { HttpStatus } from '@nestjs/common';

const WORK: number = 400;
const IDLE: number = 2 * 1000;

type Retry = {
    times: number;
    internals: number[];
}

const PUSH_TIMES: number = 5;
const PUSH_INTERVALS: number[] = [1 * 1000, 5 * 1000, 10 * 1000, 20 * 1000];

class Pusher {
    private readonly _pushDatas: PushData[];
    private _pushTimer: NodeJS.Timeout;
    constructor() {
        this._pushDatas = [];

        this._pushDispatcher = this._pushDispatcher.bind(this);
        this._pushTimer = setTimeout(this._pushDispatcher, IDLE);
    }

    onDestroy() {
        if (this._pushTimer) {
            clearTimeout(this._pushTimer);
            this._pushTimer = null;
        }
    }


    addPushData(data: PushData): void {
        this._pushDatas.push(data);
    }

    private _pushDispatcher() {
        this._pushTimer = null;
        if (this._pushDatas.length <= 0) {
            this._pushTimer = setTimeout(this._pushDispatcher, IDLE);
            return;
        }

        const [pushData] = this._pushDatas.splice(0, 1);
        const self = this;
        const call = async function (): Promise<boolean> {
            return await self.post(pushData.url, pushData.data);
        }

        this.retry({ times: PUSH_TIMES, internals: PUSH_INTERVALS }, call)
            .then((success: boolean) => {
                if (!success) {
                    console.log(`[Pusher.Internal] PushFailure ${pushData.url}`);
                }
                this._pushTimer = setTimeout(this._pushDispatcher, WORK);
            })
            .catch(error => {
                // TODO: error handle
                console.log(`[Pusher.Internal] PushError ${error}`);
                this._pushTimer = setTimeout(this._pushDispatcher, WORK);
            });
    }

    private async retry(retryData: Retry, func: () => Promise<boolean>) {
        for (let i = 0; i < retryData.times; i++) {
            try {
                if (await func()) {
                    return true;
                }
            } catch (error) { }

            await this.delay(retryData.internals[i % retryData.internals.length]);
        }

        return false;
    }

    private async post(url, data): Promise<boolean> {
        // TODO: need timeout time??
        const postResp = await axios.post(url, data == null ? {} : data);
        if (postResp.status === HttpStatus.OK ||
            postResp.status === HttpStatus.ACCEPTED ||
            postResp.status === HttpStatus.CREATED) {
            return true;
        }
        return false;
    }

    private async delay(internal: number): Promise<void> {
        return new Promise((resolve, reject) => {
            void (reject);
            setTimeout(() => { resolve(); }, internal);
        });
    }
}

async function main() {
    const pusher = new Pusher();

    process.on('message', (message: any, sendHandle: any) => {
        const { type, data } = message as InternalMessageDef;
        switch (type) {
            case InternalMessageType.PUSH:
                pusher.addPushData(data as PushData);
                break;
            default:
                break;
        }
    });

    process.on('exit', (code: number) => {
        console.log('[Pusher.Intenal] exit');
    });

    process.on('uncaughtException', (error: Error) => {
        console.log('[Pusher.Intenal] uncaughtException:', error);
    });

    process.on('unhandledRejection', (reason: Object, promise: Promise<any>) => {
        console.log('[Pusher.Intenal]unhandledRejection:', reason);
    });

    process.on('rejectionHandled', (promise: Promise<any>) => {
        console.log('[Pusher.Intenal] rejectionHandled');
    });
}

main()
    .catch(error => {
        console.log(`[Pusher.Intenal] Error: ${error}`);
    });