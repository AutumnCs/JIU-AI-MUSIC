import assert from 'node:assert/strict';
import test from 'node:test';

import { createLyricsPostHandler } from './route.ts';

test('authenticates before parsing a request body or invoking a lyrics provider', async () => {
  const events: string[] = [];
  const handler = createLyricsPostHandler({
    getCurrentUser: async () => {
      events.push('auth');
      return { user: null };
    },
    generateLyrics: async () => {
      events.push('provider');
      return { lyrics: 'not used', provider: 'template' };
    },
    runtimeEnv: () => ({}),
  });
  const request = {
    json: async () => {
      events.push('parse');
      throw new Error('body must not be parsed');
    },
  } as unknown as Request;

  const response = await handler(request);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized' });
  assert.deepEqual(events, ['auth']);
});

test('returns bad_request for malformed or invalid lyrics requests', async () => {
  let calls = 0;
  const handler = createLyricsPostHandler({
    getCurrentUser: async () => ({ user: { id: 'user-1' } }),
    generateLyrics: async () => {
      calls += 1;
      return { lyrics: 'not used', provider: 'template' };
    },
    runtimeEnv: () => ({}),
  });

  const response = await handler(new Request('https://example.test/api/lyrics/generate', {
    method: 'POST',
    body: JSON.stringify({ mode: 'continue', lyrics: '' }),
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'bad_request' });
  assert.equal(calls, 0);
});

test('returns generated lyrics and its selected provider', async () => {
  let received: unknown;
  const handler = createLyricsPostHandler({
    getCurrentUser: async () => ({ user: { id: 'user-1' } }),
    generateLyrics: async (input, env) => {
      received = { input, env };
      return { lyrics: '[Verse]\nHello', provider: 'ark' };
    },
    runtimeEnv: () => ({ ARK_API_KEY: 'server-only-key' }),
  });

  const response = await handler(new Request('https://example.test/api/lyrics/generate', {
    method: 'POST',
    body: JSON.stringify({ mode: 'write', theme: 'hello', genre: 'pop', mood: 'happy' }),
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { lyrics: '[Verse]\nHello', provider: 'ark' });
  assert.deepEqual(received, {
    input: { mode: 'write', theme: 'hello', genre: 'pop', mood: 'happy' },
    env: { ARK_API_KEY: 'server-only-key' },
  });
});

test('does not expose provider failures to the client', async () => {
  const handler = createLyricsPostHandler({
    getCurrentUser: async () => ({ user: { id: 'user-1' } }),
    generateLyrics: async () => { throw new Error('upstream body contains ARK_API_KEY=secret'); },
    runtimeEnv: () => ({ ARK_API_KEY: 'server-only-key' }),
  });

  const response = await handler(new Request('https://example.test/api/lyrics/generate', {
    method: 'POST',
    body: JSON.stringify({ mode: 'write', theme: 'hello' }),
  }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'bad_request' });
});
