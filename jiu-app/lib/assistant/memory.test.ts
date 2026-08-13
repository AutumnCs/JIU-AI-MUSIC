import assert from 'node:assert/strict';
import test from 'node:test';

import { assistantMemoryKey, readAssistantMemory, writeAssistantMemory } from './memory.ts';

test('scopes assistant memory by account id', () => {
  const storage = new Map<string, string>();
  const adapter = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  };
  const first = [{ role: 'user' as const, content: '我是小明' }];
  writeAssistantMemory('user-a', first, adapter);
  assert.equal(assistantMemoryKey('user-a'), 'jiu_assistant_messages:user-a');
  assert.deepEqual(readAssistantMemory('user-a', adapter), first);
  assert.deepEqual(readAssistantMemory('user-b', adapter), []);
});

test('ignores malformed history and caps retained messages', () => {
  const storage = new Map<string, string>([['jiu_assistant_messages:user-a', '{bad']]);
  const adapter = { getItem: (key: string) => storage.get(key) ?? null, setItem: () => {} };
  assert.deepEqual(readAssistantMemory('user-a', adapter), []);
});
