import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, validatePassword } from './credentials.ts';

test('normalizes a valid email', () => {
  assert.equal(normalizeEmail('  Musician@Example.COM '), 'musician@example.com');
});

test('rejects an invalid email', () => {
  assert.throws(() => normalizeEmail('not-an-email'), /invalid_email/);
});

test('accepts an eight-character password', () => {
  assert.equal(validatePassword('12345678'), '12345678');
});

test('rejects a short password', () => {
  assert.throws(() => validatePassword('1234567'), /invalid_password/);
});
