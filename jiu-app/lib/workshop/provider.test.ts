import assert from 'node:assert/strict';
import test from 'node:test';

import { createLocalWorkshopProvider } from './local-provider.ts';
import { createWorkshopProvider, selectWorkshopProvider } from './provider.ts';
import { createRemoteWorkshopProvider } from './remote-provider.ts';
import type { WorkshopDraft } from './types.ts';

const draft: WorkshopDraft = {
  title: 'Morning Light',
  idea: 'Write a song about the early morning',
  lyrics: '',
  lyricsMode: 'ai',
  instrumental: false,
  genre: 'pop',
  mood: 'happy',
  voice: 'female',
  instruments: ['piano'],
};

test('local provider returns a normalized succeeded task and result', async () => {
  const provider = createLocalWorkshopProvider({ sampleAudioUrl: '/audio/sample-song.mp3' });
  const task = await provider.createTask(draft);

  assert.equal(task.status, 'succeeded');
  assert.equal(task.provider, 'local');
  assert.deepEqual(task.request, draft);
  assert.deepEqual(task.result, {
    taskId: task.id,
    title: 'Morning Light',
    lyrics: 'Write a song about the early morning',
    audioUrl: '/audio/sample-song.mp3',
    genre: 'pop',
    mood: 'happy',
    instruments: ['piano'],
    sourceProvider: 'local',
  });
});

test('remote provider translates an upstream task payload into the shared contract', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input, init) => {
    assert.equal(input, 'https://api.example.com/api/workshop/generate');
    assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), draft);
    return Response.json({
      id: 'upstream-task-1',
      status: 'completed',
      created_at: '2026-08-04T00:00:00.000Z',
      updated_at: '2026-08-04T00:01:00.000Z',
      result: {
        title: 'Morning Light',
        lyrics: 'Upstream lyrics',
        audio_url: 'https://cdn.example.com/morning-light.mp3',
        cover_image_url: 'https://cdn.example.com/morning-light.jpg',
      },
    });
  };

  const task = await createRemoteWorkshopProvider({ baseUrl: 'https://api.example.com/' }).createTask(draft);

  assert.deepEqual(task, {
    id: 'upstream-task-1',
    status: 'succeeded',
    provider: 'upstream',
    request: draft,
    createdAt: '2026-08-04T00:00:00.000Z',
    updatedAt: '2026-08-04T00:01:00.000Z',
    result: {
      taskId: 'upstream-task-1',
      title: 'Morning Light',
      lyrics: 'Upstream lyrics',
      audioUrl: 'https://cdn.example.com/morning-light.mp3',
      coverImageUrl: 'https://cdn.example.com/morning-light.jpg',
      genre: 'pop',
      mood: 'happy',
      instruments: ['piano'],
      sourceProvider: 'upstream',
    },
  });
});

test('remote provider loads a task using the upstream task endpoint', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (input) => {
    assert.equal(input, 'https://api.example.com/api/workshop/tasks/upstream-task-1');
    return Response.json({
      id: 'upstream-task-1',
      status: 'running',
      request: draft,
      progress_step: 'composing',
      created_at: '2026-08-04T00:00:00.000Z',
      updated_at: '2026-08-04T00:00:30.000Z',
    });
  };

  const task = await createRemoteWorkshopProvider({ baseUrl: 'https://api.example.com' }).getTask?.('upstream-task-1');

  assert.deepEqual(task, {
    id: 'upstream-task-1',
    status: 'running',
    provider: 'upstream',
    request: draft,
    progressStep: 'composing',
    createdAt: '2026-08-04T00:00:00.000Z',
    updatedAt: '2026-08-04T00:00:30.000Z',
  });
});

test('provider selection uses remote for a configured base URL and local otherwise', () => {
  assert.equal(selectWorkshopProvider().provider, 'local');
  assert.equal(selectWorkshopProvider({ baseUrl: 'https://api.example.com' }).provider, 'upstream');
  assert.equal(createWorkshopProvider({ sampleAudioUrl: '/audio/custom.mp3' }).provider, 'local');
});
