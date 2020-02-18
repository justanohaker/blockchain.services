import { encrypt, decrypt } from 'sjcl';

const PASSWORD_FOR_TEST = "E!@#$%^NTANMO_blockchain.service)(*&^%";

export class sjclHelper {
    static async encrypt(plaintext: string) {
        const sjclResult = encrypt(PASSWORD_FOR_TEST, plaintext);

        return `${sjclResult}`;
    }

    static async decrypt(encrypted: string) {
        return decrypt(PASSWORD_FOR_TEST, encrypted);
    }
}