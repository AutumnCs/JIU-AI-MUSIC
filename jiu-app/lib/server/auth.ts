import type { AuthSession, AuthState, AuthUser } from '@/lib/auth/types';

import {
  createGuestUserRecord,
  createSessionRecord,
  findSessionRecord,
  findUserRecord,
  revokeSessionRecord,
  validateDatabaseConfig,
} from './db';
import { getSessionExpiry, readSessionId, validateCookieSecret } from './cookies';

export async function createGuestUser(): Promise<{
  user: AuthUser;
  session: AuthSession;
}> {
  validateDatabaseConfig();
  validateCookieSecret();
  const user = await createGuestUserRecord();
  const session = await createSessionRecord(user.id, getSessionExpiry());
  return { user, session };
}

export async function getCurrentUserFromRequest(request: Request): Promise<AuthState> {
  validateDatabaseConfig();
  const sessionId = readSessionId(request);
  if (!sessionId) return emptyAuthState();

  const session = await findSessionRecord(sessionId);
  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
    return emptyAuthState();
  }

  const user = await findUserRecord(session.userId);
  if (!user) return emptyAuthState();

  return {
    user,
    session: {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
    },
    source: 'server',
  };
}

export async function revokeCurrentSession(request: Request): Promise<void> {
  validateDatabaseConfig();
  const sessionId = readSessionId(request);
  if (sessionId) await revokeSessionRecord(sessionId);
}

function emptyAuthState(): AuthState {
  return { user: null, session: null, source: 'server' };
}
