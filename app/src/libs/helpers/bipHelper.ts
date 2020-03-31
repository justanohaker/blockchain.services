import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { fromSeed, fromBase58, BIP32Interface } from 'bip32';
import { networks, payments } from 'bitcoinjs-lib';
import { importPublic, publicToAddress } from 'ethereumjs-util';
import { utils } from 'ethers';
import { Token } from '../types';
import { AppConfig } from '../../config/app.config';

const cDerivePath_Bitcoin = AppConfig.mainnet ? `m/44'/0'/0'/0/0` : `m/44'/1'/0'/0/0`;
const cDerivePath_Ethereum = `m/44'/60'/0'/0/0`;
const cDerivePath_OmniUsdt = cDerivePath_Bitcoin;
const cDerivePath_Erc20Usdt = cDerivePath_Ethereum;

export async function bipNewMnemonic(strength: number = 128): Promise<string> {
    return generateMnemonic(strength)
}

export async function bipMnemonicToSeed(
    mnemonic: string,
    password: string = ''
): Promise<Buffer> {
    return mnemonicToSeedSync(mnemonic, password)
}

export async function bipPrivpubFromSeed(
    seed: Buffer,
    token: Token,
) {
    let b32: BIP32Interface = null;
    switch (token) {
        case Token.BITCOIN: {
            if (AppConfig.mainnet) {
                const tmp = fromSeed(seed, networks.bitcoin);
                b32 = tmp.derivePath(cDerivePath_Bitcoin);
            } else {
                const tmp = fromSeed(seed, networks.testnet);
                b32 = tmp.derivePath(cDerivePath_Bitcoin);
            }
            break;
        }
        case Token.OMNI_USDT: {
            if (AppConfig.mainnet) {
                const tmp = fromSeed(seed, networks.bitcoin);
                b32 = tmp.derivePath(cDerivePath_OmniUsdt);
            } else {
                const tmp = fromSeed(seed, networks.testnet);
                b32 = tmp.derivePath(cDerivePath_OmniUsdt);
            }
            break;
        }
        case Token.ETHEREUM: {
            const tmp = fromSeed(seed, networks.bitcoin);
            b32 = tmp.derivePath(cDerivePath_Ethereum);
            break;
        }
        case Token.ERC20_USDT: {
            const tmp = fromSeed(seed, networks.bitcoin);
            b32 = tmp.derivePath(cDerivePath_Erc20Usdt);
            break;
        }
    }

    return {
        priv: b32.privateKey.toString('hex'),
        pub: b32.publicKey.toString('hex'),
        xpriv: b32.toBase58(),
        xpub: b32.neutered().toBase58(),
        wif: b32.toWIF()
    };
}

export async function bipPrivpubFromMnemonic(
    mnemonic: string,
    token: Token,
    password: string = '',
) {
    const seed = await bipMnemonicToSeed(mnemonic, password);
    return await bipPrivpubFromSeed(seed, token);
}

async function bipFromBase58(xpriv: string, token: Token) {
    let b32: BIP32Interface = null;
    switch (token) {
        case Token.BITCOIN:
        case Token.OMNI_USDT: {
            if (AppConfig.mainnet) {
                b32 = fromBase58(xpriv, networks.bitcoin);
            } else {
                b32 = fromBase58(xpriv, networks.testnet);
            }
            break;
        }
        case Token.ETHEREUM:
        case Token.ERC20_USDT: {
            b32 = fromBase58(xpriv, networks.bitcoin);
            break;
        }
        // END TODO
        default:
            throw new Error(`Unsupported Token(${token})`);
    }
    return b32;
}

export async function bipHexPrivFromxPriv(xpriv: string, token: Token) {
    const b32 = await bipFromBase58(xpriv, token);
    return b32.privateKey.toString('hex');
}

export async function bipWIFFromxPriv(xpriv: string, token: Token) {
    const b32 = await bipFromBase58(xpriv, token);
    return b32.toWIF();
}

export async function bipGetAddressFromXPub(xpub: string, token: Token) {
    const b32 = await bipFromBase58(xpub, token);
    const pubkey = b32.publicKey;

    switch (token) {
        case Token.BITCOIN:
        case Token.OMNI_USDT: {
            if (AppConfig.mainnet) {
                const p2pkh = payments.p2pkh({ pubkey, network: networks.bitcoin });
                return p2pkh.address;
            } else {
                const p2pkh = payments.p2pkh({ pubkey, network: networks.testnet });
                return p2pkh.address;
            }
        }
        case Token.ETHEREUM:
        case Token.ERC20_USDT: {
            const ethereumPubkey = importPublic(pubkey);
            const addr = publicToAddress(ethereumPubkey);
            return utils.getAddress('0x' + addr.toString('hex'));
        }
        default: break;
    }
    throw new Error(`Unsupported Token(${token})`);
}