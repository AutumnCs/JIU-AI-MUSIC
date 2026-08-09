import { randomUUID } from 'node:crypto';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import postgres from 'postgres';

import type { AuthSession, AuthUser } from '@/lib/auth/types';

import { getD1Database } from './d1.ts';
import { createAuthRepository } from './repositories/auth.ts';
import { createCommunityPostRepository } from './repositories/community.ts';
import { createMusicTaskRepository } from './repositories/music-tasks.ts';

type StoredUser = AuthUser & {
  createdAt: string;
  updatedAt: string;
};

type StoredSession = AuthSession & {
  createdAt: string;
  revokedAt: string | null;
};

export type MusicTrack = 'vocal' | 'instrumental';
export type MusicTaskStatus = 'pending' | 'running' | 'success' | 'failed';

export type MusicTask = {
  id: string;
  userId: string;
  providerTaskId: string;
  track: MusicTrack;
  requestPayload: Record<string, unknown>;
  status: MusicTaskStatus;
  progress: number;
  audioUrl: string | null;
  lyrics: string | null;
  failureCode: number | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MusicTaskPatch = Partial<Pick<MusicTask, 'status' | 'progress' | 'audioUrl' | 'lyrics' | 'failureCode' | 'failureMessage'>>;

type UserRow = {
  id: string;
  type: AuthUser['type'];
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

type MusicTaskRow = {
  id: string;
  user_id: string;
  provider_task_id: string;
  track: MusicTrack;
  request_payload: Record<string, unknown> | string;
  status: MusicTaskStatus;
  progress: number;
  audio_url: string | null;
  lyrics: string | null;
  failure_code: number | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

type Backend = {
  createGuestUserRecord: () => Promise<AuthUser>;
  createSessionRecord: (userId: string, expiresAt: string) => Promise<AuthSession>;
  findSessionRecord: (id: string) => Promise<StoredSession | null>;
  findUserRecord: (id: string) => Promise<AuthUser | null>;
  revokeSessionRecord: (id: string) => Promise<void>;
  createMusicTaskRecord: (input: {
    userId: string;
    providerTaskId: string;
    track: MusicTrack;
    requestPayload: Record<string, unknown>;
  }) => Promise<MusicTask>;
  findMusicTaskRecord: (providerTaskId: string, userId: string) => Promise<MusicTask | null>;
  updateMusicTaskRecord: (providerTaskId: string, userId: string, patch: MusicTaskPatch) => Promise<MusicTask | null>;
};

type SqlClient = ReturnType<typeof postgres>;

export type CommunityPost = {
  id: string;
  userId: string;
  author: { id: string; displayName: string };
  body: string;
  media: string[];
  music: { providerTaskId: string; audioUrl: string | null; lyrics: string | null } | null;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  liked: boolean;
  favorited: boolean;
  createdAt: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
};

export type CommunityComment = {
  id: string;
  postId: string;
  userId: string;
  author: { id: string; displayName: string };
  parentId: string | null;
  replyToUserId: string | null;
  body: string;
  likeCount: number;
  liked: boolean;
  createdAt: string;
};

export type CommunityRepository = {
  createPost: (input: { userId: string; body: string; media: string[]; providerTaskId: string | null }) => Promise<CommunityPost>;
  listPosts: (input: { userId: string; sort: 'latest' | 'hot'; cursor?: string; limit?: number }) => Promise<{ posts: CommunityPost[]; nextCursor: string | null }>;
  findPost: (postId: string, userId: string) => Promise<CommunityPost | null>;
  togglePostInteraction: (postId: string, userId: string, kind: 'like' | 'favorite') => Promise<{ active: boolean; count: number }>;
  listComments: (postId: string, userId: string) => Promise<CommunityComment[]>;
  createComment: (input: { postId: string; userId: string; body: string; parentId: string | null; replyToUserId: string | null }) => Promise<CommunityComment>;
  toggleCommentLike: (commentId: string, userId: string) => Promise<{ active: boolean; count: number }>;
  deleteComment: (commentId: string, userId: string) => Promise<boolean>;
  listNotifications: (userId: string) => Promise<Array<{ id: string; type: string; actorId: string; actorName: string; postId: string | null; commentId: string | null; isRead: boolean; createdAt: string }>>;
};

type CloudflareDatabaseBindings = {
  HYPERDRIVE?: {
    connectionString?: string | null;
  };
};

// This adapter stays tiny so the platform-specific runtime binding can change later.
export async function createGuestUserRecord(): Promise<AuthUser> {
  return createAuthRepository(getD1Database()).createGuestUserRecord();
}

export function validateDatabaseConfig(): void {
  getD1Database();
}

export function getCommunityRepository(): CommunityRepository {
  return createCommunityPostRepository(getD1Database());
}

export async function createSessionRecord(
  userId: string,
  expiresAt: string,
): Promise<AuthSession> {
  return createAuthRepository(getD1Database()).createSessionRecord(userId, expiresAt);
}

export async function findSessionRecord(id: string): Promise<StoredSession | null> {
  return createAuthRepository(getD1Database()).findSessionRecord(id);
}

export async function findUserRecord(id: string): Promise<AuthUser | null> {
  return createAuthRepository(getD1Database()).findUserRecord(id);
}

export async function revokeSessionRecord(id: string): Promise<void> {
  await createAuthRepository(getD1Database()).revokeSessionRecord(id);
}

export async function createMusicTaskRecord(input: {
  userId: string;
  providerTaskId: string;
  track: MusicTrack;
  requestPayload: Record<string, unknown>;
}): Promise<MusicTask> {
  return createMusicTaskRepository(getD1Database()).createMusicTaskRecord(input);
}

export async function findMusicTaskRecord(providerTaskId: string, userId: string): Promise<MusicTask | null> {
  return createMusicTaskRepository(getD1Database()).findMusicTaskRecord(providerTaskId, userId);
}

export async function updateMusicTaskRecord(
  providerTaskId: string,
  userId: string,
  patch: MusicTaskPatch,
): Promise<MusicTask | null> {
  return createMusicTaskRepository(getD1Database()).updateMusicTaskRecord(providerTaskId, userId, patch);
}

export function createPostgresBackend(sql: SqlClient): Backend {
  return {
    async createGuestUserRecord() {
      const now = new Date().toISOString();
      const id = randomUUID();
      await sql`
        insert into users (id, type, display_name, email, created_at, updated_at)
        values (${id}, 'guest', null, null, ${now}, ${now})
      `;

      return {
        id,
        type: 'guest',
      };
    },

    async createSessionRecord(userId, expiresAt) {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      await sql`
        insert into sessions (id, user_id, expires_at, revoked_at, created_at)
        values (${id}, ${userId}, ${expiresAt}, null, ${createdAt})
      `;

      return {
        id,
        userId,
        expiresAt,
      };
    },

    async findSessionRecord(id) {
      const sessions = await sql<SessionRow[]>`
        select id, user_id, expires_at, revoked_at, created_at
        from sessions
        where id = ${id}
        limit 1
      `;
      const session = sessions[0];
      return session ? toStoredSession(session) : null;
    },

    async findUserRecord(id) {
      const users = await sql<UserRow[]>`
        select id, type, display_name, email, created_at, updated_at
        from users
        where id = ${id}
        limit 1
      `;
      const user = users[0];
      return user ? toAuthUser(toStoredUser(user)) : null;
    },

    async revokeSessionRecord(id) {
      await sql`
        update sessions
        set revoked_at = ${new Date().toISOString()}
        where id = ${id} and revoked_at is null
      `;
    },

    async createMusicTaskRecord({ userId, providerTaskId, track, requestPayload }) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const rows = await sql<MusicTaskRow[]>`
        insert into music_tasks (
          id, user_id, provider_task_id, track, request_payload, status, progress,
          audio_url, lyrics, failure_code, failure_message, created_at, updated_at
        ) values (
          ${id}, ${userId}, ${providerTaskId}, ${track}, ${JSON.stringify(requestPayload)},
          'pending', 0, null, null, null, null, ${now}, ${now}
        )
        returning id, user_id, provider_task_id, track, request_payload, status, progress,
          audio_url, lyrics, failure_code, failure_message, created_at, updated_at
      `;
      return toMusicTask(rows[0]);
    },

    async findMusicTaskRecord(providerTaskId, userId) {
      const rows = await sql<MusicTaskRow[]>`
        select id, user_id, provider_task_id, track, request_payload, status, progress,
          audio_url, lyrics, failure_code, failure_message, created_at, updated_at
        from music_tasks
        where provider_task_id = ${providerTaskId} and user_id = ${userId}
        limit 1
      `;
      return rows[0] ? toMusicTask(rows[0]) : null;
    },

    async updateMusicTaskRecord(providerTaskId, userId, patch) {
      const rows = await sql<MusicTaskRow[]>`
        update music_tasks
        set status = coalesce(${patch.status ?? null}, status),
          progress = coalesce(${patch.progress ?? null}, progress),
          audio_url = coalesce(${patch.audioUrl ?? null}, audio_url),
          lyrics = coalesce(${patch.lyrics ?? null}, lyrics),
          failure_code = ${patch.failureCode ?? null},
          failure_message = ${patch.failureMessage ?? null},
          updated_at = ${new Date().toISOString()}
        where provider_task_id = ${providerTaskId} and user_id = ${userId}
        returning id, user_id, provider_task_id, track, request_payload, status, progress,
          audio_url, lyrics, failure_code, failure_message, created_at, updated_at
      `;
      return rows[0] ? toMusicTask(rows[0]) : null;
    },
  };
}

export function resolveDatabaseUrl(bindings?: CloudflareDatabaseBindings): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return databaseUrl;

  const hyperdriveUrl = bindings?.HYPERDRIVE?.connectionString?.trim();
  if (hyperdriveUrl) return hyperdriveUrl;

  const runtimeHyperdriveUrl = readHyperdriveConnectionString();
  if (runtimeHyperdriveUrl) return runtimeHyperdriveUrl;

  throw new Error('DATABASE_URL or Cloudflare Hyperdrive binding must be configured.');
}

function readHyperdriveConnectionString(): string | null {
  try {
    const context = getCloudflareContext();
    const connectionString = (context.env as CloudflareDatabaseBindings | undefined)?.HYPERDRIVE?.connectionString?.trim();
    return connectionString || null;
  } catch {
    return null;
  }
}

function toStoredUser(user: UserRow): StoredUser {
  return {
    id: user.id,
    type: user.type,
    displayName: user.display_name ?? undefined,
    email: user.email ?? undefined,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    type: user.type,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.email ? { email: user.email } : {}),
  };
}

function toStoredSession(session: SessionRow): StoredSession {
  return {
    id: session.id,
    userId: session.user_id,
    expiresAt: session.expires_at,
    createdAt: session.created_at,
    revokedAt: session.revoked_at,
  };
}

function toMusicTask(row: MusicTaskRow): MusicTask {
  return {
    id: row.id,
    userId: row.user_id,
    providerTaskId: row.provider_task_id,
    track: row.track,
    requestPayload: typeof row.request_payload === 'string'
      ? JSON.parse(row.request_payload) as Record<string, unknown>
      : row.request_payload,
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
