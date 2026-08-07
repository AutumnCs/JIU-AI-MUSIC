import assert from 'node:assert/strict';
import test from 'node:test';

import { persistAudioToR2 } from './r2.ts';

test('persistAudioToR2 keeps provider URL when R2 is unavailable', async () => {
  assert.deepEqual(
    await persistAudioToR2(null, 'https://provider.test/song.wav', 'task-1'),
    { url: 'https://provider.test/song.wav', persisted: false },
  );
});

test('persistAudioToR2 stores audio and returns the stable app URL', async () => {
  const objects = new Map<string, { body: ArrayBuffer; contentType: string }>();
  const bucket = {
    async get(key: string) {
      const object = objects.get(key);
      return object ? { body: new ReadableStream(), httpMetadata: { contentType: object.contentType } } : null;
    },
    async put(key: string, value: ReadableStream | ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }) {
      assert.ok(value);
      objects.set(key, { body: new ArrayBuffer(1), contentType: options?.httpMetadata?.contentType ?? 'audio/wav' });
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(new Uint8Array([1, 2]), { status: 200, headers: { 'content-type': 'audio/mpeg' } })) as typeof fetch;

  try {
    assert.deepEqual(await persistAudioToR2(bucket, 'https://provider.test/song.mp3', 'task-2'), {
      url: '/api/music/audio/task-2',
      persisted: true,
    });
    assert.equal(objects.get('task-2.wav')?.contentType, 'audio/mpeg');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
