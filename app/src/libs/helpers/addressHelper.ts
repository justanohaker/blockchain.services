import mavalidator = require('multicoin-address-validator');

export async function addressIsBitcoin(address: string): Promise<boolean> {
    return mavalidator.validate(address, 'btc', 'testnet');
}

export async function addressIsEthereum(address: string): Promise<boolean> {
    return mavalidator.validate(address, 'eth');
}