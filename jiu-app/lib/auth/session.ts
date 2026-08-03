import type { AuthState } from './types';

const LOCAL_AUTH_STATE_KEY = 'jiu_auth_state';
const LOCAL_GUEST_ID_KEY = 'jiu_user_id';

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
      return JSON.parse(saved) as AuthState;
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
