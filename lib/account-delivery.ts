import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type DeliveredAccount = { email: string; password: string };

export function parseDeliveredAccounts(value: unknown, quantity: number): DeliveredAccount[] {
  if (typeof value !== 'string' || value.length > 10000) throw new Error('Thông tin tài khoản không hợp lệ.');
  const lines = value.trim() ? value.trim().split(/\r?\n/) : [];
  if (lines.length !== quantity) throw new Error(`Vui lòng nhập đúng ${quantity} tài khoản, mỗi dòng một tài khoản.`);
  return lines.map(line => {
    const separator = line.indexOf('|');
    const email = line.slice(0, separator).trim();
    const password = line.slice(separator + 1).trim();
    if (separator < 0 || !/^[^\s@|]+@[^\s@|]+\.[^\s@|]+$/.test(email) || !password || password.length > 200) throw new Error('Mỗi dòng cần có dạng email | mật khẩu.');
    return { email, password };
  });
}

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return createHash('sha256').update(secret).digest();
}

export function encryptAccounts(accounts: DeliveredAccount[]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(accounts), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.');
}

export function decryptAccounts(value: string): DeliveredAccount[] {
  const [iv, tag, encrypted] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'));
}
