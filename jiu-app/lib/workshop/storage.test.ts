import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readWorkshopDraft,
  readWorkshopWorks,
  writeWorkshopDraft,
  writeWorkshopWork,
} from './storage.ts';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

const draft = {
  title: 'Morning Light',
  idea: 'Write a song about the early morning',
  lyrics: '',
  lyricsMode: 'ai' as const,
  instrumental: false,
  genre: 'pop',
  mood: 'happy',
  voice: 'female' as const,
  instruments: ['piano'],
};

const work = {
  id: 1,
  title: 'Morning Light',
  lyrics: '',
  genre: 'pop',
  mood: 'happy',
  instruments: ['piano'],
  status: 'published' as const,
  audio: '/audio/sample-song.mp3',
  caption: '',
  emoji: '🎵',
  createdAt: '',
  authorId: '',
  sourceProvider: 'local' as const,
};

test('reads scoped drafts before legacy drafts', () => {
  storage.clear();
  storage.setItem('jiu_workshop_draft:user-1', JSON.stringify({ ...draft, title: 'Scoped draft' }));
  storage.setItem('jiu_workshop_draft', JSON.stringify({ ...draft, title: 'Legacy draft' }));

  assert.equal(readWorkshopDraft('user-1', 'local')?.title, 'Scoped draft');
  assert.equal(readWorkshopDraft('user-2', 'local')?.title, 'Legacy draft');
  assert.equal(readWorkshopDraft('user-2', 'server'), null);
});

test('writes normalized drafts and appends normalized works to scoped storage', () => {
  storage.clear();

  writeWorkshopDraft('user-1', draft);
  writeWorkshopWork('user-1', work);
  writeWorkshopWork('user-1', { ...work, id: 2, title: 'Evening Light' });

  assert.equal(readWorkshopDraft('user-1', 'server')?.title, 'Morning Light');
  assert.deepEqual(readWorkshopWorks('user-1', 'server').map((item) => item.id), [2, 1]);
});

test('returns compatibility defaults for malformed stored values', () => {
  storage.clear();
  storage.setItem('jiu_workshop_draft:user-1', '{');
  storage.setItem('jiu_workshop_works:user-1', '{');

  assert.equal(readWorkshopDraft('user-1', 'server'), null);
  assert.deepEqual(readWorkshopWorks('user-1', 'server'), []);
});

test('does not replace corrupt scoped values with legacy values', () => {
  storage.clear();
  storage.setItem('jiu_workshop_draft:user-1', '{');
  storage.setItem('jiu_workshop_draft', JSON.stringify(draft));
  storage.setItem('jiu_workshop_works:user-1', '{');
  storage.setItem('jiu_workshop_works', JSON.stringify([work]));

  assert.equal(readWorkshopDraft('user-1', 'local'), null);
  assert.deepEqual(readWorkshopWorks('user-1', 'local'), []);
});
