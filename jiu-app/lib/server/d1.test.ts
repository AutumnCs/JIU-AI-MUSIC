import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fromSqlBool,
  getD1Database,
  nowIso,
  parseJsonRecord,
  toSqlBool,
} from './d1.ts';

const cloudflareContextSymbol = Symbol.for('__cloudflare-context__');

test('getD1Database returns an explicit binding without reading OpenNext context', (t) => {
  const originalContext = getCloudflareContext();
  const database = {} as D1Database;
  clearCloudflareContext();
  t.after(() => setCloudflareContext(originalContext));

  assert.equal(getD1Database(database), database);
});

test('getD1Database reads the current OpenNext DB binding on each implicit call', (t) => {
  const originalContext = getCloudflareContext();
  const firstDatabase = { name: 'first' } as unknown as D1Database;
  const secondDatabase = { name: 'second' } as unknown as D1Database;
  t.after(() => setCloudflareContext(originalContext));

  setCloudflareContext({ env: { DB: firstDatabase } });
  assert.equal(getD1Database(), firstDatabase);

  setCloudflareContext({ env: { DB: secondDatabase } });
  assert.equal(getD1Database(), secondDatabase);
});

test('getD1Database throws a stable error when DB is absent', (t) => {
  const originalContext = getCloudflareContext();
  t.after(() => setCloudflareContext(originalContext));

  setCloudflareContext({ env: {} });

  assert.throws(() => getD1Database(), {
    message: 'D1 binding "DB" is unavailable',
  });
});

test('getD1Database throws a stable error when OpenNext context is unavailable', (t) => {
  const originalContext = getCloudflareContext();
  clearCloudflareContext();
  t.after(() => setCloudflareContext(originalContext));

  assert.throws(() => getD1Database(), {
    message: 'D1 binding "DB" is unavailable',
  });
});

test('nowIso returns a valid current ISO timestamp', () => {
  const before = Date.now();
  const value = nowIso();
  const after = Date.now();

  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(Date.parse(value) >= before);
  assert.ok(Date.parse(value) <= after);
});

test('SQL boolean conversions use D1 integer semantics', () => {
  assert.equal(toSqlBool(true), 1);
  assert.equal(toSqlBool(false), 0);

  assert.equal(fromSqlBool(0), false);
  assert.equal(fromSqlBool(false), false);
  assert.equal(fromSqlBool(null), false);
  assert.equal(fromSqlBool(1), true);
  assert.equal(fromSqlBool(-1), true);
  assert.equal(fromSqlBool(true), true);
});

test('parseJsonRecord accepts only JSON objects', () => {
  assert.deepEqual(parseJsonRecord('{"title":"Song","count":2}'), { title: 'Song', count: 2 });

  for (const value of ['{', '[]', 'null', 'true', '42', '"song"']) {
    assert.deepEqual(parseJsonRecord(value), {});
  }
});

function getCloudflareContext() {
  return (globalThis as typeof globalThis & { [cloudflareContextSymbol]?: unknown })[cloudflareContextSymbol];
}

function setCloudflareContext(context: unknown) {
  (globalThis as typeof globalThis & { [cloudflareContextSymbol]?: unknown })[cloudflareContextSymbol] = context;
}

function clearCloudflareContext() {
  delete (globalThis as typeof globalThis & { [cloudflareContextSymbol]?: unknown })[cloudflareContextSymbol];
}
