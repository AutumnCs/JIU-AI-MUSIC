import type {
  WorkshopDraft,
  WorkshopGenerationResult,
  WorkshopProvider,
  WorkshopTask,
  WorkshopTaskStatus,
} from './types.ts';

export function createRemoteWorkshopProvider(options: { baseUrl: string }): WorkshopProvider {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  return {
    provider: 'upstream',
    async createTask(draft) {
      const response = await fetch(`${baseUrl}/api/workshop/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = await readJson(response);
      const task = normalizeUpstreamTask(payload, draft);

      if (!task) throw new Error('Invalid upstream workshop task payload');
      return task;
    },
    async getTask(taskId) {
      const response = await fetch(`${baseUrl}/api/workshop/tasks/${encodeURIComponent(taskId)}`);
      if (response.status === 404) return null;

      return normalizeUpstreamTask(await readJson(response));
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`Upstream workshop request failed (${response.status})`);
  return response.json();
}

function normalizeUpstreamTask(payload: unknown, fallbackDraft?: WorkshopDraft): WorkshopTask | null {
  const raw = unwrapPayload(payload);
  if (!raw) return null;

  const id = stringValue(raw.id, raw.task_id, raw.taskId);
  const status = normalizeStatus(raw.status);
  const request = normalizeDraft(raw.request ?? raw.draft ?? raw.input) ?? fallbackDraft;
  if (!id || !status || !request) return null;

  const result = normalizeResult(raw.result ?? raw.output, id, request);
  const createdAt = stringValue(raw.createdAt, raw.created_at) ?? new Date().toISOString();
  const updatedAt = stringValue(raw.updatedAt, raw.updated_at) ?? createdAt;
  const errorMessage = stringValue(raw.errorMessage, raw.error_message, raw.error);
  const progressStep = stringValue(raw.progressStep, raw.progress_step);

  return {
    id,
    status,
    provider: 'upstream',
    request,
    createdAt,
    updatedAt,
    ...(errorMessage ? { errorMessage } : {}),
    ...(progressStep ? { progressStep } : {}),
    ...(result ? { result } : {}),
  };
}

function normalizeResult(raw: unknown, taskId: string, draft: WorkshopDraft): WorkshopGenerationResult | null {
  const record = asRecord(raw);
  if (!record) return null;

  const audioUrl = stringValue(record.audioUrl, record.audio_url, record.audio, record.url);
  if (!audioUrl) return null;
  const coverImageUrl = stringValue(record.coverImageUrl, record.cover_image_url);
  const caption = stringValue(record.caption);
  const emoji = stringValue(record.emoji);

  return {
    taskId,
    title: stringValue(record.title) ?? draft.title,
    lyrics: stringValue(record.lyrics) ?? draft.lyrics,
    audioUrl,
    ...(coverImageUrl ? { coverImageUrl } : {}),
    genre: stringValue(record.genre) ?? draft.genre,
    mood: stringValue(record.mood) ?? draft.mood,
    instruments: stringArray(record.instruments) ?? [...draft.instruments],
    sourceProvider: 'upstream',
    ...(caption ? { caption } : {}),
    ...(emoji ? { emoji } : {}),
  };
}

function normalizeDraft(value: unknown): WorkshopDraft | null {
  const record = asRecord(value);
  if (!record) return null;
  if (!isLyricsMode(record.lyricsMode) || !isVoice(record.voice)) return null;

  return {
    title: stringValue(record.title) ?? '',
    idea: stringValue(record.idea) ?? '',
    lyrics: stringValue(record.lyrics) ?? '',
    lyricsMode: record.lyricsMode,
    instrumental: typeof record.instrumental === 'boolean' ? record.instrumental : false,
    genre: stringValue(record.genre) ?? 'pop',
    mood: stringValue(record.mood) ?? 'happy',
    voice: record.voice,
    instruments: stringArray(record.instruments) ?? [],
  };
}

function unwrapPayload(value: unknown): Record<string, unknown> | null {
  const record = asRecord(value);
  if (!record) return null;
  return asRecord(record.data) ?? record;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(...values: unknown[]): string | null {
  return values.find((value): value is string => typeof value === 'string') ?? null;
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function normalizeStatus(value: unknown): WorkshopTaskStatus | null {
  if (value === 'completed') return 'succeeded';
  if (value === 'processing') return 'running';
  if (value === 'pending') return 'queued';
  return value === 'idle' || value === 'queued' || value === 'running' || value === 'succeeded' || value === 'failed'
    ? value
    : null;
}

function isLyricsMode(value: unknown): value is WorkshopDraft['lyricsMode'] {
  return value === 'ai' || value === 'write' || value === 'continue';
}

function isVoice(value: unknown): value is WorkshopDraft['voice'] {
  return value === 'female' || value === 'male';
}
