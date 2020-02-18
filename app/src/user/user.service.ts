import { Injectable } from '@nestjs/common';

import { UserbasicsCurd } from '../curds/userbasics-curd';
import { UsersCurd } from '../curds/users-curd';
import { SecretsCurd } from '../curds/secrets-curd';
import { WebhooksCurd } from '../curds/webhooks-curd';
import { BtcaccountsCurd } from '../curds/btcaccounts-curd';
import { EthaccountsCurd } from '../curds/ethaccounts-curd';

@Injectable()
export class UserService {
    constructor(
        private readonly userbasicsCurd: UserbasicsCurd,
        private readonly usersCurd: UsersCurd,
        private readonly secretsCurd: SecretsCurd,
        private readonly webhooksCurd: WebhooksCurd,
        private readonly btcaccountsCurd: BtcaccountsCurd,
        private readonly ethaccountsCurd: EthaccountsCurd
    ) { }


}
