import assert from 'node:assert/strict';
import test from 'node:test';

import { MockMusicProvider } from './mock-provider.ts';
import { createGetHandler, createPostHandler, selectMusicProvider } from './provider.ts';
import { VolcengineMusicProvider } from './volcengine-provider.ts';

const credentials = { accessKeyId: 'AK_TEST', secretAccessKey: 'SECRET_TEST' };

test('production rejects mock and missing Volcengine credentials', () => {
  assert.throws(
    () => selectMusicProvider({ NODE_ENV: 'production', MUSIC_PROVIDER: 'mock' }),
    /mock.*production/i,
  );
  assert.throws(
    () => selectMusicProvider({ NODE_ENV: 'production' }),
    /VOLC_ACCESS_KEY.*VOLC_SECRET_KEY/,
  );
});

test('complete credentials select Volcengine', () => {
  assert.equal(selectMusicProvider({
    VOLC_ACCESS_KEY: 'ak',
    VOLC_SECRET_KEY: 'sk',
  }).name, 'volcengine');
});

test('provider selection rejects invalid names and incomplete credentials', () => {
  assert.throws(
    () => selectMusicProvider({ MUSIC_PROVIDER: 'other' }),
    /Unknown music provider: other/,
  );
  assert.throws(
    () => selectMusicProvider({ MUSIC_PROVIDER: 'volcengine', VOLC_ACCESS_KEY: 'ak' }),
    /VOLC_ACCESS_KEY.*VOLC_SECRET_KEY/,
  );
});

test('explicit mock is available outside production and survives a fresh instance', async () => {
  let clock = Date.parse('2026-08-10T00:00:00.000Z');
  const mock = new MockMusicProvider({
    now: () => clock,
    randomUUID: () => '12345678-abcd-4000-8000-123456789abc',
  });

  assert.equal(selectMusicProvider({ NODE_ENV: 'test', MUSIC_PROVIDER: 'mock' }).name, 'mock');
  const created = await mock.createTask({
    track: 'instrumental',
    text: 'gentle piano melody',
  });
  assert.equal(created.taskId, `mock-${clock.toString(36)}-12345678`);

  clock += 6_000;
  const freshMockInstance = new MockMusicProvider({ now: () => clock });
  assert.deepEqual(await freshMockInstance.getTask(created.taskId), {
    taskId: created.taskId,
    status: 'success',
    progress: 100,
    audioUrl: undefined,
    lyrics: undefined,
    failureReason: null,
  });
});

test('mock rejects invalid and non-mock task IDs with a stable domain error', async () => {
  const mock = new MockMusicProvider({ now: () => 0 });

  await assert.rejects(() => mock.getTask('volcengine-task'), {
    name: 'MusicProviderError',
    code: 'invalid_task_id',
    message: 'Invalid mock music task ID',
  });
  await assert.rejects(() => mock.getTask('mock-not-a-time-suffix'), {
    name: 'MusicProviderError',
    code: 'invalid_task_id',
    message: 'Invalid mock music task ID',
  });
});

test('Volcengine normalizes every native task status into the domain contract', async (t) => {
  const originalFetch = globalThis.fetch;
  const nativeStatuses = [0, 1, 2, 3];
  let call = 0;
  globalThis.fetch = (async () => {
    const status = nativeStatuses[call++];
    return new Response(JSON.stringify({
      Code: 0,
      Result: {
        TaskID: 'volc-task',
        Status: status,
        Progress: status * 25,
        FailureReason: status === 3 ? { Code: 400040, Msg: 'busy' } : null,
        SongDetail: status === 2 ? { AudioUrl: 'https://example.test/song.wav', Lyrics: 'hello' } : undefined,
      },
    }), { status: 200 });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const provider = new VolcengineMusicProvider(credentials);
  const results = [];
  for (let index = 0; index < nativeStatuses.length; index += 1) {
    results.push(await provider.getTask('volc-task'));
  }

  assert.deepEqual(results, [
    { taskId: 'volc-task', status: 'pending', progress: 0, audioUrl: undefined, lyrics: undefined, failureReason: null },
    { taskId: 'volc-task', status: 'running', progress: 25, audioUrl: undefined, lyrics: undefined, failureReason: null },
    { taskId: 'volc-task', status: 'success', progress: 50, audioUrl: 'https://example.test/song.wav', lyrics: 'hello', failureReason: null },
    { taskId: 'volc-task', status: 'failed', progress: 75, audioUrl: undefined, lyrics: undefined, failureReason: { code: 400040, msg: 'busy' } },
  ]);
});

test('Volcengine rejects unknown native status as an invalid provider response', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    Code: 0,
    Result: { TaskID: 'volc-task', Status: 9, Progress: 10, FailureReason: null },
  }), { status: 200 })) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(() => new VolcengineMusicProvider(credentials).getTask('volc-task'), {
    name: 'MusicProviderError',
    code: 'invalid_provider_response',
    message: 'Volcengine returned an unknown music task status: 9',
  });
});

