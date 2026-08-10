export type AuthUserType = 'guest' | 'email';

export interface AuthUser {
  id: string;
  type: AuthUserType;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  source: 'local' | 'server';
}
