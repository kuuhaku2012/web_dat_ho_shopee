import assert from 'node:assert/strict';
import test from 'node:test';
import config from '../next.config.ts';

test('applies browser security headers to every route', async () => {
  const originalEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'production');
  try {
    const rules = await config.headers?.();
    assert.equal(rules?.length, 1);
    assert.equal(rules?.[0].source, '/:path*');
    const headers = Object.fromEntries(rules?.[0].headers.map(({ key, value }) => [key.toLowerCase(), value]) || []);
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.equal(headers['x-frame-options'], 'DENY');
    assert.equal(headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.equal(headers['permissions-policy'], 'camera=(), microphone=(), geolocation=()');
    assert.equal(headers['strict-transport-security'], 'max-age=31536000');
  } finally {
    if (originalEnvironment === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Reflect.set(process.env, 'NODE_ENV', originalEnvironment);
  }
});

test('does not send HSTS from the development server', async () => {
  const originalEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'development');
  try {
    const rules = await config.headers?.();
    const names = rules?.[0].headers.map(({ key }) => key.toLowerCase()) || [];
    assert.equal(names.includes('strict-transport-security'), false);
  } finally {
    if (originalEnvironment === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Reflect.set(process.env, 'NODE_ENV', originalEnvironment);
  }
});
