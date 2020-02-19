import { encrypt, decrypt } from 'sjcl';

const PASSWORD_FOR_TEST = "E!@#$%^NTANMO_blockchain.service)(*&^%";

export async function sjclEncrypt(plaintext: string) {
    const sjclResult = encrypt(PASSWORD_FOR_TEST, plaintext);

    return `${sjclResult}`;
}

export async function sjclDecrypt(encrypted: string) {
    return decrypt(PASSWORD_FOR_TEST, encrypted);
}