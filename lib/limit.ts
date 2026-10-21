export function createLimiter(max: number, windowMs: number) {
  let hits: number[] = [];
  return (now = Date.now()) => {
    hits = hits.filter(time => now - time < windowMs);
    if (hits.length >= max) return false;
    hits.push(now);
    return true;
  };
}

export const allowSubmission = createLimiter(30, 60_000);
export const allowLogin = createLimiter(5, 60_000);
