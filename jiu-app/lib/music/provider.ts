import { loadCredentials } from '../volcengine/sign.ts';

import { MockMusicProvider } from './mock-provider.ts';
import {
  MusicProviderError,
  type MusicCreateInput,
  type MusicProvider,
  type MusicProviderName,
  type MusicTaskResult,
  type MusicTrack,
} from './types.ts';
import { VolcengineMusicProvider } from './volcengine-provider.ts';

type MusicProviderEnv = Record<string, string | undefined>;

type CurrentUser = { id: string };

type StoredMusicTask = {
  providerTaskId: string;
  track: MusicTrack;
  requestPayload: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  audioUrl: string | null;
  lyrics: string | null;
  failureCode: number | null;
  failureMessage: string | null;
};

type MusicTaskPatch = {
  status: StoredMusicTask['status'];
  progress: number;
  audioUrl: string | null;
  lyrics: string | null;
  failureCode: number | null;
  failureMessage: string | null;
};

type CreateTaskRecord = (input: {
  userId: string;
  providerTaskId: string;
  track: MusicTrack;
  requestPayload: Record<string, unknown>;
}) => Promise<unknown>;

export type CreatePostHandlerDependencies = {
  getCurrentUser: (request: Request) => Promise<{ user: CurrentUser | null }>;
  selectProvider: () => MusicProvider;
  createTaskRecord: CreateTaskRecord;
};

export type StatusGetHandlerDependencies = {
  getCurrentUser: (request: Request) => Promise<{ user: CurrentUser | null }>;
  findTask: (providerTaskId: string, userId: string) => Promise<StoredMusicTask | null>;
  selectProvider: (name: MusicProviderName) => MusicProvider;
  updateTask: (providerTaskId: string, userId: string, patch: MusicTaskPatch) => Promise<StoredMusicTask | null>;
  persistAudio: (sourceUrl: string, taskId: string) => Promise<{ url: string; persisted: boolean }>;
};

export class MusicProviderConfigurationError extends Error {
  readonly code: 'invalid_provider' | 'missing_credentials' | 'mock_in_production';

  constructor(code: MusicProviderConfigurationError['code'], message: string) {
    super(message);
    this.name = 'MusicProviderConfigurationError';
    this.code = code;
  }
}

export function selectMusicProvider(env: MusicProviderEnv = process.env, storedName?: MusicProviderName): MusicProvider {
  const configured = storedName ?? env.MUSIC_PROVIDER;
  if (configured !== undefined && configured !== 'volcengine' && configured !== 'mock') {
    throw new MusicProviderConfigurationError('invalid_provider', `Unknown music provider: ${configured}`);
  }

  if (configured === 'mock') {
    if (env.NODE_ENV === 'production') {
      throw new MusicProviderConfigurationError('mock_in_production', 'Mock music provider is unavailable in production');
    }
    return new MockMusicProvider();
  }

  try {
    return new VolcengineMusicProvider(loadCredentials(env));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Volcengine credentials are required';
    throw new MusicProviderConfigurationError('missing_credentials', message);
  }
}

