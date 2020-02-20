import generate = require('nanoid/generate');

import { AppConfig } from '../../config/app.config';

const USERID_ALPHABET = '0123456789';
const USERID_SIZE = AppConfig.Nanoid_UserId_Size;

export async function nanoidGen(alphabet: string, size: number): Promise<string> {
    return generate(alphabet, size);
}

export async function nanoidGenUserId(): Promise<string> {
    return nanoidGen(USERID_ALPHABET, USERID_SIZE);
}