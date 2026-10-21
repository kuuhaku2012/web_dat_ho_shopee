import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const customerCookie = 'shopee_customer';
const sessionMs = 30 * 24 * 60 * 60 * 1000;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return value;
}

export function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyCustomerPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !/^[a-f0-9]{128}$/i.test(hash || '')) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}

function sign(payload: string) { return createHmac('sha256', secret()).update(`customer:${payload}`).digest('hex'); }

export function createCustomerSession(id: string, now = Date.now()) {
  const payload = `${id}.${now + sessionMs}`;
  return `${payload}.${sign(payload)}`;
}

export function readCustomerSession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [id, expires, signature, extra] = token.split('.');
  if (extra || !/^[a-f0-9-]{36}$/i.test(id || '') || !/^\d+$/.test(expires || '') || !/^[a-f0-9]{64}$/i.test(signature || '') || Number(expires) <= now) return null;
  const actual = Buffer.from(sign(`${id}.${expires}`), 'hex');
  return timingSafeEqual(actual, Buffer.from(signature, 'hex')) ? id : null;
}

export function validateCustomerFields(value: unknown, register: boolean) {
  if (!value || typeof value !== 'object') throw new Error('Dữ liệu không hợp lệ.');
  const data = value as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const password = data.password;
  if (register && (!name || name.length > 100)) throw new Error('Vui lòng nhập tên hợp lệ.');
  if (!/^0\d{9}$/.test(phone)) throw new Error('Số điện thoại cần có 10 chữ số, bắt đầu bằng 0.');
  if (typeof password !== 'string' || password.length < (register ? 8 : 1) || password.length > 200) throw new Error(register ? 'Mật khẩu cần từ 8 đến 200 ký tự.' : 'Mật khẩu không hợp lệ.');
  return { name, phone, password };
}
