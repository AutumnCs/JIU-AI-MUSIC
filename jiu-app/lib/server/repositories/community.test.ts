export {};

if ('__vitest_worker__' in globalThis) {
  const { env } = await import('cloudflare:workers');
  const { beforeEach, describe, expect, it } = await import('vitest');
  const { createAuthRepository } = await import('./auth.ts');
  const { createCommunityPostRepository } = await import('./community.ts');
  const { createMusicTaskRepository } = await import('./music-tasks.ts');

  describe('community post D1 repository', () => {
    beforeEach(async () => {
      await env.DB.batch([
        env.DB.prepare('delete from community_post_likes'),
        env.DB.prepare('delete from community_post_favorites'),
        env.DB.prepare('delete from community_post_media'),
        env.DB.prepare('delete from community_post_music'),
        env.DB.prepare('delete from community_posts'),
      ]);
    });

    it('rejects a post without body, media, or music', async () => {
      const authRepository = createAuthRepository(env.DB);
      const repository = createCommunityPostRepository(env.DB);
      const owner = await authRepository.createGuestUserRecord();

      await expect(repository.createPost({
        userId: owner.id,
        body: '   ',
        media: [],
        providerTaskId: null,
      })).rejects.toThrow('post_empty');
    });

    it('creates ordered media with an owned successful song', async () => {
      const authRepository = createAuthRepository(env.DB);
      const repository = createCommunityPostRepository(env.DB);
      const owner = await authRepository.createGuestUserRecord();
      await setDisplayName(owner.id, 'D1 Owner');
      const task = await createSuccessfulTask(owner.id, 'created-song');

      const post = await repository.createPost({
        userId: owner.id,
        body: '  hello from D1  ',
        media: ['https://example.test/second.jpg', 'https://example.test/first.jpg'],
        providerTaskId: task.providerTaskId,
      });

      expect(post).toEqual({
        id: post.id,
        userId: owner.id,
        author: { id: owner.id, displayName: 'D1 Owner' },
        body: 'hello from D1',
        media: ['https://example.test/second.jpg', 'https://example.test/first.jpg'],
        music: {
          providerTaskId: task.providerTaskId,
          audioUrl: 'https://example.test/created-song.wav',
          lyrics: 'created-song lyrics',
        },
        likeCount: 0,
        favoriteCount: 0,
        commentCount: 0,
        liked: false,
        favorited: false,
        createdAt: post.createdAt,
        moderationStatus: 'approved',
      });
      expect(post.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      const mediaRows = await env.DB.prepare(
        'select url, sort_order from community_post_media where post_id = ? order by sort_order asc',
      ).bind(post.id).all<{ url: string; sort_order: number }>();
      expect(mediaRows.results).toEqual([
        { url: 'https://example.test/second.jpg', sort_order: 0 },
        { url: 'https://example.test/first.jpg', sort_order: 1 },
      ]);
    });

    it("rejects another user's successful song", async () => {
      const authRepository = createAuthRepository(env.DB);
      const repository = createCommunityPostRepository(env.DB);
      const owner = await authRepository.createGuestUserRecord();
      const otherUser = await authRepository.createGuestUserRecord();
      const task = await createSuccessfulTask(otherUser.id, 'other-owner-song');

      await expect(repository.createPost({
        userId: owner.id,
        body: 'not my song',
        media: [],
        providerTaskId: task.providerTaskId,
      })).rejects.toThrow('music_not_owned');
    });

    it('rejects an owned song that is not successful', async () => {
      const authRepository = createAuthRepository(env.DB);
      const musicRepository = createMusicTaskRepository(env.DB);
      const repository = createCommunityPostRepository(env.DB);
      const owner = await authRepository.createGuestUserRecord();
      const task = await musicRepository.createMusicTaskRecord({
        userId: owner.id,
        providerTaskId: uniqueProviderTaskId('pending-song'),
        track: 'instrumental',
        requestPayload: { prompt: 'still pending' },
      });

      await expect(repository.createPost({
        userId: owner.id,
        body: 'unfinished song',
        media: [],
        providerTaskId: task.providerTaskId,
      })).rejects.toThrow('music_not_owned');
    });

    it('hydrates post details without exposing private task payloads', async () => {
      const authRepository = createAuthRepository(env.DB);
      const repository = createCommunityPostRepository(env.DB);
      const owner = await authRepository.createGuestUserRecord();
      const viewer = await authRepository.createGuestUserRecord();
      await setDisplayName(owner.id, 'Detail Owner');
      const task = await createSuccessfulTask(owner.id, 'detail-song');
      const post = await repository.createPost({
        userId: owner.id,
        body: 'detail body',
        media: ['https://example.test/detail-b.jpg', 'https://example.test/detail-a.jpg'],
        providerTaskId: task.providerTaskId,
      });
      const now = '2026-08-09T00:00:00.000Z';
      await env.DB.batch([
        env.DB.prepare(
          'insert into community_post_likes (post_id, user_id, created_at) values (?, ?, ?)',
        ).bind(post.id, viewer.id, now),
        env.DB.prepare(
          'insert into community_post_favorites (post_id, user_id, created_at) values (?, ?, ?)',
        ).bind(post.id, viewer.id, now),
        env.DB.prepare(
          'update community_posts set like_count = ?, favorite_count = ?, comment_count = ? where id = ?',
        ).bind(3, 4, 5, post.id),
      ]);

      const detail = await repository.findPost(post.id, viewer.id);

      expect(detail).toEqual({
        id: post.id,
        userId: owner.id,
        author: { id: owner.id, displayName: 'Detail Owner' },
        body: 'detail body',
        media: ['https://example.test/detail-b.jpg', 'https://example.test/detail-a.jpg'],
        music: {
          providerTaskId: task.providerTaskId,
          audioUrl: 'https://example.test/detail-song.wav',
          lyrics: 'detail-song lyrics',
        },
        likeCount: 3,
        favoriteCount: 4,
        commentCount: 5,
        liked: true,
        favorited: true,
        createdAt: post.createdAt,
        moderationStatus: 'approved',
      });
      expect(detail?.music).not.toHaveProperty('requestPayload');
    });

    it('paginates latest and hot feeds with different cursor orders', async () => {
      const authRepository = createAuthRepository(env.DB);
      const repository = createCommunityPostRepository(env.DB);
      const owner = await authRepository.createGuestUserRecord();
      const oldestHot = await repository.createPost({
        userId: owner.id, body: 'oldest hot', media: [], providerTaskId: null,
      });
      const middle = await repository.createPost({
        userId: owner.id, body: 'middle', media: [], providerTaskId: null,
      });
      const newest = await repository.createPost({
        userId: owner.id, body: 'newest', media: [], providerTaskId: null,
      });
      await env.DB.batch([
        env.DB.prepare(
          'update community_posts set created_at = ?, like_count = ?, favorite_count = ?, comment_count = ? where id = ?',
        ).bind('2026-01-01T00:00:00.000Z', 8, 1, 1, oldestHot.id),
        env.DB.prepare(
          'update community_posts set created_at = ?, like_count = ?, favorite_count = ?, comment_count = ? where id = ?',
        ).bind('2026-01-02T00:00:00.000Z', 0, 0, 0, middle.id),
        env.DB.prepare(
          'update community_posts set created_at = ?, like_count = ?, favorite_count = ?, comment_count = ? where id = ?',
        ).bind('2026-01-03T00:00:00.000Z', 1, 0, 0, newest.id),
      ]);

      const latestFirst = await repository.listPosts({ userId: owner.id, sort: 'latest', limit: 2 });
      const latestSecond = await repository.listPosts({
        userId: owner.id, sort: 'latest', limit: 2, cursor: latestFirst.nextCursor!,
      });
      expect(latestFirst.posts.map((post) => post.id)).toEqual([newest.id, middle.id]);
      expect(latestSecond.posts.map((post) => post.id)).toEqual([oldestHot.id]);

      const hotFirst = await repository.listPosts({ userId: owner.id, sort: 'hot', limit: 2 });
      const hotSecond = await repository.listPosts({
        userId: owner.id, sort: 'hot', limit: 2, cursor: hotFirst.nextCursor!,
      });
      expect(hotFirst.posts.map((post) => post.id)).toEqual([oldestHot.id, newest.id]);
      expect(hotSecond.posts.map((post) => post.id)).toEqual([middle.id]);
    });

    it('keeps hot tie-breakers symmetric and hydrates feed attachments in one batch', async () => {
      const authRepository = createAuthRepository(env.DB);
      const owner = await authRepository.createGuestUserRecord();
      const viewer = await authRepository.createGuestUserRecord();
      const task = await createSuccessfulTask(owner.id, 'feed-song');
      const newer = '2026-02-02T00:00:00.000Z';
      const tied = '2026-02-01T00:00:00.000Z';
      await env.DB.batch([
        feedPost('post-d', owner.id, newer, 3, 0, 0),
        feedPost('post-c', owner.id, tied, 3, 0, 0),
        feedPost('post-b', owner.id, tied, 1, 1, 1),
        feedPost('post-a', owner.id, tied, 3, 0, 0),
        env.DB.prepare(
          'insert into community_post_likes (post_id, user_id, created_at) values (?, ?, ?)',
        ).bind('post-b', viewer.id, tied),
        env.DB.prepare(
          'insert into community_post_favorites (post_id, user_id, created_at) values (?, ?, ?)',
        ).bind('post-b', viewer.id, tied),
        env.DB.prepare(
          'insert into community_post_media (id, post_id, url, sort_order) values (?, ?, ?, ?)',
        ).bind(crypto.randomUUID(), 'post-b', 'https://example.test/feed-b.jpg', 0),
        env.DB.prepare(
          'insert into community_post_media (id, post_id, url, sort_order) values (?, ?, ?, ?)',
        ).bind(crypto.randomUUID(), 'post-a', 'https://example.test/feed-a.jpg', 0),
        env.DB.prepare(
          'insert into community_post_music (post_id, user_id, provider_task_id) values (?, ?, ?)',
        ).bind('post-b', owner.id, task.providerTaskId),
      ]);
      let attachmentQueries = 0;
      const trackedDb = {
        prepare(query: string) {
          if (query.includes('from community_post_media') || query.includes('from community_post_music')) {
            attachmentQueries += 1;
          }
          return env.DB.prepare(query);
        },
        batch(statements: D1PreparedStatement[]) {
          return env.DB.batch(statements);
        },
      } satisfies Pick<D1Database, 'batch' | 'prepare'>;
      const repository = createCommunityPostRepository(trackedDb);

      const first = await repository.listPosts({ userId: viewer.id, sort: 'hot', limit: 2 });
      const second = await repository.listPosts({
        userId: viewer.id, sort: 'hot', limit: 2, cursor: first.nextCursor!,
      });

      expect(first.posts.map((post) => post.id)).toEqual(['post-d', 'post-c']);
      expect(second.posts.map((post) => post.id)).toEqual(['post-b', 'post-a']);
      expect(second.posts[0]).toMatchObject({
        liked: true,
        favorited: true,
        media: ['https://example.test/feed-b.jpg'],
        music: {
          providerTaskId: task.providerTaskId,
          audioUrl: 'https://example.test/feed-song.wav',
          lyrics: 'feed-song lyrics',
        },
      });
      expect(attachmentQueries).toBe(4);
    });

    it('rejects malformed, mismatched, and wrongly typed cursors', async () => {
      const authRepository = createAuthRepository(env.DB);
      const repository = createCommunityPostRepository(env.DB);
      const viewer = await authRepository.createGuestUserRecord();
      const timestamp = '2026-01-01T00:00:00.000Z';
      const cases: Array<{ sort: 'latest' | 'hot'; cursor: string }> = [
        { sort: 'latest', cursor: '' },
        { sort: 'latest', cursor: 'not+base64url' },
        { sort: 'latest', cursor: toBase64Url(['hot', 1, timestamp, 'post-id']) },
        { sort: 'latest', cursor: toBase64Url(['latest', timestamp]) },
        { sort: 'hot', cursor: toBase64Url(['hot', '1', timestamp, 'post-id']) },
        { sort: 'hot', cursor: `${toBase64Url(['hot', 1, timestamp, 'post-id'])}=` },
      ];

      for (const input of cases) {
        await expect(repository.listPosts({ userId: viewer.id, ...input }))
          .rejects.toThrow('invalid_cursor');
      }
    });
  });

  async function createSuccessfulTask(userId: string, label: string) {
    const repository = createMusicTaskRepository(env.DB);
    const task = await repository.createMusicTaskRecord({
      userId,
      providerTaskId: uniqueProviderTaskId(label),
      track: 'vocal',
      requestPayload: { prompt: `${label} private prompt`, secret: 'do not expose' },
    });
    return (await repository.updateMusicTaskRecord(task.providerTaskId, userId, {
      status: 'success',
      progress: 100,
      audioUrl: `https://example.test/${label}.wav`,
      lyrics: `${label} lyrics`,
    }))!;
  }

  async function setDisplayName(userId: string, displayName: string) {
    await env.DB.prepare('update users set display_name = ? where id = ?')
      .bind(displayName, userId)
      .run();
  }

  function uniqueProviderTaskId(label: string) {
    return `${label}-${crypto.randomUUID()}`;
  }

  function feedPost(
    id: string,
    userId: string,
    createdAt: string,
    likeCount: number,
    favoriteCount: number,
    commentCount: number,
  ) {
    return env.DB.prepare(
      `insert into community_posts (
        id, user_id, body, moderation_status, status, like_count, favorite_count,
        comment_count, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      userId,
      id,
      'approved',
      'published',
      likeCount,
      favoriteCount,
      commentCount,
      createdAt,
      createdAt,
    );
  }

  function toBase64Url(value: unknown) {
    return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
}
