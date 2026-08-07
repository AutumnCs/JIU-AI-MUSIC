import { signRequest, type LoadedCredentials } from './sign.ts';

export const VOLC_HOST = 'open.volcengineapi.com';
export const VOLC_REGION = 'cn-beijing';
export const VOLC_SERVICE = 'imagination';
export const VOLC_VERSION = '2024-08-12';
export const STATUS_PENDING = 0 as const;
export const STATUS_RUNNING = 1 as const;
export const STATUS_SUCCESS = 2 as const;
export const STATUS_FAILED = 3 as const;
export type SongStatus = 0 | 1 | 2 | 3;

export type GenBGMParams = { text: string; duration?: number; instruments?: string[]; callbackUrl?: string };
export type GenSongParams = { lyrics?: string; prompt?: string; modelVersion?: 'v4.0' | 'v4.3' | 'v5.0'; genre?: string; mood?: string; gender?: 'Female' | 'Male'; timbre?: string; duration?: number; instruments?: string[]; lang?: string; vodFormat?: 'wav' | 'mp3' };
export type SubmitResponse = { taskId: string; predictedWaitTime: number };
export type QuerySongResult = { taskId: string; status: SongStatus; progress: number; audioUrl?: string; lyrics?: string; duration?: number; failureReason: { code: number; msg: string } | null };

export class VolcApiError extends Error {
  readonly code: number;
  readonly action: string;
  readonly requestId: string;

  constructor(code: number, message: string, action: string, requestId = 'unknown') {
    super(`[Volcengine ${action}] ${code} ${message}`);
    this.name = 'VolcApiError';
    this.code = code;
    this.action = action;
    this.requestId = requestId;
  }
}

export function submitGenBGMForTime(params: GenBGMParams, credentials: LoadedCredentials) {
  const text = appendInstruments(params.text, params.instruments);
  return call<{ TaskID: string; PredictedWaitTime: number }>('GenBGMForTime', {
    Text: text, Duration: params.duration, Version: 'v5.0', CallbackURL: params.callbackUrl ?? '', EnableInputRewrite: false,
  }, credentials).then((value) => ({ taskId: value.TaskID, predictedWaitTime: value.PredictedWaitTime }));
}

export function submitGenSongForTime(params: GenSongParams, credentials: LoadedCredentials) {
  const lyrics = params.lyrics?.trim();
  const prompt = params.prompt?.trim();
  if (!lyrics && !prompt) throw new Error('GenSongForTime requires either Lyrics or Prompt');
  const body: Record<string, unknown> = { ModelVersion: params.modelVersion ?? 'v4.0', Lang: params.lang ?? 'Chinese', VodFormat: params.vodFormat ?? 'wav' };
  if (lyrics) body.Lyrics = lyrics;
  else body.Prompt = appendInstruments(prompt!, params.instruments);
  if (params.genre) body.Genre = params.genre;
  if (params.mood) body.Mood = params.mood;
  if (params.gender) body.Gender = params.gender;
  if (params.timbre) body.Timbre = params.timbre;
  if (params.duration !== undefined) body.Duration = params.duration;
  return call<{ TaskID: string; PredictedWaitTime: number }>('GenSongForTime', body, credentials)
    .then((value) => ({ taskId: value.TaskID, predictedWaitTime: value.PredictedWaitTime }));
}

export function querySong(taskId: string, credentials: LoadedCredentials, signal?: AbortSignal) {
  return call<ProviderQuery>('QuerySong', { TaskID: taskId }, credentials, signal).then(normalizeQuery);
}

export async function pollSongUntilDone(taskId: string, credentials: LoadedCredentials, options: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}) {
  const started = Date.now();
  while (true) {
    const result = await querySong(taskId, credentials, options.signal);
    if (result.status === STATUS_SUCCESS || result.status === STATUS_FAILED) return result;
    if (Date.now() - started > (options.timeoutMs ?? 300000)) throw new Error('Polling timed out');
    await new Promise((resolve) => setTimeout(resolve, options.intervalMs ?? 3000));
  }
}

type ProviderResponse<T> = { Code: number; Message?: string; Result: T; ResponseMetadata?: { RequestId?: string } };
type ProviderQuery = { TaskID: string; Status: SongStatus; Progress: number; FailureReason: { Code: number; Msg: string } | null; SongDetail?: { AudioUrl?: string; Lyrics?: string; Duration?: number } };

async function call<T>(action: string, body: unknown, credentials: LoadedCredentials, signal?: AbortSignal): Promise<T> {
  const bodyString = JSON.stringify(body);
  const signed = signRequest({ method: 'POST', uri: '/', query: { Action: action, Version: VOLC_VERSION }, headers: { 'Content-Type': 'application/json' }, body: bodyString, region: VOLC_REGION, serviceName: VOLC_SERVICE, accessKeyId: credentials.accessKeyId, secretAccessKey: credentials.secretAccessKey, sessionToken: credentials.sessionToken, host: VOLC_HOST });
  const response = await fetch(`https://${VOLC_HOST}?Action=${action}&Version=${VOLC_VERSION}`, { method: 'POST', headers: signed.headers, body: bodyString, signal });
  const json = await response.json() as ProviderResponse<T>;
  if (!response.ok || json.Code !== 0) throw new VolcApiError(json.Code ?? response.status, json.Message ?? `HTTP ${response.status}`, action, json.ResponseMetadata?.RequestId);
  return json.Result;
}

function normalizeQuery(value: ProviderQuery): QuerySongResult {
  return { taskId: value.TaskID, status: value.Status, progress: value.Progress, audioUrl: value.SongDetail?.AudioUrl, lyrics: value.SongDetail?.Lyrics, duration: value.SongDetail?.Duration, failureReason: value.FailureReason ? { code: value.FailureReason.Code, msg: value.FailureReason.Msg } : null };
}
function appendInstruments(text: string, instruments?: string[]) { return instruments?.length ? `${text}，主乐器：${instruments.join('、')}` : text; }
