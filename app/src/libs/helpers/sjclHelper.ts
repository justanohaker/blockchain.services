import { encrypt, decrypt } from 'sjcl';
import { AppConfig } from '../../config/app.config';

export async function sjclEncrypt(plaintext: string) {
    const sjclResult = encrypt(AppConfig.Sjcl_Password, plaintext);

    return `${sjclResult}`;
}

export async function sjclDecrypt(encrypted: string) {
    return decrypt(AppConfig.Sjcl_Password, encrypted);
}