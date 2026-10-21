import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

const sessionMs = 8 * 60 * 60 * 1000;
export const sessionCookie = 'shopee_admin';

export function verifyPassword(password: string): boolean {
  const configured = process.env.ADMIN_PASSWORD_SCRYPT || '';
  const [salt, expected] = configured.split(':');
  if (!salt || !expected || !/^[a-f0-9]{128}$/i.test(expected)) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === (process.env.ADMIN_USERNAME || 'admin') && verifyPassword(password);
}

function signature(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSession(now = Date.now()) {
  const expires = String(now + sessionMs);
  return `${expires}.${signature(expires)}`;
}

export function readSession(token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expires, signed, extra] = token.split('.');
  if (extra || !/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(signed || '')) return false;
  if (Number(expires) <= now) return false;
  const actual = Buffer.from(signature(expires), 'hex');
  return timingSafeEqual(actual, Buffer.from(signed, 'hex'));
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}
