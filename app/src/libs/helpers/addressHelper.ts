import mavalidator = require('multicoin-address-validator');
import { AppConfig } from '../../config/app.config';

export async function addressIsBitcoin(address: string): Promise<boolean> {
    if (AppConfig.mainnet) {
        return mavalidator.validate(address, 'btc');
    } else {
        return mavalidator.validate(address, 'btc', 'testnet');
    }
}

export async function addressIsEthereum(address: string): Promise<boolean> {
    return mavalidator.validate(address, 'eth');
}