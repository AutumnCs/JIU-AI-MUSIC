import assert from 'node:assert/strict';
import test from 'node:test';

import { retrieveKnowledge } from './knowledge.ts';

test('retrieves music concepts and academy level knowledge', () => {
  const pitch = retrieveKnowledge('声音高低是什么', { page: 'academy', levelId: 1 });
  assert.ok(pitch.some((item) => item.id === 'music-pitch'));

  const level = retrieveKnowledge('这一关要学什么', { page: 'academy', levelId: 9 });
  assert.ok(level.some((item) => item.id === 'academy-level-9'));
});

test('retrieves rhythm knowledge from a follow-up question', () => {
  const result = retrieveKnowledge('那节拍呢', { page: 'academy', levelId: 2 });
  assert.ok(result.some((item) => item.id === 'music-beat'));
});
