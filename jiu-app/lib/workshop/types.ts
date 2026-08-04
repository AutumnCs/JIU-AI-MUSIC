export type WorkshopLyricsMode = 'ai' | 'write' | 'continue';
export type WorkshopVoice = 'female' | 'male';
export type WorkshopTaskStatus = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';
export type WorkshopProviderName = 'local' | 'upstream';

export interface WorkshopDraft {
  title: string;
  idea: string;
  lyrics: string;
  lyricsMode: WorkshopLyricsMode;
  instrumental: boolean;
  genre: string;
  mood: string;
  voice: WorkshopVoice;
  instruments: string[];
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
}

export interface WorkshopTask {
  id: string;
  status: WorkshopTaskStatus;
  provider: WorkshopProviderName;
  draft: WorkshopDraft;
  progressSteps: string[];
  createdAt: string;
  updatedAt: string;
  result?: WorkshopGenerationResult;
  errorMessage?: string;
}

export interface PublishedWork {
  id: string | number;
  title: string;
  lyrics: string;
  genre: string;
  mood: string;
  instruments: string[];
  status: 'saved' | 'published';
  audio: string;
  caption: string;
  emoji: string;
  createdAt: string;
  authorId: string;
  sourceProvider: WorkshopProviderName;
}

export interface WorkshopProvider {
  createTask(draft: WorkshopDraft): Promise<WorkshopTask>;
}
