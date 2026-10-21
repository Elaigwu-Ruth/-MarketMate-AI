import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.ORDERDESK_DB = ':memory:';
process.env.AI_API_KEY = '';
const { GET, POST } = await import('../src/app/api/[...path]/route');

const url = 'http://127.0.0.1:3000/api/';
function request(path: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) {
  return new NextRequest(url + path, init);
}
function context(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}
function post(path: string, body: string, headers: Record<string, string> = {}) {
  return request(path, { method: 'POST', body, headers });
}
const json = { 'content-type': 'application/json', host: '127.0.0.1:3000' };

test('write requests reject cross-site, mismatched-origin and non-JSON traffic', async () => {
  const crossSite = await POST(post('auth/demo', '{"user_id":"ada"}', { ...json, 'sec-fetch-site': 'cross-site' }), context('auth', 'demo'));
  assert.equal(crossSite.status, 403);

  const evilOrigin = await POST(post('auth/demo', '{"user_id":"ada"}', { ...json, origin: 'http://evil.test' }), context('auth', 'demo'));
  assert.equal(evilOrigin.status, 403);

  const malformedOrigin = await POST(post('auth/demo', '{"user_id":"ada"}', { ...json, origin: 'not a url' }), context('auth', 'demo'));
  assert.equal(malformedOrigin.status, 403);

  const plainText = await POST(post('auth/demo', '{"user_id":"ada"}', { ...json, 'content-type': 'text/plain' }), context('auth', 'demo'));
  assert.equal(plainText.status, 415);

  const invalidJson = await POST(post('auth/demo', '{', json), context('auth', 'demo'));
  assert.equal(invalidJson.status, 400);
});

test('oversized bodies are rejected before parsing', async () => {
  const oversized = await POST(post('auth/demo', '{"user_id":"' + 'a'.repeat(100001) + '"}', json), context('auth', 'demo'));
  assert.equal(oversized.status, 413);
});

test('same-origin demo login works and issues a hardened session cookie', async () => {
  const response = await POST(post('auth/demo', '{"user_id":"ada"}', {
    ...json,
    origin: 'http://127.0.0.1:3000',
    'sec-fetch-site': 'same-origin',
  }), context('auth', 'demo'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.id, 'ada');
  const cookie = response.headers.get('set-cookie') || '';
  assert.match(cookie, /orderdesk_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=strict/i);
});

test('protected routes require a session', async () => {
  const threads = await GET(request('threads'), context('threads'));
  assert.equal(threads.status, 401);
  const marketplace = await GET(request('marketplace'), context('marketplace'));
  assert.equal(marketplace.status, 401);
});

test('password verification fails closed on malformed stored hashes', async () => {
  const { checkPassword, passwordHash } = await import('../src/lib/db');
  const hash = passwordHash('correct-password');
  assert.equal(checkPassword('correct-password', hash), true);
  assert.equal(checkPassword('wrong-password', hash), false);
  assert.equal(checkPassword('anything', 'garbage'), false);
  assert.equal(checkPassword('anything', 'salt:not-hex'), false);
});

test('an unreachable AI provider falls back to clearly labelled local matching', async () => {
  const loginResponse = await POST(post('auth/demo', '{"user_id":"ada"}', {
    ...json,
    origin: 'http://127.0.0.1:3000',
    'sec-fetch-site': 'same-origin',
  }), context('auth', 'demo'));
  const cookie = (loginResponse.headers.get('set-cookie') || '').split(';')[0];
  assert.match(cookie, /orderdesk_session=/);
  const authHeaders = { ...json, origin: 'http://127.0.0.1:3000', 'sec-fetch-site': 'same-origin', cookie };

  const threadResponse = await POST(post('threads', '{"vendor_id":"circuit"}', authHeaders), context('threads'));
  assert.equal(threadResponse.status, 200);
  const { thread_id } = await threadResponse.json();

  const previous = { key: process.env.AI_API_KEY, url: process.env.AI_BASE_URL, timeout: process.env.AI_TIMEOUT_MS };
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_BASE_URL = 'http://127.0.0.1:9/v1/chat/completions';
  process.env.AI_TIMEOUT_MS = '1000';
  try {
    const response = await POST(post('assistant', JSON.stringify({
      thread_id,
      prompt: 'Two USB-C cables under ₦6,000',
      items: [],
    }), authHeaders), context('assistant'));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mode, 'Local fallback · live AI unavailable');
    assert.match(body.warning, /could not be reached/);
    assert.deepEqual(body.items, [{ product_id: 'cable', quantity: 2 }]);
  } finally {
    if (previous.key === undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY = previous.key;
    if (previous.url === undefined) delete process.env.AI_BASE_URL; else process.env.AI_BASE_URL = previous.url;
    if (previous.timeout === undefined) delete process.env.AI_TIMEOUT_MS; else process.env.AI_TIMEOUT_MS = previous.timeout;
  }
});
