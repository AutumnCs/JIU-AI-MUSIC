import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createGuestUserRecord,
  createSessionRecord,
  findSessionRecord,
  findUserRecord,
  validateDatabaseConfig,
} from './db.ts';

test('production requires DATABASE_URL', async () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  process.env.NODE_ENV = 'production';
  delete process.env.DATABASE_URL;

  try {
    assert.throws(() => validateDatabaseConfig(), /DATABASE_URL/);
    await assert.rejects(createGuestUserRecord(), /DATABASE_URL/);
  } finally {
    if (previousEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnvironment;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

test('development fallback persists to the configured local store', async () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousStorePath = process.env.JIU_AUTH_STORE_PATH;
  const tempDirectory = await mkdtemp(join(tmpdir(), 'jiu-auth-store-'));
  const storePath = join(tempDirectory, 'auth-store.json');

  process.env.NODE_ENV = 'development';
  delete process.env.DATABASE_URL;
  process.env.JIU_AUTH_STORE_PATH = storePath;

  try {
    const user = await createGuestUserRecord();
    const session = await createSessionRecord(user.id, '2026-08-03T00:00:00.000Z');

    assert.deepEqual(await findUserRecord(user.id), user);
    const storedSession = await findSessionRecord(session.id);
    assert.ok(storedSession);
    assert.equal(storedSession.id, session.id);
    assert.equal(storedSession.userId, user.id);
    assert.equal(storedSession.expiresAt, '2026-08-03T00:00:00.000Z');
    assert.equal(typeof storedSession.createdAt, 'string');
    assert.equal(storedSession.revokedAt, null);
  } finally {
    if (previousEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnvironment;
    }

    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }

    if (previousStorePath === undefined) {
      delete process.env.JIU_AUTH_STORE_PATH;
    } else {
      process.env.JIU_AUTH_STORE_PATH = previousStorePath;
    }

    await rm(tempDirectory, { recursive: true, force: true });
  }
});
