import { test, assert } from 'vitest';
import { shouldAnswerWithMock } from './knowledge.ts';

test('routes a known music concept to the fast local provider', () => {
  assert.equal(shouldAnswerWithMock('什么是音高？', { page: 'home' }), true);
  assert.equal(shouldAnswerWithMock('帮我写一首关于夏天的歌', { page: 'workshop' }), false);
});
