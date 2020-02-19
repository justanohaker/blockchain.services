import generate = require('nanoid/generate');

const USERID_ALPHABET = '0123456789';
const USERID_SIZE = 15;

export async function nanoidGen(alphabet: string, size: number): Promise<string> {
    return generate(alphabet, size);
}

export async function nanoidGenUserId(): Promise<string> {
    return nanoidGen(USERID_ALPHABET, USERID_SIZE);
}