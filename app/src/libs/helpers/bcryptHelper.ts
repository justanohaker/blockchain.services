import { hash, compare } from 'bcrypt';

const SALT_ROUND = 10;

export async function bcryptHash(plaintext: string): Promise<string> {
    return new Promise((resolve, reject) => {
        hash(plaintext, SALT_ROUND, (err, encrypted) => {
            if (err) {
                return reject(err);
            }

            return resolve(encrypted);
        });
    });
}

export async function bcryptCompare(plaintext: string, hash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        compare(plaintext, hash, (err, same) => {
            if (err) {
                return reject(err);
            }

            return resolve(same);
        });
    });
}