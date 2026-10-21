import assert from 'node:assert/strict';
import test from 'node:test';
import { JsonBodyError, readJsonLimited } from '../lib/http.ts';

test('rejects a declared oversized body before reading it', async () => {
  let reads = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { reads++; controller.enqueue(new TextEncoder().encode('{}')); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new Request('https://example.test/api', { method: 'POST', headers: { 'content-length': '100' }, body, duplex: 'half' } as RequestInit & { duplex: 'half' });
  await assert.rejects(readJsonLimited(request, 10), error => error instanceof JsonBodyError && error.status === 413);
  assert.equal(reads, 0);
  assert.equal(cancelled, true);
});

test('enforces the byte limit while streaming a body without content-length', async () => {
  let index = 0;
  let cancelled = false;
  const chunks = ['{"x":"', '123456789"}'].map(value => new TextEncoder().encode(value));
  const body = new ReadableStream<Uint8Array>({
    pull(controller) { if (index < chunks.length) controller.enqueue(chunks[index++]); else controller.close(); },
    cancel() { cancelled = true; },
  }, { highWaterMark: 0 });
  const request = new Request('https://example.test/api', { method: 'POST', body, duplex: 'half' } as RequestInit & { duplex: 'half' });
  await assert.rejects(readJsonLimited(request, 10), error => error instanceof JsonBodyError && error.status === 413);
  assert.equal(cancelled, true);
});

test('reports malformed JSON as a client error', async () => {
  const request = new Request('https://example.test/api', { method: 'POST', body: '{' });
  await assert.rejects(readJsonLimited(request, 10), error => error instanceof JsonBodyError && error.status === 400);
});
