import { createHmac, timingSafeEqual } from 'node:crypto';

import type { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'jiu_session';
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getSessionExpiry(): string {
  return new Date(Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000).toISOString();
}

export function readSessionId(request: Request): string | null {
  const value = getCookieValue(request.headers.get('cookie'), SESSION_COOKIE_NAME);
  if (!value) return null;

  const [sessionId, signature, ...extra] = value.split('.');
  if (!sessionId || !signature || extra.length > 0) return null;

  const expectedSignature = signSessionId(sessionId);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  return sessionId;
}

export function setSessionCookie(response: NextResponse, sessionId: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, `${sessionId}.${signSessionId(sessionId)}`, {
    httpOnly: true,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function signSessionId(sessionId: string): string {
  return createHmac('sha256', getCookieSecret()).update(sessionId).digest('base64url');
}

function getCookieSecret(): string {
  return process.env.AUTH_COOKIE_SECRET || 'jiu-local-development-cookie-secret';
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  for (const cookie of cookieHeader.split(';')) {
    const [cookieName, ...valueParts] = cookie.trim().split('=');
    if (cookieName === name) return valueParts.join('=') || null;
  }

  return null;
}