export function createPostHandler(dependencies: CreatePostHandlerDependencies) {
  return async function post(request: Request): Promise<Response> {
    const auth = await dependencies.getCurrentUser(request);
    if (!auth.user) return jsonError('unauthorized', '请先创建游客身份', 401);

    let body: Record<string, unknown>;
    try {
      body = await request.json() as Record<string, unknown>;
    } catch {
      return jsonError('bad_request', '请求内容不是有效 JSON', 400);
    }

    try {
      const input = toCreateInput(body);
      const provider = dependencies.selectProvider();
      const created = await provider.createTask(input);
      await dependencies.createTaskRecord({
        userId: auth.user.id,
        providerTaskId: created.taskId,
        track: input.track,
        requestPayload: { ...body, track: input.track, provider: provider.name },
      });
      return Response.json({ taskId: created.taskId, predictedWaitTime: created.predictedWaitTime, track: input.track });
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

export function createGetHandler(dependencies: StatusGetHandlerDependencies) {
  return async function get(request: Request, context: { params: Promise<{ taskId: string }> }): Promise<Response> {
    const auth = await dependencies.getCurrentUser(request);
    if (!auth.user) return jsonError('unauthorized', '请先创建游客身份', 401);

    const { taskId } = await context.params;
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(taskId)) return jsonError('bad_request', '任务编号无效', 400);

    // Ownership is checked before provider selection or any external request.
    const task = await dependencies.findTask(taskId, auth.user.id);
    if (!task) return jsonError('not_found', '找不到这个音乐任务', 404);
    if (task.status === 'success' || task.status === 'failed') return Response.json(toResponse(task));

    const providerName = readStoredProviderName(task.requestPayload);
    if (!providerName) return jsonError('provider_error', '音乐任务缺少服务商信息', 503);

    try {
      const result = await dependencies.selectProvider(providerName).getTask(taskId);
      const patch = await toStatusPatch(result, task, dependencies.persistAudio);
      const updated = await dependencies.updateTask(taskId, auth.user.id, patch);
      return Response.json(updated ? toResponse(updated) : toResponse({ ...task, ...patch }));
    } catch (error) {
      return statusErrorResponse(error);
    }
  };
}

function toCreateInput(body: Record<string, unknown>): MusicCreateInput {
  const track = body.track ?? (body.instrumental ? 'instrumental' : 'vocal');
  if (track !== 'vocal' && track !== 'instrumental') throw new InputError('音乐类型无效');
  if (body.instruments !== undefined && (!Array.isArray(body.instruments) || body.instruments.length > 2 || !body.instruments.every(isString))) {
    throw new InputError('最多选择两种主乐器');
  }

  const input = body as MusicCreateInput;
  if (track === 'instrumental') {
    const text = firstNonEmpty(input.text, input.prompt);
    if (!text) throw new InputError('伴奏需要填写音乐描述');
    validateText(text, '音乐描述');
    return { ...input, track, text };
  }

  const lyrics = trimmed(input.lyrics);
  const prompt = firstNonEmpty(input.prompt, input.text);
  if (!lyrics && !prompt) throw new InputError('人声歌曲需要填写歌词或创作描述');
  validateText(lyrics ?? prompt!, lyrics ? '歌词' : '创作描述');
  return { ...input, track, lyrics, prompt };
}

async function toStatusPatch(
  result: MusicTaskResult,
  task: StoredMusicTask,
  persistAudio: StatusGetHandlerDependencies['persistAudio'],
): Promise<MusicTaskPatch> {
  let audioUrl = result.audioUrl ?? task.audioUrl;
  if (result.status === 'success' && result.audioUrl) {
    audioUrl = (await persistAudio(result.audioUrl, result.taskId)).url;
  }
  return {
    status: result.status,
    progress: result.progress,
    audioUrl,
    lyrics: result.lyrics ?? null,
    failureCode: result.failureReason?.code ?? null,
    failureMessage: result.failureReason?.msg ?? null,
  };
}

function readStoredProviderName(payload: Record<string, unknown>): MusicProviderName | null {
  const provider = payload.provider;
  return provider === 'volcengine' || provider === 'mock' ? provider : null;
}

function toResponse(task: StoredMusicTask) {
  return {
    taskId: task.providerTaskId,
    status: task.status,
    progress: task.progress,
    audioUrl: task.audioUrl ?? undefined,
    lyrics: task.lyrics ?? undefined,
    failureReason: task.failureCode === null ? null : { code: task.failureCode, msg: task.failureMessage ?? '' },
  };
}

function createErrorResponse(error: unknown): Response {
  if (error instanceof InputError) return jsonError('bad_request', error.message, 400);
  if (error instanceof MusicProviderConfigurationError) return jsonError('missing_credentials', '音乐服务尚未配置', 503);
  if (error instanceof MusicProviderError) return jsonError('provider_error', providerMessage(error.providerCode), 502, providerDetail(error));
  return jsonError('internal', '音乐生成失败，请稍后再试', 500);
}

function statusErrorResponse(error: unknown): Response {
  if (error instanceof MusicProviderConfigurationError) return jsonError('missing_credentials', '音乐服务尚未配置', 503);
  if (error instanceof MusicProviderError) return jsonError('provider_error', '小鸟累了，请稍后再试', 502, providerDetail(error));
  return jsonError('internal', '查询音乐任务失败，请稍后再试', 500);
}

function providerDetail(error: MusicProviderError) {
  return {
    ...(error.providerCode === undefined ? {} : { code: error.providerCode }),
    ...(error.requestId === undefined ? {} : { requestId: error.requestId }),
  };
}

function providerMessage(code: number | undefined) {
  if (code !== undefined && [300061, 300062].includes(code)) return '歌词可能涉及版权，请换一种表达再试';
  if (code !== undefined && [300063, 300064].includes(code)) return '歌词里有不适合的内容，请修改后再试';
  if (code !== undefined && [200022, 200023, 400040].includes(code)) return '今天创作的小鸟有点忙，请稍后再试';
  return '小鸟累了，请稍后再试';
}

function jsonError(error: string, message: string, status: number, detail?: Record<string, unknown>) {
  return Response.json({ error, message, ...(detail ? { detail } : {}) }, { status });
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map(trimmed).find((value): value is string => value !== undefined);
}

function trimmed(value: string | undefined) {
  const result = value?.trim();
  return result || undefined;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function validateText(value: string, label: string) {
  const length = Array.from(value).length;
  if (length < 5) throw new InputError(`${label}至少需要 5 个字符`);
  if (length > 2000) throw new InputError(`${label}不能超过 2000 个字符`);
}

class InputError extends Error {}
