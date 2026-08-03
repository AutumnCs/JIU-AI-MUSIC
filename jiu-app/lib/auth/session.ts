import type { AuthState } from './types';

const LOCAL_AUTH_STATE_KEY = 'jiu_auth_state';
const LOCAL_GUEST_ID_KEY = 'jiu_user_id';

function isAuthState(value: unknown): value is AuthState {
  if (!isRecord(value) || (value.source !== 'local' && value.source !== 'server')) {
    return false;
  }

  if (value.user !== null && !isAuthUser(value.user)) return false;
  return value.session === null || isAuthSession(value.session);
}

function isAuthUser(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    (value.type === 'guest' || value.type === 'email') &&
    (value.displayName === undefined || typeof value.displayName === 'string') &&
    (value.email === undefined || typeof value.email === 'string')
  );
}

function isAuthSession(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.userId === 'string' &&
    typeof value.expiresAt === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getLocalGuestId(): string {
  const existingId = localStorage.getItem(LOCAL_GUEST_ID_KEY);
  if (existingId) return existingId;

  const guestId = crypto.randomUUID();
  localStorage.setItem(LOCAL_GUEST_ID_KEY, guestId);
  return guestId;
}

export function readLocalAuthState(): AuthState {
  const saved = localStorage.getItem(LOCAL_AUTH_STATE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as unknown;
      if (isAuthState(parsed)) return parsed;
    } catch {}
  }

  const guestId = localStorage.getItem(LOCAL_GUEST_ID_KEY);
  return {
    user: guestId ? { id: guestId, type: 'guest' } : null,
    session: null,
    source: 'local',
  };
}

export function saveLocalAuthState(state: AuthState): void {
  localStorage.setItem(LOCAL_AUTH_STATE_KEY, JSON.stringify(state));

  if (state.user?.type === 'guest') {
    localStorage.setItem(LOCAL_GUEST_ID_KEY, state.user.id);
  } else {
    localStorage.removeItem(LOCAL_GUEST_ID_KEY);
  }
}

export function clearLocalAuthState(): void {
  localStorage.removeItem(LOCAL_AUTH_STATE_KEY);
  localStorage.removeItem(LOCAL_GUEST_ID_KEY);
}
