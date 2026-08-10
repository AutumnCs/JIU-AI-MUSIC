import { randomUUID } from 'node:crypto';

import {
  MusicProviderError,
  type MusicCreateInput,
  type MusicCreateResult,
  type MusicProvider,
  type MusicTaskResult,
} from './types.ts';

type MockProviderOptions = {
  now?: () => number;
  randomUUID?: () => string;
};

const taskIdPattern = /^mock-([0-9a-z]+)-([0-9a-f]{8})$/;

export class MockMusicProvider implements MusicProvider {
  readonly name = 'mock' as const;
  private readonly now: () => number;
  private readonly createUuid: () => string;

  constructor(options: MockProviderOptions = {}) {
    this.now = options.now ?? Date.now;
    this.createUuid = options.randomUUID ?? randomUUID;
  }

  async createTask(input: MusicCreateInput): Promise<MusicCreateResult> {
    void input;
    const createdAt = this.now();
    const suffix = this.createUuid().replaceAll('-', '').slice(0, 8).toLowerCase();
    return {
      taskId: `mock-${createdAt.toString(36)}-${suffix}`,
      predictedWaitTime: 5,
    };
  }

  async getTask(taskId: string): Promise<MusicTaskResult> {
    const match = taskIdPattern.exec(taskId);
    if (!match) throw invalidTaskId();

    const createdAt = Number.parseInt(match[1], 36);
    if (!Number.isSafeInteger(createdAt) || createdAt.toString(36) !== match[1]) {
      throw invalidTaskId();
    }

    const elapsed = Math.max(0, this.now() - createdAt);
    const status = elapsed >= 5_000 ? 'success' : elapsed >= 2_000 ? 'running' : 'pending';
    const progress = status === 'success' ? 100 : status === 'running' ? 40 : 0;
    return {
      taskId,
      status,
      progress,
      audioUrl: undefined,
      lyrics: undefined,
      failureReason: null,
    };
  }
}

function invalidTaskId() {
  return new MusicProviderError('invalid_task_id', 'Invalid mock music task ID');
}
