import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password.ts';

test('hashes and verifies the original password', async () => {
  const credential = await hashPassword('correct horse battery staple');
  assert.notEqual(credential.hash, 'correct horse battery staple');
  assert.notEqual(credential.salt, '');
  assert.equal(await verifyPassword('correct horse battery staple', credential.hash, credential.salt), true);
});

test('rejects a different password', async () => {
  const credential = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('wrong password', credential.hash, credential.salt), false);
});

test('uses a fresh salt for each password hash', async () => {
  const first = await hashPassword('same password');
  const second = await hashPassword('same password');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
});
