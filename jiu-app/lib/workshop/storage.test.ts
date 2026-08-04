import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getWorkshopDraftStorageKey,
  getWorkshopWorksStorageKey,
  readWorkshopDraft,
  readWorkshopWorks,
  writeWorkshopDraft,
  writeWorkshopWork,
} from './storage.ts';

test('reads scoped draft before legacy draft and falls back to legacy when needed', () => {
  const storage = createMemoryStorage();
  setStorage(storage);

  storage.setItem(getWorkshopDraftStorageKey('user-1'), JSON.stringify({
    title: 'Scoped',
    idea: 'Scoped idea',
    lyrics: '',
    lyricsMode: 'write',
    instrumental: false,
    genre: 'pop',
    mood: 'happy',
    voice: 'female',
    instruments: ['piano'],
  }));

  storage.setItem('jiu_workshop_draft', JSON.stringify({
    title: 'Legacy',
    idea: 'Legacy idea',
    lyrics: '',
    lyricsMode: 'ai',
    instrumental: false,
    genre: 'pop',
    mood: 'happy',
    voice: 'female',
    instruments: ['piano'],
  }));

  assert.equal(readWorkshopDraft('user-1', 'server')?.title, 'Scoped');
  assert.equal(readWorkshopDraft(null, 'local')?.title, 'Legacy');
  assert.equal(readWorkshopDraft('user-2', 'server'), null);
});

test('writes scoped works and keeps legacy write for anonymous mode', () => {
  const storage = createMemoryStorage();
  setStorage(storage);

  writeWorkshopDraft(null, {
    title: 'Morning Light',
    idea: 'Write a song about the early morning',
    lyrics: '',
    lyricsMode: 'ai',
    instrumental: false,
    genre: 'pop',
    mood: 'happy',
    voice: 'female',
    instruments: ['piano'],
  });

  assert.ok(storage.getItem('jiu_workshop_draft'));
  assert.ok(storage.getItem(getWorkshopDraftStorageKey(null)));

  writeWorkshopWork('user-1', {
    id: 1,
    title: 'Morning Light',
    status: 'published',
    audio: '/audio/sample-song.mp3',
    genre: 'pop',
    mood: 'happy',
    createdAt: '2026-08-04T00:00:00.000Z',
    sourceProvider: 'local',
  });

  const stored = readWorkshopWorks('user-1', 'server');
  assert.equal(stored[0]?.audio, '/audio/sample-song.mp3');
  assert.equal(storage.getItem(getWorkshopWorksStorageKey('user-1')) ? 'yes' : 'no', 'yes');
  assert.deepEqual(readWorkshopWorks('user-2', 'server'), []);
});

test('ignores invalid json instead of throwing', () => {
  const storage = createMemoryStorage();
  setStorage(storage);
  storage.setItem('jiu_workshop_draft', '{');
  storage.setItem('jiu_workshop_works', '[');

  assert.equal(readWorkshopDraft(null, 'local'), null);
  assert.deepEqual(readWorkshopWorks(null, 'local'), []);
});

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key: string) {
      return entries.has(key) ? entries.get(key)! : null;
    },
    key(index: number) {
      return [...entries.keys()][index] ?? null;
    },
    removeItem(key: string) {
      entries.delete(key);
    },
    setItem(key: string, value: string) {
      entries.set(key, value);
    },
  } as Storage;
}

function setStorage(storage: Storage) {
  (globalThis as typeof globalThis & { localStorage: Storage }).localStorage = storage;
}
