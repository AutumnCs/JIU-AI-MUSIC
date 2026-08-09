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

let postgresClient: ReturnType<typeof postgres> | null = null;

// This adapter stays tiny so the platform-specific runtime binding can change later.
export async function createGuestUserRecord(): Promise<AuthUser> {
  return createAuthRepository(getD1Database()).createGuestUserRecord();
}

export function validateDatabaseConfig(): void {
  getD1Database();
}

export function getCommunityRepository(): CommunityRepository {
  const postgresRepository = createCommunityRepository(getPostgresClient(resolveDatabaseUrl()));
  const postRepository = createCommunityPostRepository(getD1Database());
  return {
    ...postgresRepository,
    createPost: postRepository.createPost,
    listPosts: postRepository.listPosts,
    findPost: postRepository.findPost,
  };
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

export function createCommunityRepository(sql: SqlClient): CommunityRepository {
  return {
    async createPost({ userId, body, media, providerTaskId }) {
      const now = new Date().toISOString();
      const postId = randomUUID();
      if (providerTaskId) {
        const owned = await sql<{ provider_task_id: string }[]>`
          select provider_task_id from music_tasks
          where provider_task_id = ${providerTaskId} and user_id = ${userId} and status = 'success'
          limit 1
        `;
        if (!owned[0]) throw new Error('music_not_owned');
      }
      await sql`
        insert into community_posts (id, user_id, body, moderation_status, status, created_at, updated_at)
        values (${postId}, ${userId}, ${body.trim()}, 'approved', 'published', ${now}, ${now})
      `;
      for (const [index, url] of media.entries()) {
        await sql`
          insert into community_post_media (id, post_id, url, sort_order)
          values (${randomUUID()}, ${postId}, ${url}, ${index})
        `;
      }
      if (providerTaskId) {
        await sql`
          insert into community_post_music (post_id, user_id, provider_task_id)
          values (${postId}, ${userId}, ${providerTaskId})
        `;
      }
      return requirePost(sql, postId, userId);
    },

    async listPosts({ userId, sort, cursor, limit = 12 }) {
      const safeLimit = Math.min(Math.max(limit, 1), 30);
      const latestCursor = cursor ? decodeLatestCursor(cursor) : null;
      const hotCursor = cursor ? decodeHotCursor(cursor) : null;
      const latestCondition = latestCursor ? sql`and (p.created_at, p.id) < (${latestCursor[0]}, ${latestCursor[1]})` : sql``;
      const hotCondition = hotCursor ? sql`and (p.like_count, p.favorite_count, p.comment_count, p.created_at, p.id) < (${hotCursor[0]}, ${hotCursor[1]}, ${hotCursor[2]}, ${hotCursor[3]}, ${hotCursor[4]})` : sql``;
      const rows = sort === 'hot'
        ? await sql<CommunityPostRow[]>`
            select p.*, u.display_name, m.provider_task_id, t.audio_url as music_audio_url, t.lyrics as music_lyrics,
              exists(select 1 from community_post_likes l where l.post_id = p.id and l.user_id = ${userId}) as liked,
              exists(select 1 from community_post_favorites f where f.post_id = p.id and f.user_id = ${userId}) as favorited
            from community_posts p join users u on u.id = p.user_id
              left join community_post_music m on m.post_id = p.id
              left join music_tasks t on t.provider_task_id = m.provider_task_id and t.user_id = m.user_id
            where p.status = 'published' and p.moderation_status = 'approved'
              ${hotCondition}
            order by p.like_count desc, p.favorite_count desc, p.comment_count desc, p.created_at desc, p.id desc
            limit ${safeLimit}
          `
        : await sql<CommunityPostRow[]>`
            select p.*, u.display_name, m.provider_task_id, t.audio_url as music_audio_url, t.lyrics as music_lyrics,
              exists(select 1 from community_post_likes l where l.post_id = p.id and l.user_id = ${userId}) as liked,
              exists(select 1 from community_post_favorites f where f.post_id = p.id and f.user_id = ${userId}) as favorited
            from community_posts p join users u on u.id = p.user_id
              left join community_post_music m on m.post_id = p.id
              left join music_tasks t on t.provider_task_id = m.provider_task_id and t.user_id = m.user_id
            where p.status = 'published' and p.moderation_status = 'approved'
              ${latestCondition}
            order by p.created_at desc, p.id desc
            limit ${safeLimit}
          `;
      const posts = await hydratePosts(sql, rows);
      const last = rows.at(-1);
      const nextCursor = rows.length === safeLimit && last
        ? sort === 'hot' ? encodeHotCursor(last) : encodeLatestCursor(last)
        : null;
      return { posts, nextCursor };
    },

    async findPost(postId, userId) {
      const rows = await sql<CommunityPostRow[]>`
        select p.*, u.display_name, m.provider_task_id, t.audio_url as music_audio_url, t.lyrics as music_lyrics,
          exists(select 1 from community_post_likes l where l.post_id = p.id and l.user_id = ${userId}) as liked,
          exists(select 1 from community_post_favorites f where f.post_id = p.id and f.user_id = ${userId}) as favorited
        from community_posts p join users u on u.id = p.user_id
          left join community_post_music m on m.post_id = p.id
          left join music_tasks t on t.provider_task_id = m.provider_task_id and t.user_id = m.user_id
        where p.id = ${postId} and p.status = 'published' and p.moderation_status = 'approved'
        limit 1
      `;
      if (!rows[0]) return null;
      return (await hydratePosts(sql, rows))[0] ?? null;
    },

    async togglePostInteraction(postId, userId, kind) {
      const postOwner = await sql<{ user_id: string }[]>`select user_id from community_posts where id = ${postId} and status = 'published' limit 1`;
      if (!postOwner[0]) throw new Error('post_not_found');
      const existing = kind === 'like'
        ? await sql`select 1 from community_post_likes where post_id = ${postId} and user_id = ${userId}`
        : await sql`select 1 from community_post_favorites where post_id = ${postId} and user_id = ${userId}`;
      const active = existing.length === 0;
      if (active) {
        if (kind === 'like') await sql`insert into community_post_likes (post_id, user_id, created_at) values (${postId}, ${userId}, ${new Date().toISOString()})`;
        else await sql`insert into community_post_favorites (post_id, user_id, created_at) values (${postId}, ${userId}, ${new Date().toISOString()})`;
        if (kind === 'like') await sql`update community_posts set like_count = like_count + 1 where id = ${postId}`;
        else await sql`update community_posts set favorite_count = favorite_count + 1 where id = ${postId}`;
      } else {
        if (kind === 'like') await sql`delete from community_post_likes where post_id = ${postId} and user_id = ${userId}`;
        else await sql`delete from community_post_favorites where post_id = ${postId} and user_id = ${userId}`;
        if (kind === 'like') await sql`update community_posts set like_count = greatest(like_count - 1, 0) where id = ${postId}`;
        else await sql`update community_posts set favorite_count = greatest(favorite_count - 1, 0) where id = ${postId}`;
      }
      const rows = kind === 'like'
        ? await sql<{ count: number }[]>`select like_count as count from community_posts where id = ${postId}`
        : await sql<{ count: number }[]>`select favorite_count as count from community_posts where id = ${postId}`;
      if (active) await createNotification(sql, postOwner[0].user_id, userId, kind === 'like' ? 'post_like' : 'post_favorite', postId, null);
      return { active, count: Number(rows[0]?.count ?? 0) };
    },

    async listComments(postId, userId) {
      const rows = await sql<CommunityCommentRow[]>`
        select c.*, u.display_name,
          exists(select 1 from community_comment_likes l where l.comment_id = c.id and l.user_id = ${userId}) as liked
        from community_comments c join users u on u.id = c.user_id
        where c.post_id = ${postId} and c.status = 'published' and c.moderation_status = 'approved'
        order by c.created_at asc
      `;
      return rows.map(toCommunityComment);
    },

    async createComment({ postId, userId, body, parentId, replyToUserId }) {
      const post = await sql<{ user_id: string }[]>`select user_id from community_posts where id = ${postId} and status = 'published' limit 1`;
      if (!post[0]) throw new Error('post_not_found');
      if (parentId) {
        const parent = await sql`select 1 from community_comments where id = ${parentId} and post_id = ${postId} and status = 'published'`;
        if (!parent.length) throw new Error('comment_parent_not_found');
      }
      const id = randomUUID();
      const now = new Date().toISOString();
      await sql`
        insert into community_comments (id, post_id, user_id, parent_id, reply_to_user_id, body, moderation_status, status, created_at, updated_at)
        values (${id}, ${postId}, ${userId}, ${parentId}, ${replyToUserId}, ${body.trim()}, 'approved', 'published', ${now}, ${now})
      `;
      await sql`update community_posts set comment_count = comment_count + 1, updated_at = ${now} where id = ${postId}`;
      if (post[0].user_id !== userId) await createNotification(sql, post[0].user_id, userId, parentId ? 'comment_reply' : 'comment', postId, id);
      return (await this.listComments(postId, userId)).find((comment) => comment.id === id)!;
    },

    async toggleCommentLike(commentId, userId) {
      const existing = await sql`select 1 from community_comment_likes where comment_id = ${commentId} and user_id = ${userId}`;
      const active = existing.length === 0;
      if (active) await sql`insert into community_comment_likes (comment_id, user_id, created_at) values (${commentId}, ${userId}, ${new Date().toISOString()})`;
      else await sql`delete from community_comment_likes where comment_id = ${commentId} and user_id = ${userId}`;
      if (active) await sql`update community_comments set like_count = like_count + 1 where id = ${commentId}`;
      else await sql`update community_comments set like_count = greatest(like_count - 1, 0) where id = ${commentId}`;
      const rows = await sql<{ like_count: number }[]>`select like_count from community_comments where id = ${commentId}`;
      return { active, count: Number(rows[0]?.like_count ?? 0) };
    },

    async deleteComment(commentId, userId) {
      const rows = await sql<{ post_id: string; post_user_id: string; user_id: string }[]>`
        select c.post_id, c.user_id, p.user_id as post_user_id from community_comments c join community_posts p on p.id = c.post_id where c.id = ${commentId} and c.status = 'published'
      `;
      const row = rows[0];
      if (!row || (row.user_id !== userId && row.post_user_id !== userId)) return false;
      await sql`update community_comments set status = 'deleted', updated_at = ${new Date().toISOString()} where id = ${commentId}`;
      await sql`update community_posts set comment_count = greatest(comment_count - 1, 0) where id = ${row.post_id}`;
      return true;
    },

    async listNotifications(userId) {
      const rows = await sql<NotificationRow[]>`
        select n.*, u.display_name as actor_name from community_notifications n join users u on u.id = n.actor_user_id
        where n.recipient_user_id = ${userId} order by n.created_at desc limit 50
      `;
      return rows.map((row) => ({ id: row.id, type: row.type, actorId: row.actor_user_id, actorName: row.actor_name ?? '用户', postId: row.post_id, commentId: row.comment_id, isRead: row.is_read, createdAt: row.created_at }));
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

type CommunityPostRow = {
  id: string;
  user_id: string;
  body: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  like_count: number;
  favorite_count: number;
  comment_count: number;
  created_at: string;
  display_name: string | null;
  provider_task_id: string | null;
  music_audio_url: string | null;
  music_lyrics: string | null;
  liked: boolean;
  favorited: boolean;
};

type CommunityCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  display_name: string | null;
  parent_id: string | null;
  reply_to_user_id: string | null;
  body: string;
  like_count: number;
  liked: boolean;
  created_at: string;
};

type NotificationRow = {
  id: string;
  type: string;
  actor_user_id: string;
  actor_name: string | null;
  post_id: string | null;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
};

async function requirePost(sql: SqlClient, postId: string, userId: string): Promise<CommunityPost> {
  const rows = await sql<CommunityPostRow[]>`
    select p.*, u.display_name, m.provider_task_id, t.audio_url as music_audio_url, t.lyrics as music_lyrics,
      exists(select 1 from community_post_likes l where l.post_id = p.id and l.user_id = ${userId}) as liked,
      exists(select 1 from community_post_favorites f where f.post_id = p.id and f.user_id = ${userId}) as favorited
    from community_posts p join users u on u.id = p.user_id
      left join community_post_music m on m.post_id = p.id
      left join music_tasks t on t.provider_task_id = m.provider_task_id and t.user_id = m.user_id
    where p.id = ${postId} limit 1
  `;
  const post = (await hydratePosts(sql, rows))[0];
  if (!post) throw new Error('post_not_found');
  return post;
}

async function hydratePosts(sql: SqlClient, rows: CommunityPostRow[]): Promise<CommunityPost[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const media = await sql<{ post_id: string; url: string }[]>`
    select post_id, url from community_post_media where post_id in ${sql(ids)} order by sort_order asc
  `;
  const mediaByPost = new Map<string, string[]>();
  for (const item of media) mediaByPost.set(item.post_id, [...(mediaByPost.get(item.post_id) ?? []), item.url]);
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    author: { id: row.user_id, displayName: row.display_name ?? '小鸟用户' },
    body: row.body,
    media: mediaByPost.get(row.id) ?? [],
    music: row.provider_task_id ? { providerTaskId: row.provider_task_id, audioUrl: row.music_audio_url, lyrics: row.music_lyrics } : null,
    likeCount: Number(row.like_count),
    favoriteCount: Number(row.favorite_count),
    commentCount: Number(row.comment_count),
    liked: Boolean(row.liked),
    favorited: Boolean(row.favorited),
    createdAt: row.created_at,
    moderationStatus: row.moderation_status,
  }));
}

