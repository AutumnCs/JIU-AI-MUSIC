import assert from 'node:assert/strict';
import test from 'node:test';

import { ArkLyricsProvider } from './ark-provider.ts';
import { generateLyrics } from './provider.ts';
import { TemplateLyricsProvider } from './template-provider.ts';

test('rejects invalid modes and input bounds before invoking a provider', async () => {
  let called = false;
  const provider = {
    name: 'ark' as const,
    generate: async () => {
      called = true;
      return 'not used';
    },
  };

  await assert.rejects(
    () => generateLyrics({ mode: 'rewrite', theme: 'morning' } as never, { ARK_API_KEY: 'test-key' }, { arkProvider: provider }),
    { name: 'LyricsInputError' },
  );
  await assert.rejects(
    () => generateLyrics({ mode: 'write', theme: 'x'.repeat(201) }, { ARK_API_KEY: 'test-key' }, { arkProvider: provider }),
    { name: 'LyricsInputError' },
  );
  await assert.rejects(
    () => generateLyrics({ mode: 'continue', theme: 'morning', lyrics: '   ' }, { ARK_API_KEY: 'test-key' }, { arkProvider: provider }),
    { name: 'LyricsInputError' },
  );
  await assert.rejects(
    () => generateLyrics({ mode: 'continue', theme: 'morning', lyrics: 'x'.repeat(1201) }, { ARK_API_KEY: 'test-key' }, { arkProvider: provider }),
    { name: 'LyricsInputError' },
  );

  assert.equal(called, false);
});

test('uses Ark with runtime credentials and returns its lyrics', async () => {
  let request: Request | undefined;
  const provider = new ArkLyricsProvider({
    apiKey: 'ark-secret',
    model: 'ark-test-model',
    fetch: async (input, init) => {
      request = new Request(input, init);
      return Response.json({ choices: [{ message: { content: '[Verse]\nMorning light' } }] });
    },
  });

  const result = await generateLyrics(
    { mode: 'write', theme: 'morning light', genre: 'pop', mood: 'happy' },
    { ARK_API_KEY: 'ark-secret', ARK_MODEL: 'ark-test-model' },
    { arkProvider: provider },
  );

  assert.deepEqual(result, { lyrics: '[Verse]\nMorning light', provider: 'ark' });
  assert.equal(request?.url, 'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
  assert.equal(request?.headers.get('authorization'), 'Bearer ark-secret');
  assert.deepEqual(await request?.json(), {
    model: 'ark-test-model',
    messages: [{ role: 'user', content: 'Write child-safe structured song lyrics about morning light. Genre: pop. Mood: happy.' }],
  });
});

test('falls back to the deterministic child-safe template when Ark fails', async () => {
  const template = new TemplateLyricsProvider();
  const result = await generateLyrics(
    { mode: 'write', theme: 'a sunny playground' },
    { ARK_API_KEY: 'ark-secret' },
    { arkProvider: { name: 'ark', generate: async () => { throw new Error('upstream body: secret diagnostic'); } }, templateProvider: template },
  );

  assert.equal(result.provider, 'template');
  assert.match(result.lyrics, /^\[Verse\]/);
  assert.match(result.lyrics, /\[Chorus\]/);
  assert.doesNotMatch(result.lyrics, /adult|sexual|色情/i);
});

test('selects the template directly when Ark credentials are unavailable', async () => {
  const result = await generateLyrics(
    { mode: 'continue', theme: 'night sky', lyrics: '[Verse]\nStars glow' },
    {},
    { arkProvider: { name: 'ark', generate: async () => { throw new Error('must not call Ark'); } } },
  );

  assert.equal(result.provider, 'template');
  assert.match(result.lyrics, /Stars glow/);
});

test('sanitizes Ark failures and captures no more than 20 KB of upstream diagnostics', async () => {
  const encoder = new TextEncoder();
  let chunksRead = 0;
  const response = new Response(new ReadableStream<Uint8Array>({
    pull(controller) {
      chunksRead += 1;
      controller.enqueue(encoder.encode('x'.repeat(10_000)));
      if (chunksRead === 3) controller.close();
    },
  }), { status: 502 });
  const provider = new ArkLyricsProvider({ apiKey: 'ark-secret', fetch: async () => response });

  await assert.rejects(
    () => provider.generate({ mode: 'write', theme: 'rainbow' }),
    (error: unknown) => {
      assert.equal(error instanceof Error && error.message, 'Ark lyrics request failed');
      assert.ok(error instanceof Error && 'diagnostic' in error);
      assert.ok(String((error as { diagnostic: string }).diagnostic).length <= 20_480);
      return true;
    },
  );
  assert.equal(chunksRead, 3);
});
