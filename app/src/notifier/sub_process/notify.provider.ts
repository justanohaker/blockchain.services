import { NotifyType } from '../types/notification';
import { BaseAction } from './actions/base.action';
import { BtcTransactionAction } from './actions/btc-transaction.action';
import { BtcBalanceAction } from './actions/btc-balance.action';
import { EthTransactionAction } from './actions/eth-transaction.action';
import { EthBalanceAction } from './actions/eth-balance.action';

const TICK_TIMEOUT = 200;
const TICK_IDLE = 2 * 1000;

export class NotifyProvider {
    private actions: BaseAction[];
    constructor() {
        this._tick = this._tick.bind(this);
        this.actions = [];

        setTimeout(this._tick, TICK_TIMEOUT);
    }

    addMessage(message: any): void {
        if (!message || !message.type || typeof (message.type) !== 'string') {
            return;
        }

        console.log('[NotifyMessage]:', message.type);

        switch (message.type) {
            case NotifyType.BtcTransaction: {
                const newAction = new BtcTransactionAction(message.data);
                this.actions.push(newAction);
                break;
            }
            case NotifyType.BtcBalance: {
                const newAction = new BtcBalanceAction(message.data);
                this.actions.push(newAction);
                break;
            }
            case NotifyType.EthTransaction: {
                const newAction = new EthTransactionAction(message.data);
                this.actions.push(newAction);
                break;
            }
            case NotifyType.EthBalance: {
                const newAction = new EthBalanceAction(message.data);
                this.actions.push(newAction);
                break;
            }

            default: {
                console.log('unsupported:', JSON.stringify(message));
                break;
            }
        }
    }

    private _tick() {
        if (this.actions.length > 0) {
            const [action] = this.actions.splice(0, 1);
            action.notify()
                .then((result: boolean) => {
                    // TODO:
                    setTimeout(this._tick, TICK_TIMEOUT);
                })
                .catch(error => {
                    // TODO
                    setTimeout(this._tick, TICK_TIMEOUT);
                });
            return;
        }

        setTimeout(this._tick, TICK_IDLE);
    }

}