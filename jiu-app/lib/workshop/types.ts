export type WorkshopProviderName = 'upstream' | 'local';

export type WorkshopTaskStatus = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';

export type LyricsMode = 'ai' | 'write' | 'continue';
export type Voice = 'female' | 'male';

export interface WorkshopDraft {
  title: string;
  idea: string;
  lyrics: string;
  lyricsMode: LyricsMode;
  instrumental: boolean;
  genre: string;
  mood: string;
  voice: Voice;
  instruments: string[];
}

export interface WorkshopTask {
  id: string;
  status: WorkshopTaskStatus;
  provider: WorkshopProviderName;
  request: WorkshopDraft;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  progressStep?: string;
  result?: WorkshopGenerationResult;
}

export interface WorkshopGenerationResult {
  taskId: string;
  title: string;
  lyrics: string;
  audioUrl: string;
  coverImageUrl?: string;
  genre: string;
  mood: string;
  instruments: string[];
  sourceProvider: WorkshopProviderName;
  caption?: string;
  emoji?: string;
}

export interface PublishedWork {
  id: number;
  taskId?: string;
  title: string;
  status: 'saved' | 'published';
  audio: string;
  caption?: string;
  emoji?: string;
  genre: string;
  mood: string;
  createdAt: string;
  authorId?: string;
  sourceProvider?: WorkshopProviderName;
  lyrics?: string;
  instruments?: string[];
}

export interface WorkshopProvider {
  provider: WorkshopProviderName;
  createTask(draft: WorkshopDraft): Promise<WorkshopTask>;
  getTask?(taskId: string): Promise<WorkshopTask | null>;
}
