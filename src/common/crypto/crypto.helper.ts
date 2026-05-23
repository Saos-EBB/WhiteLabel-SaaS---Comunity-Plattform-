import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(): Buffer {
    if (!process.env.APP_ENCRYPTION_KEY) throw new Error('APP_ENCRYPTION_KEY not set');
    return Buffer.from(process.env.APP_ENCRYPTION_KEY, 'hex');
}

export function encryptField(value: string): Buffer {
    const key = getKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}

export function decryptField(buf: Buffer | null): string | null {
    if (!buf) return null;
    try {
        const key = getKey();
        const iv = buf.subarray(0, 16);
        const encrypted = buf.subarray(16);
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        return decipher.update(encrypted).toString('utf8') + decipher.final().toString('utf8');
    } catch {
        return null;
    }
}

/** @deprecated use decryptField */
export function decryptEmail(buf: Buffer | null): string | null {
    return decryptField(buf);
}
