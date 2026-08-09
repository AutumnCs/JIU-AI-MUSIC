import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createGuestUserRecord,
  createPostgresBackend,
  getCommunityRepository,
  type MusicTask,
  resolveDatabaseUrl,
} from './db.ts';

test('getCommunityRepository requires D1 without consulting Postgres configuration', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    assert.throws(getCommunityRepository, /D1 binding "DB" is unavailable/);
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

test('createGuestUserRecord requires the D1 binding', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    await assert.rejects(createGuestUserRecord(), /D1 binding "DB" is unavailable/);
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

test('createPostgresBackend persists and scopes music tasks by user', async () => {
  const state = {
    users: new Map<string, StoredUserRow>(),
    sessions: new Map<string, StoredSessionRow>(),
    musicTasks: new Map<string, MusicTask>(),
  };
  const backend = createPostgresBackend(createSqlStub(state));

  const task = await backend.createMusicTaskRecord({
    userId: 'user-a',
    providerTaskId: 'provider-task-1',
    track: 'instrumental',
    requestPayload: { text: '一段轻快的钢琴曲' },
  });

  assert.equal(task.userId, 'user-a');
  assert.equal(task.status, 'pending');
  assert.deepEqual(task.requestPayload, { text: '一段轻快的钢琴曲' });
  assert.deepEqual(
    await backend.findMusicTaskRecord('provider-task-1', 'user-a'),
    task,
  );
  assert.equal(await backend.findMusicTaskRecord('provider-task-1', 'user-b'), null);

  const updated = await backend.updateMusicTaskRecord('provider-task-1', 'user-a', {
    status: 'success',
    progress: 100,
    audioUrl: 'https://example.test/song.wav',
  });
  assert.ok(updated);
  assert.equal(updated.status, 'success');
  assert.equal(updated.audioUrl, 'https://example.test/song.wav');
  assert.equal(await backend.updateMusicTaskRecord('provider-task-1', 'user-b', { status: 'failed' }), null);
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
  musicTasks?: Map<string, MusicTask>;
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

    if (query.startsWith('insert into music_tasks')) {
      const task: MusicTask = {
        id: String(values[0]),
        userId: String(values[1]),
        providerTaskId: String(values[2]),
        track: String(values[3]) as MusicTask['track'],
        requestPayload: JSON.parse(String(values[4])),
        status: 'pending',
        progress: 0,
        audioUrl: null,
        lyrics: null,
        failureCode: null,
        failureMessage: null,
        createdAt: String(values[5]),
        updatedAt: String(values[5]),
      };
      state.musicTasks?.set(`${task.providerTaskId}:${task.userId}`, task);
      return [toMusicTaskRow(task)];
    }

    if (query.startsWith('select id, user_id, provider_task_id')) {
      const task = state.musicTasks?.get(`${String(values[0])}:${String(values[1])}`);
      return task ? [toMusicTaskRow(task)] : [];
    }

    if (query.startsWith('update music_tasks set')) {
      const task = state.musicTasks?.get(`${String(values[7])}:${String(values[8])}`);
      if (!task) return [];
      task.status = (values[0] ?? task.status) as MusicTask['status'];
      task.progress = Number(values[1] ?? task.progress);
      task.audioUrl = values[2] === null ? task.audioUrl : String(values[2]);
      task.lyrics = values[3] === null ? task.lyrics : String(values[3]);
      task.failureCode = values[4] === null ? null : Number(values[4]);
      task.failureMessage = values[5] === null ? null : String(values[5]);
      task.updatedAt = String(values[6]);
      return [toMusicTaskRow(task)];
    }

    throw new Error(`Unexpected query: ${query}`);
  }) as never;
}

function toMusicTaskRow(task: MusicTask) {
  return {
    id: task.id,
    user_id: task.userId,
    provider_task_id: task.providerTaskId,
    track: task.track,
    request_payload: JSON.stringify(task.requestPayload),
    status: task.status,
    progress: task.progress,
    audio_url: task.audioUrl,
    lyrics: task.lyrics,
    failure_code: task.failureCode,
    failure_message: task.failureMessage,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}
