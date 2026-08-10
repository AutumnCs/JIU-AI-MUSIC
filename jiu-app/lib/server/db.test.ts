import assert from 'node:assert/strict';
import test from 'node:test';

import { createGuestUserRecord, getCommunityRepository } from './db.ts';

test('getCommunityRepository requires the D1 binding', () => {
  assert.throws(getCommunityRepository, /D1 binding "DB" is unavailable/);
});

test('createGuestUserRecord requires the D1 binding', async () => {
  await assert.rejects(createGuestUserRecord(), /D1 binding "DB" is unavailable/);
});
