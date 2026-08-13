import assert from 'node:assert/strict';
import test from 'node:test';

import { createMockTutorProvider } from './mock-provider.ts';
import type { TutorRequest } from './types.ts';

const base: TutorRequest = {
  message: '什么是音高？',
  history: [],
  context: { page: 'academy', levelId: 1, wrongStreak: 0 },
};

test('mock provider explains a known music concept', async () => {
  const reply = await createMockTutorProvider().chat(base);
  assert.equal(reply.provider, 'mock');
  assert.match(reply.text, /高|低/);
  assert.ok(reply.sourceIds?.includes('music-pitch'));
});

test('mock provider adapts academy help to the mistake streak', async () => {
  const reply = await createMockTutorProvider().chat({
    ...base,
    message: '我总是答错，怎么练？',
    context: { page: 'academy', levelId: 1, wrongStreak: 3 },
  });
  assert.match(reply.text, /提示|慢|再试/);
});

test('mock provider supports limited follow-up context', async () => {
  const reply = await createMockTutorProvider().chat({
    ...base,
    message: '那节拍呢？',
    history: [{ role: 'user', content: '什么是音乐？' }, { role: 'assistant', content: '音乐里有节拍。' }],
  });
  assert.match(reply.text, /节拍|心跳/);
});
