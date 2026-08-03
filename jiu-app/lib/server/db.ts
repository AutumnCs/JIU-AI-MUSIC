import { randomUUID } from 'node:crypto';

import { getCloudflareContext } from '@opennextjs/cloudflare';
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

type SqlClient = ReturnType<typeof postgres>;

type CloudflareDatabaseBindings = {
  HYPERDRIVE?: {
    connectionString?: string | null;
  };
};

let postgresClient: ReturnType<typeof postgres> | null = null;

// This adapter stays tiny so the platform-specific runtime binding can change later.
export async function createGuestUserRecord(): Promise<AuthUser> {
  return getBackend().createGuestUserRecord();
}

export function validateDatabaseConfig(): void {
  resolveDatabaseUrl();
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
  return createPostgresBackend(getPostgresClient(resolveDatabaseUrl()));
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