function toCommunityComment(row: CommunityCommentRow): CommunityComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    author: { id: row.user_id, displayName: row.display_name ?? '小鸟用户' },
    parentId: row.parent_id,
    replyToUserId: row.reply_to_user_id,
    body: row.body,
    likeCount: Number(row.like_count),
    liked: Boolean(row.liked),
    createdAt: row.created_at,
  };
}

async function createNotification(sql: SqlClient, recipientUserId: string, actorUserId: string, type: string, postId: string | null, commentId: string | null) {
  if (recipientUserId === actorUserId) return;
  await sql`
    insert into community_notifications (id, recipient_user_id, actor_user_id, type, post_id, comment_id, created_at)
    values (${randomUUID()}, ${recipientUserId}, ${actorUserId}, ${type}, ${postId}, ${commentId}, ${new Date().toISOString()})
  `;
}

function encodeLatestCursor(row: { created_at: string; id: string }) {
  return Buffer.from(JSON.stringify([row.created_at, row.id]), 'utf8').toString('base64url');
}

function decodeLatestCursor(cursor: string) {
  const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [string, string];
  return value;
}

function encodeHotCursor(row: { like_count: number; favorite_count: number; comment_count: number; created_at: string; id: string }) {
  return Buffer.from(JSON.stringify([row.like_count, row.favorite_count, row.comment_count, row.created_at, row.id]), 'utf8').toString('base64url');
}

function decodeHotCursor(cursor: string) {
  const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as [number, number, number, string, string];
  return value;
}

function getPostgresClient(databaseUrl: string): ReturnType<typeof postgres> {
  if (!postgresClient) {
    postgresClient = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return postgresClient;
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