test('Volcengine API errors are normalized at the adapter boundary', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    Code: 300061,
    Message: 'copyright',
    Result: null,
    ResponseMetadata: { RequestId: 'request-1' },
  }), { status: 200 })) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  await assert.rejects(
    () => new VolcengineMusicProvider(credentials).createTask({
      track: 'vocal',
      lyrics: 'long enough lyrics',
    }),
    {
      name: 'MusicProviderError',
      code: 'provider_error',
      providerCode: 300061,
      requestId: 'request-1',
      message: 'Volcengine music provider request failed',
    },
  );
});

test('create authenticates before selecting or calling a provider', async () => {
  let providerSelections = 0;
  const handler = createPostHandler({
    getCurrentUser: async () => ({ user: null }),
    selectProvider: () => {
      providerSelections += 1;
      throw new Error('provider must not be selected');
    },
    createTaskRecord: async () => { throw new Error('task must not be persisted'); },
  });
  const request = new Request('https://example.test/api/music/create', {
    method: 'POST',
    body: '{invalid json',
  });

  const response = await handler(request);

  assert.equal(response.status, 401);
  assert.equal(providerSelections, 0);
});

test('create persists the selected provider name without dropping request fields', async () => {
  let persisted: Record<string, unknown> | undefined;
  const handler = createPostHandler({
    getCurrentUser: async () => ({ user: { id: 'user-1', type: 'guest' as const } }),
    selectProvider: () => ({
      name: 'mock' as const,
      createTask: async () => ({ taskId: 'mock-task-1', predictedWaitTime: 5 }),
      getTask: async () => { throw new Error('not used'); },
    }),
    createTaskRecord: async (input) => {
      persisted = input;
      return {} as never;
    },
  });
  const request = new Request('https://example.test/api/music/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      track: 'instrumental',
      text: 'gentle piano melody',
      duration: 30,
      provider: 'caller-value',
    }),
  });

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.deepEqual(persisted, {
    userId: 'user-1',
    providerTaskId: 'mock-task-1',
    track: 'instrumental',
    requestPayload: {
      track: 'instrumental',
      text: 'gentle piano melody',
      duration: 30,
      provider: 'mock',
    },
  });
  assert.deepEqual(await response.json(), {
    taskId: 'mock-task-1',
    predictedWaitTime: 5,
    track: 'instrumental',
  });
});

test('status denies a foreign task before selecting or calling its provider', async () => {
  let providerSelections = 0;
  const handler = createGetHandler({
    getCurrentUser: async () => ({ user: { id: 'user-2', type: 'guest' as const } }),
    findTask: async () => null,
    selectProvider: () => {
      providerSelections += 1;
      throw new Error('provider must not be selected');
    },
    updateTask: async () => { throw new Error('task must not be updated'); },
    persistAudio: async () => { throw new Error('audio must not be persisted'); },
  });

  const response = await handler(
    new Request('https://example.test/api/music/status/private-task'),
    { params: Promise.resolve({ taskId: 'private-task' }) },
  );

  assert.equal(response.status, 404);
  assert.equal(providerSelections, 0);
});

test('status uses the stored provider and persists normalized state with explicit nulls', async () => {
  let selectedName: unknown;
  let persistedPatch: Record<string, unknown> | undefined;
  const task = {
    id: 'record-1',
    userId: 'user-1',
    providerTaskId: 'mock-task-1',
    track: 'vocal' as const,
    requestPayload: { prompt: 'forest song', provider: 'mock' },
    status: 'running' as const,
    progress: 30,
    audioUrl: null,
    lyrics: null,
    failureCode: 500,
    failureMessage: 'old failure',
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
  };
  const handler = createGetHandler({
    getCurrentUser: async () => ({ user: { id: 'user-1', type: 'guest' as const } }),
    findTask: async () => task,
    selectProvider: (name) => {
      selectedName = name;
      return {
        name: 'mock' as const,
        createTask: async () => { throw new Error('not used'); },
        getTask: async () => ({
          taskId: 'mock-task-1',
          status: 'success' as const,
          progress: 100,
          audioUrl: 'https://provider.test/song.wav',
          lyrics: 'new lyrics',
          failureReason: null,
        }),
      };
    },
    updateTask: async (_taskId, _userId, patch) => {
      persistedPatch = patch;
      return { ...task, ...patch };
    },
    persistAudio: async () => ({ url: '/api/music/audio/mock-task-1', persisted: true }),
  });

  const response = await handler(
    new Request('https://example.test/api/music/status/mock-task-1'),
    { params: Promise.resolve({ taskId: 'mock-task-1' }) },
  );

  assert.equal(selectedName, 'mock');
  assert.deepEqual(persistedPatch, {
    status: 'success',
    progress: 100,
    audioUrl: '/api/music/audio/mock-task-1',
    lyrics: 'new lyrics',
    failureCode: null,
    failureMessage: null,
  });
  assert.deepEqual(await response.json(), {
    taskId: 'mock-task-1',
    status: 'success',
    progress: 100,
    audioUrl: '/api/music/audio/mock-task-1',
    lyrics: 'new lyrics',
    failureReason: null,
  });
});
