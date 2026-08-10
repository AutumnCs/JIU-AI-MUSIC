import type { AuthSession, AuthUser } from '@/lib/auth/types';

import { getD1Database } from './d1.ts';
import { createAuthRepository } from './repositories/auth.ts';
import { createCommunityPostRepository } from './repositories/community.ts';
import { createMusicTaskRepository } from './repositories/music-tasks.ts';

type StoredSession = AuthSession & {
  createdAt: string;
  revokedAt: string | null;
};

export type MusicTrack = 'vocal' | 'instrumental';
export type MusicTaskStatus = 'pending' | 'running' | 'success' | 'failed';

export type MusicTask = {
  id: string;
  userId: string;
  providerTaskId: string;
  track: MusicTrack;
  requestPayload: Record<string, unknown>;
  status: MusicTaskStatus;
  progress: number;
  audioUrl: string | null;
  lyrics: string | null;
  failureCode: number | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MusicTaskPatch = Partial<Pick<MusicTask, 'status' | 'progress' | 'audioUrl' | 'lyrics' | 'failureCode' | 'failureMessage'>>;

export type CommunityPost = {
  id: string;
  userId: string;
  author: { id: string; displayName: string; avatarUrl?: string };
  body: string;
  media: string[];
  music: { title?: string; providerTaskId: string; audioUrl: string | null; lyrics: string | null } | null;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  liked: boolean;
  favorited: boolean;
  createdAt: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
};

export type CommunityComment = {
  id: string;
  postId: string;
  userId: string;
  author: { id: string; displayName: string };
  parentId: string | null;
  replyToUserId: string | null;
  replyToDisplayName?: string;
  body: string;
  likeCount: number;
  liked: boolean;
  createdAt: string;
};

export type CommunityRepository = {
  createPost: (input: { userId: string; body: string; media: string[]; providerTaskId: string | null }) => Promise<CommunityPost>;
  listPosts: (input: { userId: string; sort: 'latest' | 'hot'; cursor?: string; limit?: number }) => Promise<{ posts: CommunityPost[]; nextCursor: string | null }>;
  findPost: (postId: string, userId: string) => Promise<CommunityPost | null>;
  togglePostInteraction: (postId: string, userId: string, kind: 'like' | 'favorite') => Promise<{ active: boolean; count: number }>;
  listComments: (postId: string, userId: string) => Promise<CommunityComment[]>;
  createComment: (input: { postId: string; userId: string; body: string; parentId: string | null; replyToUserId: string | null }) => Promise<CommunityComment>;
  toggleCommentLike: (commentId: string, userId: string) => Promise<{ active: boolean; count: number }>;
  deleteComment: (commentId: string, userId: string) => Promise<boolean>;
  listNotifications: (userId: string) => Promise<Array<{ id: string; type: string; actorId: string; actorName: string; postId: string | null; commentId: string | null; isRead: boolean; createdAt: string }>>;
};

export async function createGuestUserRecord(): Promise<AuthUser> {
  return createAuthRepository(getD1Database()).createGuestUserRecord();
}

export function validateDatabaseConfig(): void {
  getD1Database();
}

export function getCommunityRepository(): CommunityRepository {
  return createCommunityPostRepository(getD1Database());
}

export async function createSessionRecord(
  userId: string,
  expiresAt: string,
): Promise<AuthSession> {
  return createAuthRepository(getD1Database()).createSessionRecord(userId, expiresAt);
}

export async function findSessionRecord(id: string): Promise<StoredSession | null> {
  return createAuthRepository(getD1Database()).findSessionRecord(id);
}

export async function findUserRecord(id: string): Promise<AuthUser | null> {
  return createAuthRepository(getD1Database()).findUserRecord(id);
}

export async function updateUserProfile(userId: string, input: { displayName?: string; avatarUrl?: string | null }): Promise<AuthUser | null> {
  return createAuthRepository(getD1Database()).updateUserProfile(userId, input);
}

export async function findEmailCredential(email: string): Promise<{ userId: string; passwordHash: string; passwordSalt: string } | null> {
  return createAuthRepository(getD1Database()).findEmailCredential(email);
}

export async function createEmailUserRecord(input: { email: string; passwordHash: string; passwordSalt: string; displayName: string; guestUserId?: string }): Promise<AuthUser> {
  return createAuthRepository(getD1Database()).createEmailUserRecord(input);
}

export async function revokeSessionRecord(id: string): Promise<void> {
  await createAuthRepository(getD1Database()).revokeSessionRecord(id);
}

export async function createMusicTaskRecord(input: {
  userId: string;
  providerTaskId: string;
  track: MusicTrack;
  requestPayload: Record<string, unknown>;
}): Promise<MusicTask> {
  return createMusicTaskRepository(getD1Database()).createMusicTaskRecord(input);
}

export async function findMusicTaskRecord(providerTaskId: string, userId: string): Promise<MusicTask | null> {
  return createMusicTaskRepository(getD1Database()).findMusicTaskRecord(providerTaskId, userId);
}

export async function updateMusicTaskRecord(
  providerTaskId: string,
  userId: string,
  patch: MusicTaskPatch,
): Promise<MusicTask | null> {
  return createMusicTaskRepository(getD1Database()).updateMusicTaskRecord(providerTaskId, userId, patch);
}

export async function listMusicTasks(userId: string): Promise<MusicTask[]> {
  return createMusicTaskRepository(getD1Database()).listMusicTasks(userId);
}
