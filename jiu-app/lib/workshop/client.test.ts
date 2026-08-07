import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkshopClient } from './client.ts';
import { getWorkshopDraftStorageKey, getWorkshopWorksStorageKey } from './storage.ts';

test('workshop client reads scoped drafts, writes scoped work, and uses upstream provider flow', async () => {
  const storage = createMemoryStorage();
  const originalLocalStorage = globalThis.localStorage;
  setStorage(storage);
  storage.setItem(getWorkshopDraftStorageKey('user-1'), JSON.stringify({
    title: 'Scoped draft',
    idea: 'A song about moonlight',
    lyrics: '',
    lyricsMode: 'ai',
    instrumental: false,
    genre: 'pop',
    mood: 'happy',
    voice: 'female',
    instruments: ['piano'],
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/music/create')) {
      return new Response(JSON.stringify({
        taskId: 'task-1',
        track: 'vocal',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    if (url.endsWith('/api/music/status/task-1')) {
      return new Response(JSON.stringify({
        taskId: 'task-1',
        status: 'success',
        progress: 100,
        lyrics: 'Lyrics',
        audioUrl: 'https://cdn.example/song.mp3',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;

  try {
    const client = createWorkshopClient('user-1', 'server', {
      baseUrl: 'https://example.com',
      sampleAudioUrl: '/audio/sample-song.mp3',
    });

    const draft = client.readDraft();
    assert.equal(draft.title, 'Scoped draft');

    client.writeDraft({ ...draft, title: 'Updated draft' });
    assert.ok(storage.getItem(getWorkshopDraftStorageKey('user-1'))?.includes('Updated draft'));

    const task = await client.generate(draft);
    assert.equal(task.provider, 'upstream');
    assert.equal(task.status, 'succeeded');
    assert.equal(task.result?.audioUrl, 'https://cdn.example/song.mp3');

    client.writeWork(task.result!, {
      id: 1,
      title: 'Saved title',
      status: 'published',
      audio: '/audio/sample-song.mp3',
      genre: draft.genre,
      mood: draft.mood,
      createdAt: '2026-08-04T00:00:00.000Z',
      sourceProvider: 'local',
    });

    assert.ok(storage.getItem(getWorkshopWorksStorageKey('user-1'))?.includes('Saved title'));
    assert.equal(client.readWorks()[0]?.audio, 'https://cdn.example/song.mp3');
  } finally {
    globalThis.fetch = originalFetch;
    setStorage(originalLocalStorage ?? createMemoryStorage());
  }
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  } as Storage;
}

function setStorage(storage: Storage) {
  (globalThis as typeof globalThis & { localStorage: Storage }).localStorage = storage;
}
