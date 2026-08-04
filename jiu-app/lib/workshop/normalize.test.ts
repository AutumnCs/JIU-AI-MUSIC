import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeStoredDraft, normalizeStoredPublishedWorks } from './normalize.ts';

test('normalizes legacy draft payloads into the shared draft contract', () => {
  const draft = normalizeStoredDraft(JSON.stringify({
    title: 'Morning Light',
    idea: 'Write a song about the early morning',
    lyricsMode: 'ai',
    instrumental: false,
    genre: 'pop',
    mood: 'happy',
    voice: 'female',
    instruments: ['piano'],
  }));

  assert.equal(draft?.title, 'Morning Light');
  assert.equal(draft?.idea, 'Write a song about the early morning');
  assert.equal(draft?.lyrics, '');
});

test('returns null for malformed draft JSON and invalid draft fields', () => {
  assert.equal(normalizeStoredDraft('{'), null);
  assert.equal(normalizeStoredDraft(JSON.stringify({ title: 1 })), null);
});

test('normalizes legacy published works into the shared work contract', () => {
  const works = normalizeStoredPublishedWorks(JSON.stringify([
    {
      id: 1,
      title: 'Morning Light',
      genre: 'pop',
      mood: 'happy',
      status: 'published',
      audio: '/audio/sample-song.mp3',
    },
  ]));

  assert.equal(works?.[0]?.status, 'published');
  assert.equal(works?.[0]?.audio, '/audio/sample-song.mp3');
  assert.equal(works?.[0]?.sourceProvider, 'local');
});

test('ignores invalid published work records and returns null for malformed JSON', () => {
  const works = normalizeStoredPublishedWorks(JSON.stringify([
    {
      id: 1,
      title: 'Morning Light',
      genre: 'pop',
      mood: 'happy',
      status: 'saved',
      audio: '/audio/sample-song.mp3',
    },
    { id: 2, title: 'Broken work' },
  ]));

  assert.equal(works?.length, 1);
  assert.equal(normalizeStoredPublishedWorks('{'), null);
});
