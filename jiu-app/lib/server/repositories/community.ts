import type { CommunityPost } from '../db.ts';
import { fromSqlBool, nowIso } from '../d1.ts';

type CommunityPostRow = {
  id: string;
  user_id: string;
  body: string;
  moderation_status: CommunityPost['moderationStatus'];
  like_count: number;
  favorite_count: number;
  comment_count: number;
  created_at: string;
  display_name: string | null;
  liked: number | boolean | null;
  favorited: number | boolean | null;
  hot_score?: number;
};

type CommunityPostMediaRow = {
  post_id: string;
  url: string;
};

type CommunityPostMusicRow = {
  post_id: string;
  provider_task_id: string;
  audio_url: string | null;
  lyrics: string | null;
};

type CommunityDatabase = Pick<D1Database, 'batch' | 'prepare'>;

export function createCommunityPostRepository(db: CommunityDatabase) {
  async function findPost(postId: string, userId: string): Promise<CommunityPost | null> {
    const row = await db.prepare(
      `select p.id, p.user_id, p.body, p.moderation_status, p.like_count,
        p.favorite_count, p.comment_count, p.created_at, u.display_name,
        exists(select 1 from community_post_likes l
          where l.post_id = p.id and l.user_id = ?) as liked,
        exists(select 1 from community_post_favorites f
          where f.post_id = p.id and f.user_id = ?) as favorited
        from community_posts p
        join users u on u.id = p.user_id
        where p.id = ? and p.status = ? and p.moderation_status = ?
        limit 1`,
    ).bind(userId, userId, postId, 'published', 'approved').first<CommunityPostRow>();
    if (!row) return null;

    return (await hydratePosts(db, [row]))[0] ?? null;
  }

  return {
    async createPost(input: {
      userId: string;
      body: string;
      media: string[];
      providerTaskId: string | null;
    }): Promise<CommunityPost> {
      const body = input.body.trim();
      if (!body && input.media.length === 0 && !input.providerTaskId) {
        throw new Error('post_empty');
      }

      if (input.providerTaskId) {
        const task = await db.prepare(
          `select provider_task_id from music_tasks
            where provider_task_id = ? and user_id = ? and status = ? limit 1`,
        ).bind(input.providerTaskId, input.userId, 'success').first<{ provider_task_id: string }>();
        if (!task) throw new Error('music_not_owned');
      }

      const postId = crypto.randomUUID();
      const now = nowIso();
      const statements: D1PreparedStatement[] = [
        db.prepare(
          `insert into community_posts (
            id, user_id, body, moderation_status, status, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(postId, input.userId, body, 'approved', 'published', now, now),
      ];

      for (const [sortOrder, url] of input.media.entries()) {
        statements.push(db.prepare(
          `insert into community_post_media (id, post_id, url, sort_order)
            values (?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), postId, url, sortOrder));
      }

      if (input.providerTaskId) {
        statements.push(db.prepare(
          `insert into community_post_music (post_id, user_id, provider_task_id)
            values (?, ?, ?)`,
        ).bind(postId, input.userId, input.providerTaskId));
      }

      await db.batch(statements);
      const post = await findPost(postId, input.userId);
      if (!post) throw new Error('post_not_found');
      return post;
    },

    async listPosts(input: {
      userId: string;
      sort: 'latest' | 'hot';
      cursor?: string;
      limit?: number;
    }): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
      const safeLimit = normalizeLimit(input.limit);
      const cursor = input.cursor ? decodeCursor(input.cursor, input.sort) : null;
      const scoreSql = '(p.like_count + p.favorite_count + p.comment_count)';
      let cursorSql = '';
      const cursorBindings: Array<string | number> = [];

      if (cursor?.[0] === 'latest') {
        cursorSql = `and (p.created_at < ? or (p.created_at = ? and p.id < ?))`;
        cursorBindings.push(cursor[1], cursor[1], cursor[2]);
      } else if (cursor?.[0] === 'hot') {
        cursorSql = `and (
          ${scoreSql} < ?
          or (${scoreSql} = ? and p.created_at < ?)
          or (${scoreSql} = ? and p.created_at = ? and p.id < ?)
        )`;
        cursorBindings.push(cursor[1], cursor[1], cursor[2], cursor[1], cursor[2], cursor[3]);
      }

      const orderSql = input.sort === 'hot'
        ? `${scoreSql} desc, p.created_at desc, p.id desc`
        : 'p.created_at desc, p.id desc';
      const result = await db.prepare(
        `select p.id, p.user_id, p.body, p.moderation_status, p.like_count,
          p.favorite_count, p.comment_count, p.created_at, u.display_name,
          ${scoreSql} as hot_score,
          exists(select 1 from community_post_likes l
            where l.post_id = p.id and l.user_id = ?) as liked,
          exists(select 1 from community_post_favorites f
            where f.post_id = p.id and f.user_id = ?) as favorited
          from community_posts p
          join users u on u.id = p.user_id
          where p.status = ? and p.moderation_status = ?
          ${cursorSql}
          order by ${orderSql}
          limit ?`,
      ).bind(
        input.userId,
        input.userId,
        'published',
        'approved',
        ...cursorBindings,
        safeLimit,
      ).all<CommunityPostRow>();

      const rows = result.results;
      const posts = await hydratePosts(db, rows);
      const last = rows.at(-1);
      return {
        posts,
        nextCursor: rows.length === safeLimit && last ? encodeCursor(last, input.sort) : null,
      };
    },

    findPost,
  };
}

