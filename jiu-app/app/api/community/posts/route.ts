import { NextRequest, NextResponse } from 'next/server';

import { validatePostInput } from '@/lib/community/validation';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return error('unauthorized', '请先创建游客身份', 401);

  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') === 'hot' ? 'hot' : 'latest';
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 12);
  const result = await getCommunityRepository().listPosts({ userId: auth.user.id, sort, cursor, limit });
  return NextResponse.json({ ...result, sort });
}

export async function POST(request: NextRequest) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return error('unauthorized', '请先创建游客身份', 401);

  let body: { body?: string; media?: string[]; providerTaskId?: string | null };
  try {
    body = await request.json() as typeof body;
  } catch {
    return error('bad_request', '请求内容不是有效 JSON', 400);
  }

  const input = {
    body: body.body ?? '',
    media: Array.isArray(body.media) ? body.media : [],
    providerTaskId: body.providerTaskId ?? null,
  };
  const validation = validatePostInput(input);
  if (!validation.ok) return error('bad_request', validation.message, 400);
  if (containsBlockedText(input.body)) return error('moderation_rejected', '内容暂时不能发布，请修改后再试', 422);

  try {
    const post = await getCommunityRepository().createPost({ userId: auth.user.id, ...input });
    return NextResponse.json({ post }, { status: 201 });
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'music_not_owned') return error('forbidden', '只能附加自己的音乐作品', 403);
    return error('internal', '发布失败，请稍后再试', 500);
  }
}

function containsBlockedText(value: string) {
  return ['色情', '暴恐', '自杀', '毒品', '赌博'].some((word) => value.includes(word));
}

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}
