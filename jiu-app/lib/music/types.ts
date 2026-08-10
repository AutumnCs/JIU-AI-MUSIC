export type MusicProviderName = 'volcengine' | 'mock';
export type MusicTaskStatus = 'pending' | 'running' | 'success' | 'failed';
export type MusicTrack = 'vocal' | 'instrumental';

export type MusicCreateInput = {
  track: MusicTrack;
  text?: string;
  lyrics?: string;
  prompt?: string;
  duration?: number;
  genre?: string;
  mood?: string;
  gender?: 'Female' | 'Male';
  timbre?: string;
  instruments?: string[];
  modelVersion?: 'v4.0' | 'v4.3' | 'v5.0';
  lang?: string;
  vodFormat?: 'wav' | 'mp3';
  callbackUrl?: string;
};

export type MusicCreateResult = {
  taskId: string;
  predictedWaitTime: number;
};

export type MusicTaskResult = {
  taskId: string;
  status: MusicTaskStatus;
  progress: number;
  audioUrl?: string;
  lyrics?: string;
  failureReason: { code: number; msg: string } | null;
};

export interface MusicProvider {
  readonly name: MusicProviderName;
  createTask(input: MusicCreateInput): Promise<MusicCreateResult>;
  getTask(taskId: string): Promise<MusicTaskResult>;
}

export class MusicProviderError extends Error {
  readonly code: string;
  readonly providerCode?: number;
  readonly requestId?: string;

  constructor(
    code: string,
    message: string,
    detail: { providerCode?: number; requestId?: string; cause?: unknown } = {},
  ) {
    super(message, detail.cause === undefined ? undefined : { cause: detail.cause });
    this.name = 'MusicProviderError';
    this.code = code;
    this.providerCode = detail.providerCode;
    this.requestId = detail.requestId;
  }
}
