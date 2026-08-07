import type { WorkshopDraft, WorkshopProvider, WorkshopTask } from './types.ts';

export function createMusicWorkshopProvider(options: { baseUrl: string }): WorkshopProvider {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const drafts = new Map<string, WorkshopDraft>();
  return {
    provider: 'upstream',
    async createTask(draft) {
      const response = await fetch(`${baseUrl}/api/music/create`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toCreateBody(draft)),
      });
      const payload = await readJson(response);
      const taskId = recordString(payload, 'taskId');
      if (!taskId) throw new Error('Invalid music task response');
      const now = new Date().toISOString();
      drafts.set(taskId, draft);
      return { id: taskId, status: 'queued', provider: 'upstream', request: draft, createdAt: now, updatedAt: now };
    },
    async getTask(taskId) {
      const response = await fetch(`${baseUrl}/api/music/status/${encodeURIComponent(taskId)}`);
      if (response.status === 404) return null;
      const payload = await readJson(response);
      return normalizeTask(payload, taskId, drafts.get(taskId));
    },
  };
}

function toCreateBody(draft: WorkshopDraft) {
  return {
    track: draft.instrumental ? 'instrumental' : 'vocal',
    instrumental: draft.instrumental,
    text: draft.instrumental ? draft.idea : undefined,
    prompt: !draft.instrumental && !draft.lyrics.trim() ? draft.idea : undefined,
    lyrics: draft.instrumental ? undefined : draft.lyrics || undefined,
    genre: draft.genre,
    mood: draft.mood,
    gender: draft.voice === 'female' ? 'Female' : 'Male',
    instruments: draft.instruments,
  };
}

function normalizeTask(payload: unknown, taskId: string, draft?: WorkshopDraft): WorkshopTask {
  const record = asRecord(payload);
  const status = recordString(record, 'status');
  const now = new Date().toISOString();
  const request = draft ?? {
    title: '', idea: '', lyrics: '', lyricsMode: 'ai', instrumental: false,
    genre: 'pop', mood: 'happy', voice: 'female', instruments: [],
  } satisfies WorkshopDraft;
  const audioUrl = recordString(record, 'audioUrl');
  const lyrics = recordString(record, 'lyrics') ?? '';
  const isSuccess = status === 'success';
  return {
    id: taskId,
    status: isSuccess ? 'succeeded' : status === 'failed' ? 'failed' : status === 'running' ? 'running' : 'queued',
    provider: 'upstream',
    request,
    createdAt: now,
    updatedAt: now,
    ...(recordString(record, 'failureReason') ? { errorMessage: recordString(record, 'failureReason')! } : {}),
    ...(isSuccess && audioUrl ? { result: { taskId, title: request.title || request.idea || 'Untitled song', lyrics: lyrics || request.lyrics, audioUrl, genre: request.genre, mood: request.mood, instruments: [...request.instruments], sourceProvider: 'upstream' } } : {}),
  };
}

async function readJson(response: Response) {
  if (!response.ok) throw new Error(`Music API request failed (${response.status})`);
  return response.json() as Promise<unknown>;
}

function asRecord(value: unknown): Record<string, unknown> { return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}; }
function recordString(value: unknown, key: string) { const result = asRecord(value)[key]; return typeof result === 'string' ? result : null; }
