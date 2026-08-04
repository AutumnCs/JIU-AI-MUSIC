import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkshopClient } from './client.ts';

test('workshop client reads scoped drafts and writes scoped works', () => {
  const client = createWorkshopClient('user-1', 'server', {
    sampleAudioUrl: '/audio/sample-song.mp3',
  });

  const draft = client.readDraft();
  assert.equal(draft?.lyricsMode, 'ai');
});
