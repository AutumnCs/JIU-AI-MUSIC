import { createWorkshopProvider } from './provider.ts';
import { createMusicWorkshopProvider } from './music-provider.ts';
import {
  readWorkshopDraft,
  readWorkshopWorks,
  writeWorkshopDraft,
  writeWorkshopWork,
} from './storage.ts';
import type {
  PublishedWork,
  WorkshopDraft,
  WorkshopGenerationResult,
  WorkshopProvider,
  WorkshopTask,
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

export interface WorkshopClient {
  readDraft(): WorkshopDraft;
  readWorks(): PublishedWork[];
  writeDraft(draft: WorkshopDraft): void;
  generate(draft: WorkshopDraft, onProgress?: (task: WorkshopTask) => void): Promise<WorkshopTask>;
  writeWork(result: WorkshopGenerationResult, work: PublishedWork): void;
}

export function createWorkshopClient(
  activeUserId: string | null,
  source: 'local' | 'server',
  options: { baseUrl?: string; sampleAudioUrl?: string } = {},
): WorkshopClient {
  const provider = createWorkshopProvider({
    baseUrl: source === 'server' ? resolveBaseUrl(options.baseUrl) : options.baseUrl,
    sampleAudioUrl: options.sampleAudioUrl,
  });
  const musicProvider = source === 'server'
    ? createMusicWorkshopProvider({ baseUrl: resolveBaseUrl(options.baseUrl) ?? '' })
    : null;
  const fallbackProvider = createWorkshopProvider({ sampleAudioUrl: options.sampleAudioUrl });

  return {
    readDraft: () => readWorkshopDraft(activeUserId, source) ?? copyDraft(DEFAULT_DRAFT),
    readWorks: () => readWorkshopWorks(activeUserId, source),
    writeDraft: (draft) => writeWorkshopDraft(activeUserId, draft),
    generate: (draft, onProgress) => generateWithProvider(musicProvider ?? provider, source === 'local' ? fallbackProvider : undefined, draft, onProgress),
    writeWork: (result, work) => writeWorkshopWork(activeUserId, {
      ...work,
      taskId: result.taskId,
      audio: result.audioUrl,
      genre: result.genre,
      mood: result.mood,
      sourceProvider: result.sourceProvider,
      lyrics: result.lyrics,
      instruments: [...result.instruments],
    }),
  };
}

async function generateWithProvider(
  provider: WorkshopProvider,
  fallbackProvider: WorkshopProvider | undefined,
  draft: WorkshopDraft,
  onProgress?: (task: WorkshopTask) => void,
): Promise<WorkshopTask> {
  let task: WorkshopTask;
  try {
    task = await provider.createTask(draft);
  } catch (error) {
    if (provider.provider !== 'upstream' || !fallbackProvider) throw error;
    task = await fallbackProvider.createTask(draft);
  }
  onProgress?.(task);

  while ((task.status === 'queued' || task.status === 'running') && provider.getTask) {
    await delay(1050);
    const nextTask = await provider.getTask(task.id);
    if (!nextTask) throw new Error('Workshop generation task was not found');
    task = nextTask;
    onProgress?.(task);
  }

  return task;
}

function copyDraft(draft: WorkshopDraft): WorkshopDraft {
  return { ...draft, instruments: [...draft.instruments] };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function resolveBaseUrl(baseUrl?: string): string | undefined {
  const trimmed = baseUrl?.trim();
  if (trimmed) return trimmed;

  if (typeof globalThis.location?.origin === 'string' && globalThis.location.origin.trim()) {
    return globalThis.location.origin.trim();
  }

  return undefined;
}
