import { describe, expect, test } from 'vitest';
import { buildTutorHistory, rememberTutorTurn, pruneMemory } from './memory.ts';
import type { ChatMessage, MemoryItem } from './types.ts';

describe('assistant memory lifecycle', () => {
  test('keeps only the last four conversation turns', () => {
    const messages: ChatMessage[] = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: String(index) }));
    expect(buildTutorHistory(messages).map((item) => item.content)).toEqual(['4', '5', '6', '7', '8', '9', '10', '11']);
  });

  test('decays stale memory and forgets ordinary topics after seven days', () => {
    const now = Date.now();
    const memories: MemoryItem[] = [
      { topic: 'old', summary: 'old', confidence: 1, importance: 1, createdAt: now - 8 * 86400000, lastUsedAt: now - 8 * 86400000 },
      { topic: 'recent', summary: 'recent', confidence: 1, importance: 2, createdAt: now - 2 * 86400000, lastUsedAt: now - 2 * 86400000 },
    ];
    const result = pruneMemory(memories, now);
    expect(result.map((item) => item.topic)).toEqual(['recent']);
    expect(result[0].confidence).toBeLessThan(1);
  });

  test('repeated practice raises importance and mastery lowers it', () => {
    const first = rememberTutorTurn([], 'music-pitch', '音高是声音的高低', { repeated: true, now: 100 });
    const mastered = rememberTutorTurn(first, 'music-pitch', '我已经会了', { mastered: true, now: 200 });
    expect(mastered[0].importance).toBeLessThan(first[0].importance);
    expect(mastered[0].confidence).toBeGreaterThan(0);
  });
});
