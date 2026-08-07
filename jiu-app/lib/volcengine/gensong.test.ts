import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STATUS_SUCCESS,
  submitGenBGMForTime,
  submitGenSongForTime,
  pollSongUntilDone,
  VOLC_HOST,
  VOLC_REGION,
  VOLC_SERVICE,
  VOLC_VERSION,
} from './gensong.ts';
import { signRequest } from './sign.ts';

const credentials = { accessKeyId: 'AK_TEST', secretAccessKey: 'SECRET_TEST' };

test('signRequest produces a Volcengine authorization header', () => {
  const result = signRequest({
    method: 'POST',
    query: { Action: 'GenBGMForTime', Version: VOLC_VERSION },
    headers: { 'Content-Type': 'application/json' },
    body: '{"Text":"test"}',
    region: VOLC_REGION,
    serviceName: VOLC_SERVICE,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    host: VOLC_HOST,
  });

  assert.match(result.authorization, /^HMAC-SHA256 Credential=AK_TEST\/\d{8}\/cn-beijing\/imagination\/request/);
  assert.match(result.authorization, /SignedHeaders=host;x-content-sha256;x-date/);
});

test('submitGenBGMForTime normalizes the provider response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    Code: 0,
    Result: { TaskID: 'bgm-task', PredictedWaitTime: 4 },
  }), { status: 200 })) as typeof fetch;

  try {
    assert.deepEqual(await submitGenBGMForTime({ text: '轻快钢琴曲', instruments: ['钢琴'] }, credentials), {
      taskId: 'bgm-task',
      predictedWaitTime: 4,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('submitGenSongForTime rejects empty vocal input', () => {
  assert.throws(() => submitGenSongForTime({}, credentials), /Lyrics or Prompt/);
});

test('pollSongUntilDone stops after success', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    const status = calls === 1 ? 1 : STATUS_SUCCESS;
    return new Response(JSON.stringify({
      Code: 0,
      Result: {
        TaskID: 'task-1',
        Status: status,
        Progress: calls === 1 ? 40 : 100,
        FailureReason: null,
        SongDetail: { AudioUrl: 'https://example.test/song.wav', Lyrics: 'hello' },
      },
    }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await pollSongUntilDone('task-1', credentials, { intervalMs: 1, timeoutMs: 1000 });
    assert.equal(result.status, STATUS_SUCCESS);
    assert.equal(result.audioUrl, 'https://example.test/song.wav');
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
