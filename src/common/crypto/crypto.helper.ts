import { createDecipheriv } from 'crypto';

export function decryptEmail(buf: Buffer | null): string | null {
    if (!buf) return null;
    try {
        const key = Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'hex');
        const iv = buf.subarray(0, 16);
        const encrypted = buf.subarray(16);
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        return decipher.update(encrypted).toString('utf8') + decipher.final().toString('utf8');
    } catch {
        return null;
    }
}
