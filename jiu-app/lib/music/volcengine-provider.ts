import {
  querySong,
  STATUS_FAILED,
  STATUS_PENDING,
  STATUS_RUNNING,
  STATUS_SUCCESS,
  submitGenBGMForTime,
  submitGenSongForTime,
  type QuerySongResult,
  VolcApiError,
} from '../volcengine/gensong.ts';
import type { LoadedCredentials } from '../volcengine/sign.ts';

import type {
  MusicCreateInput,
  MusicCreateResult,
  MusicProvider,
  MusicTaskResult,
} from './types.ts';
import { MusicProviderError, type MusicTaskStatus } from './types.ts';

export class VolcengineMusicProvider implements MusicProvider {
  readonly name = 'volcengine' as const;
  private readonly credentials: LoadedCredentials;

  constructor(credentials: LoadedCredentials) {
    this.credentials = credentials;
  }

  async createTask(input: MusicCreateInput): Promise<MusicCreateResult> {
    try {
      if (input.track === 'instrumental') {
        return await submitGenBGMForTime({
          text: input.text ?? '',
          duration: input.duration,
          instruments: input.instruments,
          callbackUrl: input.callbackUrl,
        }, this.credentials);
      }
      return await submitGenSongForTime({
        lyrics: input.lyrics,
        prompt: input.prompt,
        duration: input.duration,
        genre: input.genre,
        mood: input.mood,
        gender: input.gender,
        timbre: input.timbre,
        instruments: input.instruments,
        modelVersion: input.modelVersion,
        lang: input.lang,
        vodFormat: input.vodFormat,
      }, this.credentials);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async getTask(taskId: string): Promise<MusicTaskResult> {
    try {
      return normalizeTask(await querySong(taskId, this.credentials));
    } catch (error) {
      throw normalizeError(error);
    }
  }
}

function normalizeTask(result: QuerySongResult): MusicTaskResult {
  return {
    taskId: result.taskId,
    status: normalizeStatus(result.status),
    progress: result.progress,
    audioUrl: result.audioUrl,
    lyrics: result.lyrics,
    failureReason: result.failureReason,
  };
}

function normalizeStatus(status: number): MusicTaskStatus {
  if (status === STATUS_PENDING) return 'pending';
  if (status === STATUS_RUNNING) return 'running';
  if (status === STATUS_SUCCESS) return 'success';
  if (status === STATUS_FAILED) return 'failed';
  throw new MusicProviderError(
    'invalid_provider_response',
    `Volcengine returned an unknown music task status: ${status}`,
  );
}

function normalizeError(error: unknown): Error {
  if (error instanceof MusicProviderError) return error;
  if (error instanceof VolcApiError) {
    return new MusicProviderError(
      'provider_error',
      'Volcengine music provider request failed',
      { providerCode: error.code, requestId: error.requestId, cause: error },
    );
  }
  return error instanceof Error ? error : new Error('Unknown Volcengine music provider error');
}
