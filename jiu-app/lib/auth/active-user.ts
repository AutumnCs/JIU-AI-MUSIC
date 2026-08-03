import type { AuthState } from './types';

export function getActiveUserId(authState: AuthState): string | null {
  return authState.user?.id ?? null;
}
