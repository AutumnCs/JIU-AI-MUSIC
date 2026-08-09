export {};

if ('__vitest_worker__' in globalThis) {
  const { env } = await import('cloudflare:workers');
  const { describe, expect, it } = await import('vitest');
  const { createAuthRepository } = await import('./auth.ts');

  describe('auth D1 repository', () => {
    it('creates, resolves, and revokes a guest session', async () => {
      const repository = createAuthRepository(env.DB);
      const user = await repository.createGuestUserRecord();
      const expiresAt = '2030-01-01T00:00:00.000Z';
      const session = await repository.createSessionRecord(user.id, expiresAt);

      expect(user).toEqual({ id: user.id, type: 'guest' });
      expect(await repository.findUserRecord(user.id)).toEqual(user);
      expect(await repository.findSessionRecord(session.id)).toMatchObject({
        id: session.id,
        userId: user.id,
        expiresAt,
        revokedAt: null,
      });

      await repository.revokeSessionRecord(session.id);

      expect(await repository.findSessionRecord(session.id)).toMatchObject({
        id: session.id,
        userId: user.id,
        expiresAt,
        revokedAt: expect.any(String),
      });
    });
  });
}
