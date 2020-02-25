import axios from 'axios';
import { HttpStatus } from '@nestjs/common';

export class BaseAction {
    async notify(retry: number = 5): Promise<boolean> {
        let counter = 0;
        const notifyUrl = await this.getNotificationURL();
        const notifyData = await this.getNotificationBody();
        let notifyResult: boolean = false;
        while (true) {
            if (counter > retry) {
                break;
            }
            const success = await this.post(notifyUrl, notifyData);
            counter++;
            if (success) {
                notifyResult = true;
                break;
            }
        }
        if (!notifyResult) {
            console.log('[NotifyFailure]: ', notifyUrl, JSON.stringify(notifyData, null, 2));
        }

        return notifyResult;
    }

    async getNotificationURL(): Promise<string> {
        throw new Error('implemented by subclass');
    }

    async getNotificationBody(): Promise<Object> {
        throw new Error('implemented by subclass');
    }

    async post(url: string, data: Object): Promise<boolean> {
        const result = await axios.post(url, data, {
            timeout: 10 * 1000
        });

        if (result.status === HttpStatus.OK ||
            result.status === HttpStatus.CREATED ||
            result.status === HttpStatus.ACCEPTED) {
            return true;
        }

        return false;
    }
}