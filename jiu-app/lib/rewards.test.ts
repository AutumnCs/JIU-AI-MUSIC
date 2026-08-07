import assert from 'node:assert/strict';
import test from 'node:test';

import { LEVELS } from './constants.ts';

test('academy stages award one matching fragment type', () => {
  const rewards = [1, 2, 3].map((stageId) => {
    const values = new Set(LEVELS.filter((level) => level.stageId === stageId).map((level) => level.rewardType));
    assert.equal(values.size, 1);
    return [...values][0];
  });
  assert.deepEqual(rewards, ['绒羽', '怪羽', '暗羽']);
});
