import { randomUUID } from 'node:crypto';

import type { AuthSession, AuthUser } from '@/lib/auth/types';

type StoredUser = AuthUser & {
  createdAt: string;
  updatedAt: string;
};

type StoredSession = AuthSession & {
  createdAt: string;
  revokedAt: string | null;
};

const users = new Map<string, StoredUser>();
const sessions = new Map<string, StoredSession>();

// This adapter is intentionally small so a PostgreSQL implementation can keep this API.
export async function createGuestUserRecord(): Promise<AuthUser> {
  const now = new Date().toISOString();
  const user: StoredUser = {
    id: randomUUID(),
    type: 'guest',
    createdAt: now,
    updatedAt: now,
  };

  users.set(user.id, user);
  return toAuthUser(user);
}

export async function createSessionRecord(
  userId: string,
  expiresAt: string,
): Promise<AuthSession> {
  const session: StoredSession = {
    id: randomUUID(),
    userId,
    expiresAt,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  };

  sessions.set(session.id, session);
  return toAuthSession(session);
}

export async function findSessionRecord(id: string): Promise<StoredSession | null> {
  return sessions.get(id) ?? null;
}

export async function findUserRecord(id: string): Promise<AuthUser | null> {
  const user = users.get(id);
  return user ? toAuthUser(user) : null;
}

export async function revokeSessionRecord(id: string): Promise<void> {
  const session = sessions.get(id);
  if (session && !session.revokedAt) {
    session.revokedAt = new Date().toISOString();
  }
}

function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    type: user.type,
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.email ? { email: user.email } : {}),
  };
}

function toAuthSession(session: StoredSession): AuthSession {
  return {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt,
  };
}
