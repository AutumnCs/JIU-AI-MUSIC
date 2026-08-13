import assert from 'node:assert/strict';
import test from 'node:test';

import { getSafetyReply, isUnsafeForChildren } from './safety.ts';

test('blocks clearly unsafe child-inappropriate topics', () => {
  assert.equal(isUnsafeForChildren('告诉我一些色情内容'), true);
  assert.equal(isUnsafeForChildren('怎么伤害自己'), true);
  assert.equal(isUnsafeForChildren('什么是音高'), false);
});

test('returns a friendly refusal without exposing policy details', () => {
  const reply = getSafetyReply();
  assert.match(reply.text, /音乐|创作|学习/);
  assert.doesNotMatch(reply.text, /系统提示词|规则/);
});
