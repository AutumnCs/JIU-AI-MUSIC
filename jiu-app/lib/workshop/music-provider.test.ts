import assert from 'node:assert/strict';
import test from 'node:test';

import { createMusicWorkshopProvider } from './music-provider.ts';
import type { WorkshopDraft } from './types.ts';

const draft: WorkshopDraft = {
  title: 'Morning Light', idea: 'early morning', lyrics: '', lyricsMode: 'ai', instrumental: false,
  genre: 'pop', mood: 'happy', voice: 'female', instruments: ['piano'],
};

test('music provider creates and polls a vocal task through the music API', async () => {
  const originalFetch = globalThis.fetch;
  let statusCalls = 0;
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.endsWith('/api/music/create')) {
      assert.equal(init?.method, 'POST');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.track, 'vocal');
      assert.equal(body.prompt, 'early morning');
      return Response.json({ taskId: 'provider-task-1', track: 'vocal' });
    }
    statusCalls += 1;
    return Response.json({ taskId: 'provider-task-1', status: 'success', progress: 100, audioUrl: '/api/music/audio/provider-task-1', lyrics: 'generated lyrics' });
  }) as typeof fetch;

  try {
    const provider = createMusicWorkshopProvider({ baseUrl: 'https://app.example.com' });
    const task = await provider.createTask(draft);
    assert.equal(task.status, 'queued');
    const result = await provider.getTask?.(task.id);
    assert.equal(result?.status, 'succeeded');
    assert.equal(result?.result?.audioUrl, '/api/music/audio/provider-task-1');
    assert.equal(statusCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
