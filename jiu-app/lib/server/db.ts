import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import postgres from 'postgres';

import type { AuthSession, AuthUser } from '@/lib/auth/types';

type StoredUser = AuthUser & {
  createdAt: string;
  updatedAt: string;
};

type StoredSession = AuthSession & {
  createdAt: string;
  revokedAt: string | null;
};

type FileStore = {
  users: Record<string, StoredUser>;
  sessions: Record<string, StoredSession>;
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

type Backend = {
  createGuestUserRecord: () => Promise<AuthUser>;
  createSessionRecord: (userId: string, expiresAt: string) => Promise<AuthSession>;
  findSessionRecord: (id: string) => Promise<StoredSession | null>;
  findUserRecord: (id: string) => Promise<AuthUser | null>;
  revokeSessionRecord: (id: string) => Promise<void>;
};

const STORE_DIRECTORY = join(process.cwd(), '.data');
const DEFAULT_STORE_PATH = join(STORE_DIRECTORY, 'auth-store.json');

let postgresClient: ReturnType<typeof postgres> | null = null;

// This adapter stays tiny so an Aliyun RDS/PostgreSQL implementation can keep this API.
export async function createGuestUserRecord(): Promise<AuthUser> {
  return getBackend().createGuestUserRecord();
}

export function validateDatabaseConfig(): void {
  getBackend();
}

export async function createSessionRecord(
  userId: string,
  expiresAt: string,
): Promise<AuthSession> {
  return getBackend().createSessionRecord(userId, expiresAt);
}

export async function findSessionRecord(id: string): Promise<StoredSession | null> {
  return getBackend().findSessionRecord(id);
}

export async function findUserRecord(id: string): Promise<AuthUser | null> {
  return getBackend().findUserRecord(id);
}

export async function revokeSessionRecord(id: string): Promise<void> {
  await getBackend().revokeSessionRecord(id);
}

function getBackend(): Backend {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) return getPostgresBackend(databaseUrl);

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL must be set in production.');
  }

  return fileBackend;
}

function getPostgresBackend(databaseUrl: string): Backend {
  const sql = getPostgresClient(databaseUrl);

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
  };
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

const fileBackend: Backend = {
  async createGuestUserRecord() {
    const now = new Date().toISOString();
    const store = await loadFileStore();
    const user: StoredUser = {
      id: randomUUID(),
      type: 'guest',
      createdAt: now,
      updatedAt: now,
    };

    store.users[user.id] = user;
    await saveFileStore(store);
    return toAuthUser(user);
  },

  async createSessionRecord(userId, expiresAt) {
    const store = await loadFileStore();
    const session: StoredSession = {
      id: randomUUID(),
      userId,
      expiresAt,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    };

    store.sessions[session.id] = session;
    await saveFileStore(store);
    return toAuthSession(session);
  },

  async findSessionRecord(id) {
    const store = await loadFileStore();
    return store.sessions[id] ?? null;
  },

  async findUserRecord(id) {
    const store = await loadFileStore();
    const user = store.users[id];
    return user ? toAuthUser(user) : null;
  },

  async revokeSessionRecord(id) {
    const store = await loadFileStore();
    const session = store.sessions[id];
    if (session && !session.revokedAt) {
      session.revokedAt = new Date().toISOString();
      await saveFileStore(store);
    }
  },
};

async function loadFileStore(): Promise<FileStore> {
  const storePath = getFileStorePath();

  try {
    const raw = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FileStore>;
    return {
      users: parsed.users ?? {},
      sessions: parsed.sessions ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { users: {}, sessions: {} };
    }
    throw error;
  }
}

async function saveFileStore(store: FileStore): Promise<void> {
  const storePath = getFileStorePath();
  await mkdir(STORE_DIRECTORY, { recursive: true });
  const temporaryPath = `${storePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(store, null, 2), 'utf8');
  await rename(temporaryPath, storePath);
}

function getFileStorePath(): string {
  return process.env.JIU_AUTH_STORE_PATH?.trim() || DEFAULT_STORE_PATH;
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

function toAuthSession(session: StoredSession): AuthSession {
  return {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt,
  };
}
