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
  avatar_url: string | null;
  email: string | null;
  password_hash: string | null;
  password_salt: string | null;
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
        'select id, type, display_name, avatar_url, email, created_at, updated_at from users where id = ? limit 1',
      ).bind(id).first<UserRow>();
      return row ? toAuthUser(row) : null;
    },

    async findEmailCredential(email: string): Promise<{ userId: string; passwordHash: string; passwordSalt: string } | null> {
      const row = await db.prepare(
        'select id, password_hash, password_salt from users where email = ? and type = \'email\' limit 1',
      ).bind(email).first<{ id: string; password_hash: string | null; password_salt: string | null }>();
      if (!row?.password_hash || !row.password_salt) return null;
      return { userId: row.id, passwordHash: row.password_hash, passwordSalt: row.password_salt };
    },

    async createEmailUserRecord(input: {
      email: string;
      passwordHash: string;
      passwordSalt: string;
      displayName: string;
      guestUserId?: string;
    }): Promise<AuthUser> {
      const now = nowIso();
      if (input.guestUserId) {
        const result = await db.prepare(
          'update users set type = \'email\', email = ?, display_name = ?, password_hash = ?, password_salt = ?, updated_at = ? where id = ? and type = \'guest\' and email is null',
        ).bind(input.email, input.displayName, input.passwordHash, input.passwordSalt, now, input.guestUserId).run();
        if (result.meta.changes !== 1) throw new Error('invalid_guest_upgrade');
        const upgraded = await this.findUserRecord(input.guestUserId);
        if (!upgraded) throw new Error('user_not_found');
        return upgraded;
      }

      const id = crypto.randomUUID();
      await db.prepare(
        'insert into users (id, type, display_name, email, password_hash, password_salt, created_at, updated_at) values (?, \'email\', ?, ?, ?, ?, ?, ?)',
      ).bind(id, input.displayName, input.email, input.passwordHash, input.passwordSalt, now, now).run();
      return { id, type: 'email', displayName: input.displayName, email: input.email };
    },

    async revokeSessionRecord(id: string): Promise<void> {
      await db.prepare(
        'update sessions set revoked_at = ? where id = ? and revoked_at is null',
      ).bind(nowIso(), id).run();
    },

    async updateUserProfile(userId: string, input: { displayName?: string; avatarUrl?: string | null }): Promise<AuthUser | null> {
      const displayName = input.displayName?.trim();
      if (displayName !== undefined && (displayName.length < 1 || displayName.length > 24)) {
        throw new Error('invalid_display_name');
      }
      const current = await this.findUserRecord(userId);
      if (!current) return null;
      await db.prepare(
        'update users set display_name = ?, avatar_url = ?, updated_at = ? where id = ?',
      ).bind(displayName ?? current.displayName ?? null, input.avatarUrl === undefined ? current.avatarUrl ?? null : input.avatarUrl, nowIso(), userId).run();
      return this.findUserRecord(userId);
    },
  };
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    type: row.type,
    ...(row.display_name ? { displayName: row.display_name } : {}),
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
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
