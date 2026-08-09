import type { AuthSession, AuthUser } from '@/lib/auth/types';

import { nowIso } from '../d1.ts';

export type StoredSessionRecord = AuthSession & {
  createdAt: string;
  revokedAt: string | null;
};

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

export function createAuthRepository(db: D1Database) {
  return {
    async createGuestUserRecord(): Promise<AuthUser> {
      const id = crypto.randomUUID();
      const now = nowIso();
      await db.prepare(
        'insert into users (id, type, display_name, email, created_at, updated_at) values (?, ?, ?, ?, ?, ?)',
      ).bind(id, 'guest', null, null, now, now).run();

      return { id, type: 'guest' };
    },

    async createSessionRecord(userId: string, expiresAt: string): Promise<AuthSession> {
      const id = crypto.randomUUID();
      const createdAt = nowIso();
      await db.prepare(
        'insert into sessions (id, user_id, expires_at, revoked_at, created_at) values (?, ?, ?, ?, ?)',
      ).bind(id, userId, expiresAt, null, createdAt).run();

      return { id, userId, expiresAt };
    },

    async findSessionRecord(id: string): Promise<StoredSessionRecord | null> {
      const row = await db.prepare(
        'select id, user_id, expires_at, revoked_at, created_at from sessions where id = ? limit 1',
      ).bind(id).first<SessionRow>();
      return row ? toStoredSessionRecord(row) : null;
    },

    async findUserRecord(id: string): Promise<AuthUser | null> {
      const row = await db.prepare(
        'select id, type, display_name, email, created_at, updated_at from users where id = ? limit 1',
      ).bind(id).first<UserRow>();
      return row ? toAuthUser(row) : null;
    },

    async revokeSessionRecord(id: string): Promise<void> {
      await db.prepare(
        'update sessions set revoked_at = ? where id = ? and revoked_at is null',
      ).bind(nowIso(), id).run();
    },
  };
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    type: row.type,
    ...(row.display_name ? { displayName: row.display_name } : {}),
    ...(row.email ? { email: row.email } : {}),
  };
}

function toStoredSessionRecord(row: SessionRow): StoredSessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}
