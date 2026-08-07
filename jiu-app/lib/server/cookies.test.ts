import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { readSessionId } from './cookies.ts';

test('rejects requests in production when AUTH_COOKIE_SECRET is missing', () => {
  const environment = process.env as Record<string, string | undefined>;
  const previousEnvironment = environment.NODE_ENV;
  const previousSecret = environment.AUTH_COOKIE_SECRET;

  environment.NODE_ENV = 'production';
  delete environment.AUTH_COOKIE_SECRET;

  try {
    const sessionId = 'session-id';
    const fallbackSignature = createHmac('sha256', 'jiu-local-development-cookie-secret')
      .update(sessionId)
      .digest('base64url');
    const request = new Request('http://localhost', {
      headers: { cookie: `jiu_session=${sessionId}.${fallbackSignature}` },
    });

    assert.throws(() => readSessionId(request), /AUTH_COOKIE_SECRET/);
  } finally {
    if (previousEnvironment === undefined) {
      delete environment.NODE_ENV;
    } else {
      environment.NODE_ENV = previousEnvironment;
    }

    if (previousSecret === undefined) {
      delete environment.AUTH_COOKIE_SECRET;
    } else {
      environment.AUTH_COOKIE_SECRET = previousSecret;
    }
  }
});
