import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
import { fromSeed, fromBase58, BIP32Interface } from 'bip32';
import { Network, networks, payments } from 'bitcoinjs-lib';
import { importPublic, publicToAddress } from 'ethereumjs-util';

export const enum Platform {
    BITCOIN = "m/44'/0'/0'/0/0",
    ETHEREUM = "m/44'/60'/0'/0/0",
    BITCOIN_TESTNET = "m/44'/1'/0'/0/0"
}

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
    platform: Platform,
) {
    let b32: BIP32Interface = null;
    if (platform === Platform.BITCOIN_TESTNET) {
        b32 = fromSeed(seed, networks.testnet);
    } else {
        b32 = fromSeed(seed, networks.bitcoin);
    }

    console.log('platform:', platform);
    const deriveB32 = b32.derivePath(platform);
    const priv = deriveB32.privateKey.toString("hex");
    const pub = deriveB32.publicKey.toString("hex");
    const xpriv = deriveB32.toBase58();
    const xpub = deriveB32.neutered().toBase58();
    const wif = deriveB32.toWIF();

    return {
        priv,
        pub,
        xpriv,
        xpub,
        wif
    };
}

export async function bipPrivpubFromMnemonic(
    mnemonic: string,
    platform: Platform,
    password: string = '',
) {
    const seed = await bipMnemonicToSeed(mnemonic, password);
    return await bipPrivpubFromSeed(seed, platform);
}

export async function bipHexPrivFromxPriv(xpriv: string, platform: Platform) {
    if (platform === Platform.BITCOIN_TESTNET) {
        const b32 = fromBase58(xpriv, networks.testnet);
        return b32.privateKey.toString('hex');
    } else {
        const b32 = fromBase58(xpriv, networks.bitcoin);
        return b32.privateKey.toString('hex');
    }
}

export async function bipGetAddressFromXPub(platform: Platform, xpub: string) {
    let pubkey: Buffer = null;
    if (platform === Platform.BITCOIN_TESTNET) {
        const b32 = fromBase58(xpub, networks.testnet);
        pubkey = b32.publicKey;
    } else {
        const b32 = fromBase58(xpub, networks.bitcoin);
        pubkey = b32.publicKey;
    }
    console.log('bipGetAddressFromXpub:', platform);

    switch (platform) {
        case Platform.BITCOIN: {
            const p2pkh = payments.p2pkh({ pubkey, network: networks.bitcoin });
            return p2pkh.address;
        }

        case Platform.ETHEREUM: {
            const ethereumPubkey = importPublic(pubkey);
            const addr = publicToAddress(ethereumPubkey);
            return '0x' + addr.toString('hex');
        }

        case Platform.BITCOIN_TESTNET: {
            const p2pkh = payments.p2pkh({ pubkey, network: networks.testnet });
            return p2pkh.address;
        }

        default:
            break;
    }

    throw new Error();
}