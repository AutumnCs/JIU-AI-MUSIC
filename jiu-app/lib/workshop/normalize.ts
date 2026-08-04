import type { PublishedWork, WorkshopDraft, WorkshopProviderName } from './types.ts';

const DEFAULT_DRAFT: WorkshopDraft = {
  title: '',
  idea: '',
  lyrics: '',
  lyricsMode: 'ai',
  instrumental: false,
  genre: 'pop',
  mood: 'happy',
  voice: 'female',
  instruments: ['piano'],
};

type StoredRecord = Record<string, unknown>;

export function normalizeStoredDraft(raw: string | null): WorkshopDraft | null {
  const parsed = parseRecord(raw);
  if (!parsed) return null;

  if (
    !isOptionalString(parsed.title) ||
    !isOptionalString(parsed.idea) ||
    !isOptionalString(parsed.lyrics) ||
    !isOptionalLyricsMode(parsed.lyricsMode) ||
    !isOptionalBoolean(parsed.instrumental) ||
    !isOptionalString(parsed.genre) ||
    !isOptionalString(parsed.mood) ||
    !isOptionalVoice(parsed.voice) ||
    !isOptionalStringArray(parsed.instruments)
  ) {
    return null;
  }

  return {
    title: parsed.title ?? DEFAULT_DRAFT.title,
    idea: parsed.idea ?? DEFAULT_DRAFT.idea,
    lyrics: parsed.lyrics ?? DEFAULT_DRAFT.lyrics,
    lyricsMode: parsed.lyricsMode ?? DEFAULT_DRAFT.lyricsMode,
    instrumental: parsed.instrumental ?? DEFAULT_DRAFT.instrumental,
    genre: parsed.genre ?? DEFAULT_DRAFT.genre,
    mood: parsed.mood ?? DEFAULT_DRAFT.mood,
    voice: parsed.voice ?? DEFAULT_DRAFT.voice,
    instruments: parsed.instruments ?? DEFAULT_DRAFT.instruments,
  };
}

export function normalizeStoredPublishedWorks(raw: string | null): PublishedWork[] | null {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return null;

  return parsed.flatMap(normalizePublishedWork);
}

function normalizePublishedWork(value: unknown): PublishedWork[] {
  if (!isRecord(value)) return [];

  const { id, title, genre, mood, status, audio } = value;
  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    typeof title !== 'string' ||
    typeof genre !== 'string' ||
    typeof mood !== 'string' ||
    (status !== 'saved' && status !== 'published') ||
    typeof audio !== 'string' ||
    !isOptionalString(value.lyrics) ||
    !isOptionalStringArray(value.instruments) ||
    !isOptionalString(value.caption) ||
    !isOptionalString(value.emoji) ||
    !isOptionalString(value.createdAt) ||
    !isOptionalString(value.authorId) ||
    !isOptionalProviderName(value.sourceProvider)
  ) {
    return [];
  }

  return [{
    id,
    title,
    lyrics: value.lyrics ?? '',
    genre,
    mood,
    instruments: value.instruments ?? [],
    status,
    audio,
    caption: value.caption ?? '',
    emoji: value.emoji ?? '🎵',
    createdAt: value.createdAt ?? '',
    authorId: value.authorId ?? '',
    sourceProvider: value.sourceProvider ?? 'local',
  }];
}

function parseRecord(raw: string | null): StoredRecord | null {
  const parsed = parseJson(raw);
  return isRecord(parsed) ? parsed : null;
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is StoredRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === 'boolean';
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

function isOptionalLyricsMode(value: unknown): value is WorkshopDraft['lyricsMode'] | undefined {
  return value === undefined || value === 'ai' || value === 'write' || value === 'continue';
}

function isOptionalVoice(value: unknown): value is WorkshopDraft['voice'] | undefined {
  return value === undefined || value === 'female' || value === 'male';
}

function isOptionalProviderName(value: unknown): value is WorkshopProviderName | undefined {
  return value === undefined || value === 'local' || value === 'upstream';
}
