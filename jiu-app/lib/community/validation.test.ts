import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCommentTree, validatePostInput } from './validation.ts';

test('validatePostInput requires text, media, or music and caps media', () => {
  assert.equal(validatePostInput({ body: '', media: [], providerTaskId: null }).ok, false);
  assert.equal(validatePostInput({ body: '', media: ['https://example.test/a.png'], providerTaskId: null }).ok, true);
  assert.equal(validatePostInput({ body: 'hello', media: Array.from({ length: 10 }, (_, i) => `https://x/${i}`), providerTaskId: null }).ok, false);
  assert.equal(validatePostInput({ body: '', media: ['/api/community/media/image.png'], providerTaskId: null }).ok, true);
  assert.equal(validatePostInput({ body: '', media: ['/uploads/image.png'], providerTaskId: null }).ok, false);
});

test('buildCommentTree nests replies under root comments', () => {
  const tree = buildCommentTree([
    { id: 'child', parentId: 'root', postId: 'p', userId: 'u2', body: 'reply', createdAt: '2', likeCount: 0 },
    { id: 'root', parentId: null, postId: 'p', userId: 'u1', body: 'root', createdAt: '1', likeCount: 0 },
  ]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].replies[0].id, 'child');
});
