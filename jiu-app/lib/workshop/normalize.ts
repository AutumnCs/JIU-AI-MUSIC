import type {
  PublishedWork,
  WorkshopDraft,
  WorkshopGenerationResult,
  WorkshopTask,
  WorkshopTaskStatus,
} from './types.ts';

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

export function normalizeStoredDraft(raw: string | null): WorkshopDraft | null {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) return null;

  const lyricsMode = parsed.lyricsMode;
  const voice = parsed.voice;

  if (!isLyricsMode(lyricsMode) || !isVoice(voice)) return null;

  return {
    title: typeof parsed.title === 'string' ? parsed.title : DEFAULT_DRAFT.title,
    idea: typeof parsed.idea === 'string' ? parsed.idea : DEFAULT_DRAFT.idea,
    lyrics: typeof parsed.lyrics === 'string' ? parsed.lyrics : DEFAULT_DRAFT.lyrics,
    lyricsMode,
    instrumental: typeof parsed.instrumental === 'boolean' ? parsed.instrumental : DEFAULT_DRAFT.instrumental,
    genre: typeof parsed.genre === 'string' ? parsed.genre : DEFAULT_DRAFT.genre,
    mood: typeof parsed.mood === 'string' ? parsed.mood : DEFAULT_DRAFT.mood,
    voice,
    instruments: Array.isArray(parsed.instruments)
      ? parsed.instruments.filter((item): item is string => typeof item === 'string')
      : [...DEFAULT_DRAFT.instruments],
  };
}

export function normalizeStoredPublishedWorks(raw: string | null): PublishedWork[] | null {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return null;

  const works = parsed.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    if (typeof entry.id !== 'number') return [];
    if (typeof entry.title !== 'string') return [];
    if (entry.status !== 'saved' && entry.status !== 'published') return [];
    if (typeof entry.audio !== 'string') return [];
    if (typeof entry.genre !== 'string') return [];
    if (typeof entry.mood !== 'string') return [];

    const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    const sourceProvider = entry.sourceProvider === 'upstream' || entry.sourceProvider === 'local'
      ? entry.sourceProvider
      : undefined;

    const work: PublishedWork = {
      id: entry.id,
      title: entry.title,
      status: entry.status as 'saved' | 'published',
      audio: entry.audio,
      caption: typeof entry.caption === 'string' ? entry.caption : undefined,
      emoji: typeof entry.emoji === 'string' ? entry.emoji : undefined,
      genre: entry.genre,
      mood: entry.mood,
      createdAt,
      authorId: typeof entry.authorId === 'string' ? entry.authorId : undefined,
      sourceProvider,
      lyrics: typeof entry.lyrics === 'string' ? entry.lyrics : undefined,
      instruments: Array.isArray(entry.instruments)
        ? entry.instruments.filter((item): item is string => typeof item === 'string')
        : undefined,
    };

    return [work];
  });

  return works;
}

export function normalizeWorkshopTask(raw: unknown): WorkshopTask | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string') return null;
  if (!isWorkshopTaskStatus(raw.status)) return null;
  if (raw.provider !== 'upstream' && raw.provider !== 'local') return null;
  if (!isRecord(raw.request)) return null;

  const request = normalizeStoredDraft(JSON.stringify(raw.request));
  if (!request) return null;

  return {
    id: raw.id,
    status: raw.status,
    provider: raw.provider,
    request,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    errorMessage: typeof raw.errorMessage === 'string' ? raw.errorMessage : undefined,
    progressStep: typeof raw.progressStep === 'string' ? raw.progressStep : undefined,
    result: isRecord(raw.result) ? normalizeWorkshopGenerationResult(raw.result) ?? undefined : undefined,
  };
}

export function normalizeWorkshopGenerationResult(raw: unknown): WorkshopGenerationResult | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.taskId !== 'string') return null;
  if (typeof raw.title !== 'string') return null;
  if (typeof raw.lyrics !== 'string') return null;
  if (typeof raw.audioUrl !== 'string') return null;
  if (typeof raw.genre !== 'string') return null;
  if (typeof raw.mood !== 'string') return null;
  if (raw.sourceProvider !== 'upstream' && raw.sourceProvider !== 'local') return null;

  return {
    taskId: raw.taskId,
    title: raw.title,
    lyrics: raw.lyrics,
    audioUrl: raw.audioUrl,
    coverImageUrl: typeof raw.coverImageUrl === 'string' ? raw.coverImageUrl : undefined,
    genre: raw.genre,
    mood: raw.mood,
    instruments: Array.isArray(raw.instruments)
      ? raw.instruments.filter((item): item is string => typeof item === 'string')
      : [],
    sourceProvider: raw.sourceProvider,
    caption: typeof raw.caption === 'string' ? raw.caption : undefined,
    emoji: typeof raw.emoji === 'string' ? raw.emoji : undefined,
  };
}

export function normalizePublishedWorkFromResult(result: WorkshopGenerationResult, status: 'saved' | 'published'): PublishedWork {
  return {
    id: Date.now(),
    title: result.title,
    status,
    audio: result.audioUrl,
    caption: result.caption,
    emoji: result.emoji,
    genre: result.genre,
    mood: result.mood,
    createdAt: new Date().toISOString(),
    sourceProvider: result.sourceProvider,
    lyrics: result.lyrics,
    instruments: [...result.instruments],
  };
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLyricsMode(value: unknown): value is WorkshopDraft['lyricsMode'] {
  return value === 'ai' || value === 'write' || value === 'continue';
}

function isVoice(value: unknown): value is WorkshopDraft['voice'] {
  return value === 'female' || value === 'male';
}

function isWorkshopTaskStatus(value: unknown): value is WorkshopTaskStatus {
  return value === 'idle' || value === 'queued' || value === 'running' || value === 'succeeded' || value === 'failed';
}
