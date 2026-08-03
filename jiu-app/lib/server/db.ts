import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { AuthSession, AuthUser } from '@/lib/auth/types';

type StoredUser = AuthUser & {
  createdAt: string;
  updatedAt: string;
};

type StoredSession = AuthSession & {
  createdAt: string;
  revokedAt: string | null;
};

type Store = {
  users: Record<string, StoredUser>;
  sessions: Record<string, StoredSession>;
};

const STORE_DIRECTORY = join(process.cwd(), '.data');
const STORE_PATH = join(STORE_DIRECTORY, 'auth-store.json');
const LOCK_PATH = `${STORE_PATH}.lock`;

// This adapter is intentionally small so a PostgreSQL implementation can keep this API.
export async function createGuestUserRecord(): Promise<AuthUser> {
  return updateStore((store) => {
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      type: 'guest',
      createdAt: now,
      updatedAt: now,
    };

    store.users[user.id] = user;
    return toAuthUser(user);
  });
}

export async function createSessionRecord(
  userId: string,
  expiresAt: string,
): Promise<AuthSession> {
  return updateStore((store) => {
    const session: StoredSession = {
      id: randomUUID(),
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    };

    store.sessions[session.id] = session;
    return toAuthSession(session);
  });
}

export async function findSessionRecord(id: string): Promise<StoredSession | null> {
  return readStore((store) => store.sessions[id] ?? null);
}

export async function findUserRecord(id: string): Promise<AuthUser | null> {
  return readStore((store) => {
    const user = store.users[id];
    return user ? toAuthUser(user) : null;
  });
}

export async function revokeSessionRecord(id: string): Promise<void> {
  await updateStore((store) => {
    const session = store.sessions[id];
    if (session && !session.revokedAt) {
      session.revokedAt = new Date().toISOString();
    }
  });
}

async function readStore<T>(operation: (store: Store) => T): Promise<T> {
  return withStoreLock(async () => operation(await loadStore()));
}

async function updateStore<T>(operation: (store: Store) => T): Promise<T> {
  return withStoreLock(async () => {
    const store = await loadStore();
    const result = operation(store);
    await saveStore(store);
    return result;
  });
}

async function withStoreLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(STORE_DIRECTORY, { recursive: true });
  const lock = await acquireStoreLock();

  try {
    return await operation();
  } finally {
    await lock.close();
    await rm(LOCK_PATH, { force: true });
  }
}

async function acquireStoreLock() {
  for (;;) {
    try {
      return await open(LOCK_PATH, 'wx');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

async function loadStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(STORE_PATH, 'utf8')) as Store;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { users: {}, sessions: {} };
    }
    throw error;
  }
}

async function saveStore(store: Store): Promise<void> {
  const temporaryPath = `${STORE_PATH}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(store), 'utf8');
  await rename(temporaryPath, STORE_PATH);
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
