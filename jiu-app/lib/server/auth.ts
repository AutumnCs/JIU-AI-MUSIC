import type { AuthSession, AuthState, AuthUser } from '@/lib/auth/types';
import { normalizeEmail, validateDisplayName, validatePassword } from '@/lib/auth/credentials';

import {
  createGuestUserRecord,
  createSessionRecord,
  findSessionRecord,
  findUserRecord,
  revokeSessionRecord,
  validateDatabaseConfig,
  createEmailUserRecord,
  findEmailCredential,
} from './db';
import { getSessionExpiry, readSessionId, validateCookieSecret } from './cookies';
import { hashPassword, verifyPassword } from './password';

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

export async function registerEmailAccount(input: {
  email: unknown;
  password: unknown;
  displayName: unknown;
  guestUserId?: string;
}): Promise<{ user: AuthUser; session: AuthSession }> {
  validateDatabaseConfig();
  validateCookieSecret();
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  const displayName = validateDisplayName(input.displayName);
  if (await findEmailCredential(email)) throw new Error('email_exists');
  const credential = await hashPassword(password);
  const user = await createEmailUserRecord({ email, displayName, passwordHash: credential.hash, passwordSalt: credential.salt, guestUserId: input.guestUserId });
  const session = await createSessionRecord(user.id, getSessionExpiry());
  return { user, session };
}

export async function loginEmailAccount(input: { email: unknown; password: unknown }): Promise<{ user: AuthUser; session: AuthSession }> {
  validateDatabaseConfig();
  validateCookieSecret();
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  const credential = await findEmailCredential(email);
  if (!credential || !(await verifyPassword(password, credential.passwordHash, credential.passwordSalt))) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    throw new Error('invalid_credentials');
  }
  const user = await findUserRecord(credential.userId);
  if (!user) throw new Error('invalid_credentials');
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
