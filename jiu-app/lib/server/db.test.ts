import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGuestUserRecord,
  createPostgresBackend,
  resolveDatabaseUrl,
} from './db.ts';

test('createGuestUserRecord requires a database connection', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    await assert.rejects(createGuestUserRecord(), /DATABASE_URL/);
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

test('resolveDatabaseUrl prefers DATABASE_URL', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  process.env.DATABASE_URL = 'postgres://local.example/test';

  try {
    assert.equal(
      resolveDatabaseUrl({ HYPERDRIVE: { connectionString: 'postgres://hyperdrive.example/test' } }),
      'postgres://local.example/test',
    );
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

test('resolveDatabaseUrl falls back to Hyperdrive binding', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    assert.equal(
      resolveDatabaseUrl({ HYPERDRIVE: { connectionString: 'postgres://hyperdrive.example/test' } }),
      'postgres://hyperdrive.example/test',
    );
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

test('createPostgresBackend persists guest users and sessions through sql', async () => {
  const state = {
    users: new Map<string, StoredUserRow>(),
    sessions: new Map<string, StoredSessionRow>(),
  };

  const sql = createSqlStub(state);
  const backend = createPostgresBackend(sql);

  const user = await backend.createGuestUserRecord();
  const session = await backend.createSessionRecord(user.id, '2026-08-03T00:00:00.000Z');

  assert.deepEqual(user, { id: user.id, type: 'guest' });
  assert.deepEqual(await backend.findUserRecord(user.id), user);

  const storedSession = await backend.findSessionRecord(session.id);
  assert.ok(storedSession);
  assert.equal(storedSession.id, session.id);
  assert.equal(storedSession.userId, user.id);
  assert.equal(storedSession.expiresAt, '2026-08-03T00:00:00.000Z');
  assert.equal(storedSession.revokedAt, null);

  await backend.revokeSessionRecord(session.id);
  const revokedSession = await backend.findSessionRecord(session.id);
  assert.ok(revokedSession);
  assert.notEqual(revokedSession.revokedAt, null);
});

type StoredUserRow = {
  id: string;
  type: 'guest' | 'email';
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

type StoredSessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

function createSqlStub(state: {
  users: Map<string, StoredUserRow>;
  sessions: Map<string, StoredSessionRow>;
}) {
  return (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join('?').replace(/\s+/g, ' ').trim();

    if (query.startsWith('insert into users')) {
      const row: StoredUserRow = {
        id: String(values[0]),
        type: 'guest',
        display_name: null,
        email: null,
        created_at: String(values[1]),
        updated_at: String(values[2]),
      };
      state.users.set(row.id, row);
      return [];
    }

    if (query.startsWith('insert into sessions')) {
      const row: StoredSessionRow = {
        id: String(values[0]),
        user_id: String(values[1]),
        expires_at: String(values[2]),
        revoked_at: null,
        created_at: String(values[3]),
      };
      state.sessions.set(row.id, row);
      return [];
    }

    if (query.startsWith('select id, user_id, expires_at, revoked_at, created_at from sessions')) {
      const row = state.sessions.get(String(values[0]));
      return row ? [row] : [];
    }

    if (query.startsWith('select id, type, display_name, email, created_at, updated_at from users')) {
      const row = state.users.get(String(values[0]));
      return row ? [row] : [];
    }

    if (query.startsWith('update sessions set revoked_at =')) {
      const row = state.sessions.get(String(values[1]));
      if (row && row.revoked_at === null) {
        row.revoked_at = String(values[0]);
        state.sessions.set(row.id, row);
      }
      return [];
    }

    throw new Error(`Unexpected query: ${query}`);
  }) as never;
}