type LatestCursor = ['latest', string, string];
type HotCursor = ['hot', number, string, string];
type FeedCursor = LatestCursor | HotCursor;

function normalizeLimit(limit = 12): number {
  if (!Number.isFinite(limit)) return 12;
  return Math.min(Math.max(Math.trunc(limit), 1), 30);
}

function encodeCursor(row: CommunityPostRow, sort: 'latest' | 'hot'): string {
  const value: FeedCursor = sort === 'hot'
    ? ['hot', Number(row.hot_score), row.created_at, row.id]
    : ['latest', row.created_at, row.id];
  const base64 = btoa(JSON.stringify(value));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeCursor(cursor: string, sort: 'latest' | 'hot'): FeedCursor {
  if (!/^[A-Za-z0-9_-]+$/.test(cursor) || cursor.length % 4 === 1) {
    throw new Error('invalid_cursor');
  }

  try {
    const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const value: unknown = JSON.parse(json);
    if (sort === 'latest' && isLatestCursor(value)) return value;
    if (sort === 'hot' && isHotCursor(value)) return value;
  } catch {
    throw new Error('invalid_cursor');
  }

  throw new Error('invalid_cursor');
}

function isLatestCursor(value: unknown): value is LatestCursor {
  return Array.isArray(value)
    && value.length === 3
    && value[0] === 'latest'
    && isCursorString(value[1])
    && isCursorString(value[2]);
}

function isHotCursor(value: unknown): value is HotCursor {
  return Array.isArray(value)
    && value.length === 4
    && value[0] === 'hot'
    && typeof value[1] === 'number'
    && Number.isSafeInteger(value[1])
    && value[1] >= 0
    && isCursorString(value[2])
    && isCursorString(value[3]);
}

function isCursorString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

async function hydratePosts(db: CommunityDatabase, rows: CommunityPostRow[]): Promise<CommunityPost[]> {
  if (rows.length === 0) return [];

  const postIds = rows.map((row) => row.id);
  const placeholders = postIds.map(() => '?').join(', ');
  const [mediaResult, musicResult] = await db.batch([
    db.prepare(
      `select post_id, url from community_post_media
        where post_id in (${placeholders})
        order by post_id asc, sort_order asc, id asc`,
    ).bind(...postIds),
    db.prepare(
      `select m.post_id, m.provider_task_id, t.audio_url, t.lyrics
        from community_post_music m
        join music_tasks t
          on t.provider_task_id = m.provider_task_id and t.user_id = m.user_id
        where m.post_id in (${placeholders}) and t.status = ?`,
    ).bind(...postIds, 'success'),
  ]);

  const mediaByPost = new Map<string, string[]>();
  for (const item of mediaResult.results as CommunityPostMediaRow[]) {
    const media = mediaByPost.get(item.post_id) ?? [];
    media.push(item.url);
    mediaByPost.set(item.post_id, media);
  }
  const musicByPost = new Map(
    (musicResult.results as CommunityPostMusicRow[]).map((item) => [item.post_id, item]),
  );

  return rows.map((row) => {
    const music = musicByPost.get(row.id);
    return {
      id: row.id,
      userId: row.user_id,
      author: { id: row.user_id, displayName: row.display_name ?? '小鸟用户' },
      body: row.body,
      media: mediaByPost.get(row.id) ?? [],
      music: music ? {
        providerTaskId: music.provider_task_id,
        audioUrl: music.audio_url,
        lyrics: music.lyrics,
      } : null,
      likeCount: Number(row.like_count),
      favoriteCount: Number(row.favorite_count),
      commentCount: Number(row.comment_count),
      liked: fromSqlBool(row.liked),
      favorited: fromSqlBool(row.favorited),
      createdAt: row.created_at,
      moderationStatus: row.moderation_status,
    };
  });
}
