import assert from 'node:assert/strict';
import test from 'node:test';

import { requestWorkshopLyrics } from './lyrics.ts';

test('sends workshop controls to the authenticated lyrics API', async () => {
  let request: Request | undefined;
  let url = '';
  const lyrics = await requestWorkshopLyrics(
    { mode: 'write', theme: 'morning light', genre: 'pop', mood: 'happy' },
    () => 'local lyrics',
    async (input, init) => {
      url = String(input);
      request = new Request('https://app.example.com/api/lyrics/generate', init);
      return Response.json({ lyrics: '[Verse]\nAPI lyrics', provider: 'ark' });
    },
  );

  assert.equal(lyrics, '[Verse]\nAPI lyrics');
  assert.equal(url, '/api/lyrics/generate');
  assert.equal(request?.method, 'POST');
  assert.deepEqual(await request?.json(), { mode: 'write', theme: 'morning light', genre: 'pop', mood: 'happy' });
});

test('uses the local lyrics fallback when the API is unavailable or invalid', async () => {
  let fallbacks = 0;
  const fallback = () => {
    fallbacks += 1;
    return '[Verse]\nLocal lyrics';
  };

  const lyrics = await requestWorkshopLyrics(
    { mode: 'continue', theme: 'night sky', lyrics: '[Verse]\nStars' },
    fallback,
    async () => { throw new Error('network unavailable'); },
  );

  assert.equal(lyrics, '[Verse]\nLocal lyrics');
  assert.equal(fallbacks, 1);
});
