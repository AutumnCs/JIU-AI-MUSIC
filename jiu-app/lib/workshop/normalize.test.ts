import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePublishedWorkFromResult,
  normalizeStoredDraft,
  normalizeStoredPublishedWorks,
  normalizeWorkshopGenerationResult,
  normalizeWorkshopTask,
} from './normalize.ts';

test('normalizes legacy draft payloads into the shared draft contract', () => {
  const draft = normalizeStoredDraft(
    JSON.stringify({
      title: 'Morning Light',
      idea: 'Write a song about the early morning',
      lyricsMode: 'ai',
      instrumental: false,
      genre: 'pop',
      mood: 'happy',
      voice: 'female',
      instruments: ['piano'],
    }),
  );

  assert.equal(draft?.title, 'Morning Light');
  assert.equal(draft?.idea, 'Write a song about the early morning');
  assert.equal(draft?.lyricsMode, 'ai');
});

test('normalizes legacy published works into the shared work contract', () => {
  const works = normalizeStoredPublishedWorks(
    JSON.stringify([
      {
        id: 1,
        title: 'Morning Light',
        genre: 'pop',
        mood: 'happy',
        status: 'published',
        audio: '/audio/sample-song.mp3',
      },
    ]),
  );

  assert.equal(works?.[0]?.status, 'published');
  assert.equal(works?.[0]?.audio, '/audio/sample-song.mp3');
});

test('normalizes task and generation result shapes', () => {
  const task = normalizeWorkshopTask({
    id: 'task-1',
    status: 'succeeded',
    provider: 'local',
    request: {
      title: 'Morning Light',
      idea: 'Write a song about the early morning',
      lyrics: '',
      lyricsMode: 'ai',
      instrumental: false,
      genre: 'pop',
      mood: 'happy',
      voice: 'female',
      instruments: ['piano'],
    },
    createdAt: '2026-08-04T00:00:00.000Z',
    updatedAt: '2026-08-04T00:00:00.000Z',
  });

  assert.equal(task?.provider, 'local');

  const result = normalizeWorkshopGenerationResult({
    taskId: 'task-1',
    title: 'Morning Light',
    lyrics: 'hello',
    audioUrl: '/audio/sample-song.mp3',
    genre: 'pop',
    mood: 'happy',
    instruments: ['piano'],
    sourceProvider: 'local',
  });

  assert.equal(result?.audioUrl, '/audio/sample-song.mp3');

  const published = result ? normalizePublishedWorkFromResult(result, 'published') : null;
  assert.equal(published?.status, 'published');
});
