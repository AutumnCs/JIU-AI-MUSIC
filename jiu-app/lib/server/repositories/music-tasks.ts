import type { MusicTask, MusicTaskPatch, MusicTaskStatus, MusicTrack } from '../db';
import { nowIso, parseJsonRecord } from '../d1.ts';

type MusicTaskRow = {
  id: string;
  user_id: string;
  provider_task_id: string;
  track: MusicTrack;
  request_payload: string;
  status: MusicTaskStatus;
  progress: number;
  audio_url: string | null;
  lyrics: string | null;
  failure_code: number | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

export function createMusicTaskRepository(db: D1Database) {
  async function findMusicTaskRecord(providerTaskId: string, userId: string): Promise<MusicTask | null> {
    const row = await db.prepare(
      `select id, user_id, provider_task_id, track, request_payload, status, progress,
        audio_url, lyrics, failure_code, failure_message, created_at, updated_at
        from music_tasks where provider_task_id = ? and user_id = ? limit 1`,
    ).bind(providerTaskId, userId).first<MusicTaskRow>();
    return row ? toMusicTask(row) : null;
  }

  return {
    async createMusicTaskRecord(input: {
      userId: string;
      providerTaskId: string;
      track: MusicTrack;
      requestPayload: Record<string, unknown>;
    }): Promise<MusicTask> {
      const id = crypto.randomUUID();
      const now = nowIso();
      await db.prepare(
        `insert into music_tasks (
          id, user_id, provider_task_id, track, request_payload, status, progress,
          audio_url, lyrics, failure_code, failure_message, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        input.userId,
        input.providerTaskId,
        input.track,
        JSON.stringify(input.requestPayload),
        'pending',
        0,
        null,
        null,
        null,
        null,
        now,
        now,
      ).run();

      return {
        id,
        userId: input.userId,
        providerTaskId: input.providerTaskId,
        track: input.track,
        requestPayload: input.requestPayload,
        status: 'pending',
        progress: 0,
        audioUrl: null,
        lyrics: null,
        failureCode: null,
        failureMessage: null,
        createdAt: now,
        updatedAt: now,
      };
    },

    findMusicTaskRecord,

    async updateMusicTaskRecord(
      providerTaskId: string,
      userId: string,
      patch: MusicTaskPatch,
    ): Promise<MusicTask | null> {
      const existing = await findMusicTaskRecord(providerTaskId, userId);
      if (!existing) return null;

      const updatedAt = nowIso();
      const updated: MusicTask = {
        ...existing,
        status: patch.status === undefined ? existing.status : patch.status,
        progress: patch.progress === undefined ? existing.progress : patch.progress,
        audioUrl: patch.audioUrl === undefined ? existing.audioUrl : patch.audioUrl,
        lyrics: patch.lyrics === undefined ? existing.lyrics : patch.lyrics,
        failureCode: patch.failureCode === undefined ? existing.failureCode : patch.failureCode,
        failureMessage: patch.failureMessage === undefined ? existing.failureMessage : patch.failureMessage,
        updatedAt,
      };

      await db.prepare(
        `update music_tasks set status = ?, progress = ?, audio_url = ?, lyrics = ?,
          failure_code = ?, failure_message = ?, updated_at = ?
          where provider_task_id = ? and user_id = ?`,
      ).bind(
        updated.status,
        updated.progress,
        updated.audioUrl,
        updated.lyrics,
        updated.failureCode,
        updated.failureMessage,
        updated.updatedAt,
        providerTaskId,
        userId,
      ).run();

      return updated;
    },

    async listMusicTasks(userId: string): Promise<MusicTask[]> {
      const result = await db.prepare(
        `select id, user_id, provider_task_id, track, request_payload, status, progress,
          audio_url, lyrics, failure_code, failure_message, created_at, updated_at
          from music_tasks where user_id = ? order by created_at desc, id desc`,
      ).bind(userId).all<MusicTaskRow>();
      return result.results.map(toMusicTask);
    },
  };
}

function toMusicTask(row: MusicTaskRow): MusicTask {
  return {
    id: row.id,
    userId: row.user_id,
    providerTaskId: row.provider_task_id,
    track: row.track,
    requestPayload: parseJsonRecord(row.request_payload),
    status: row.status,
    progress: row.progress,
    audioUrl: row.audio_url,
    lyrics: row.lyrics,
    failureCode: row.failure_code,
    failureMessage: row.failure_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
