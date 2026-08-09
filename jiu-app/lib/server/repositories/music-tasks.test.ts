export {};

if ('__vitest_worker__' in globalThis) {
  const { env } = await import('cloudflare:workers');
  const { describe, expect, it } = await import('vitest');
  const { createAuthRepository } = await import('./auth.ts');
  const { createMusicTaskRepository } = await import('./music-tasks.ts');

  describe('music task D1 repository', () => {
  it('creates, finds, patches, lists, and scopes tasks to their owner', async () => {
    const authRepository = createAuthRepository(env.DB);
    const repository = createMusicTaskRepository(env.DB);
    const owner = await authRepository.createGuestUserRecord();
    const otherUser = await authRepository.createGuestUserRecord();

    const firstTask = await repository.createMusicTaskRecord({
      userId: owner.id,
      providerTaskId: 'provider-task-first',
      track: 'instrumental',
      requestPayload: { prompt: 'piano', duration: 30 },
    });
    const secondTask = await repository.createMusicTaskRecord({
      userId: owner.id,
      providerTaskId: 'provider-task-second',
      track: 'vocal',
      requestPayload: { prompt: 'vocal', duration: 60 },
    });

    await env.DB.prepare('update music_tasks set created_at = ? where id = ?')
      .bind('2026-01-01T00:00:00.000Z', firstTask.id)
      .run();
    await env.DB.prepare('update music_tasks set created_at = ? where id = ?')
      .bind('2026-01-02T00:00:00.000Z', secondTask.id)
      .run();

    expect(await repository.findMusicTaskRecord(firstTask.providerTaskId, owner.id)).toMatchObject({
      id: firstTask.id,
      requestPayload: { prompt: 'piano', duration: 30 },
      status: 'pending',
      audioUrl: null,
    });
    expect(await repository.findMusicTaskRecord(firstTask.providerTaskId, otherUser.id)).toBeNull();

    const updated = await repository.updateMusicTaskRecord(firstTask.providerTaskId, owner.id, {
      status: 'failed',
      audioUrl: 'https://example.test/failed-task.wav',
      failureCode: 429,
      failureMessage: 'rate limited',
    });
    expect(updated).toMatchObject({
      id: firstTask.id,
      status: 'failed',
      audioUrl: 'https://example.test/failed-task.wav',
      failureCode: 429,
      failureMessage: 'rate limited',
    });

    const cleared = await repository.updateMusicTaskRecord(firstTask.providerTaskId, owner.id, {
      audioUrl: null,
      failureCode: null,
      failureMessage: null,
    });
    expect(cleared).toMatchObject({
      id: firstTask.id,
      status: 'failed',
      audioUrl: null,
      failureCode: null,
      failureMessage: null,
    });
    expect(await repository.updateMusicTaskRecord(firstTask.providerTaskId, otherUser.id, { status: 'success' })).toBeNull();

    expect((await repository.listMusicTasks(owner.id)).map((task) => task.id)).toEqual([
      secondTask.id,
      firstTask.id,
    ]);
    expect(await repository.listMusicTasks(otherUser.id)).toEqual([]);
  });

    it('maps invalid stored request JSON to an empty object', async () => {
    const authRepository = createAuthRepository(env.DB);
    const repository = createMusicTaskRepository(env.DB);
    const user = await authRepository.createGuestUserRecord();
    const task = await repository.createMusicTaskRecord({
      userId: user.id,
      providerTaskId: 'provider-task-invalid-json',
      track: 'instrumental',
      requestPayload: { prompt: 'before corruption' },
    });

    await env.DB.prepare('update music_tasks set request_payload = ? where id = ?')
      .bind('{', task.id)
      .run();

    expect(await repository.findMusicTaskRecord(task.providerTaskId, user.id)).toMatchObject({
      id: task.id,
      requestPayload: {},
    });
    });
  });
}
