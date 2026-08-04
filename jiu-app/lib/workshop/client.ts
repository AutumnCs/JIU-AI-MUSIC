import { createWorkshopProvider } from './provider.ts';
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
  const provider = createWorkshopProvider(options);

  return {
    readDraft: () => readWorkshopDraft(activeUserId, source) ?? copyDraft(DEFAULT_DRAFT),
    readWorks: () => readWorkshopWorks(activeUserId, source),
    writeDraft: (draft) => writeWorkshopDraft(activeUserId, draft),
    generate: (draft, onProgress) => generateWithProvider(provider, draft, onProgress),
    writeWork: (result, work) => writeWorkshopWork(activeUserId, {
      ...work,
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
  draft: WorkshopDraft,
  onProgress?: (task: WorkshopTask) => void,
): Promise<WorkshopTask> {
  let task = await provider.createTask(draft);
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
