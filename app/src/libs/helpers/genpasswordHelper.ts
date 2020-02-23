import { generate } from 'generate-password';

export async function genpasswordGen(): Promise<string> {
    return generate({
        length: 20,
        numbers: true,
        symbols: true,
        strict: true
    });
}