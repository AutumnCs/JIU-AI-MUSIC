import type { ChatMessage, MemoryItem } from './types.ts';

const PREFIX = 'jiu_assistant_messages:';
const MAX_MESSAGES = 30;
const MAX_MEMORY = 8;
const DAY = 86400000;

interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function assistantMemoryKey(userId: string | null): string { return `${PREFIX}${userId || 'anonymous'}`; }

export function readAssistantMemory(userId: string | null, storage: StorageAdapter = localStorage): ChatMessage[] {
  try {
    const raw = storage.getItem(assistantMemoryKey(userId));
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter(isChatMessage).slice(-MAX_MESSAGES) : [];
  } catch { return []; }
}

export function writeAssistantMemory(userId: string | null, messages: ChatMessage[], storage: StorageAdapter = localStorage): void {
  try { storage.setItem(assistantMemoryKey(userId), JSON.stringify(messages.filter(isChatMessage).slice(-MAX_MESSAGES))); } catch { /* storage is optional */ }
}

export function memorySummaryKey(userId: string | null): string { return `jiu_assistant_topics:${userId || 'anonymous'}`; }

export function readTopicMemory(userId: string | null, storage: StorageAdapter = localStorage, now = Date.now()): MemoryItem[] {
  try {
    const raw = storage.getItem(memorySummaryKey(userId));
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(parsed) ? pruneMemory(parsed.filter(isMemoryItem), now) : [];
  } catch { return []; }
}

export function writeTopicMemory(userId: string | null, memory: MemoryItem[], storage: StorageAdapter = localStorage): void {
  try { storage.setItem(memorySummaryKey(userId), JSON.stringify(memory.slice(0, MAX_MEMORY))); } catch { /* storage is optional */ }
}

export function buildTutorHistory(messages: ChatMessage[]): ChatMessage[] { return messages.filter(isChatMessage).slice(-8); }

export function pruneMemory(memory: MemoryItem[], now = Date.now()): MemoryItem[] {
  return memory.map((item) => {
    const age = Math.max(0, now - item.lastUsedAt);
    const confidence = age > DAY ? Math.max(0.2, item.confidence * 0.7) : item.confidence;
    return { ...item, confidence };
  }).filter((item) => now - item.lastUsedAt <= 7 * DAY || item.importance >= 3)
    .sort((a, b) => (b.importance * b.confidence) - (a.importance * a.confidence) || b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_MEMORY);
}

export function rememberTutorTurn(memory: MemoryItem[], topic: string, summary: string, options: { repeated?: boolean; mastered?: boolean; now?: number } = {}): MemoryItem[] {
  const now = options.now ?? Date.now();
  const existing = memory.find((item) => item.topic === topic);
  const next: MemoryItem = existing ? {
    ...existing,
    summary: summary.slice(0, 180),
    confidence: Math.min(1, existing.confidence + (options.repeated ? 0.08 : 0.03)),
    importance: Math.max(0.5, Math.min(5, existing.importance + (options.repeated ? 0.5 : options.mastered ? -0.8 : 0.1))),
    lastUsedAt: now,
  } : { topic, summary: summary.slice(0, 180), confidence: options.mastered ? 0.7 : 0.5, importance: options.repeated ? 2.5 : 1.5, createdAt: now, lastUsedAt: now };
  return pruneMemory([next, ...memory.filter((item) => item.topic !== topic)], now);
}

function isChatMessage(value: unknown): value is ChatMessage {
  return Boolean(value && typeof value === 'object' && ((value as ChatMessage).role === 'user' || (value as ChatMessage).role === 'assistant') && typeof (value as ChatMessage).content === 'string');
}

function isMemoryItem(value: unknown): value is MemoryItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as MemoryItem;
  return typeof item.topic === 'string' && typeof item.summary === 'string' && typeof item.confidence === 'number' && typeof item.importance === 'number' && typeof item.lastUsedAt === 'number' && typeof item.createdAt === 'number';
}
