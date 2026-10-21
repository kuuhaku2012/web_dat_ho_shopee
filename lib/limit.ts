import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export function rateLimitKey(request: Request): string {
  const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  return isIP(address) ? createHash('sha256').update(address).digest('hex') : 'unknown';
}

export function createLimiter(max: number, windowMs: number, maxClients = 4096) {
  const hitsByClient = new Map<string, number[]>();
  let nextSweep = 0;
  const capacity = Math.max(1, maxClients);
  return (client: string, now = Date.now()) => {
    if (now >= nextSweep) {
      for (const [key, hits] of hitsByClient) {
        const active = hits.filter(time => now - time < windowMs);
        if (active.length) hitsByClient.set(key, active);
        else hitsByClient.delete(key);
      }
      nextSweep = now + windowMs;
    }
    const hits = (hitsByClient.get(client) || []).filter(time => now - time < windowMs);
    if (hits.length >= max) {
      hitsByClient.delete(client);
      hitsByClient.set(client, hits);
      return false;
    }
    hits.push(now);
    hitsByClient.delete(client);
    hitsByClient.set(client, hits);
    if (hitsByClient.size > capacity) {
      const oldest = hitsByClient.keys().next().value;
      if (oldest !== undefined) hitsByClient.delete(oldest);
    }
    return true;
  };
}

export const allowSubmission = createLimiter(30, 60_000);
export const allowLogin = createLimiter(5, 60_000);
export const allowAccountLookup = createLimiter(20, 60_000);
export const allowCustomerAuth = createLimiter(10, 60_000);
export const allowClaim = createLimiter(20, 60_000);
export const allowPrivacyRequests = createLimiter(10, 60_000);
