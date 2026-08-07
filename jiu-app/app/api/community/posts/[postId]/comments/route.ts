import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const postId = (await params).postId;
  return NextResponse.json({ comments: await getCommunityRepository().listComments(postId, auth.user.id) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: { body?: string; parentId?: string | null; replyToUserId?: string | null };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const text = body.body?.trim() ?? '';
  if (!text || text.length > 500) return NextResponse.json({ error: 'bad_request', message: '评论需要 1-500 个字符' }, { status: 400 });
  if (['淫秽', '色情', '暴恐', '自杀'].some((word) => text.includes(word))) return NextResponse.json({ error: 'moderation_rejected', message: '评论内容暂时不能发布' }, { status: 422 });
  try {
    const comment = await getCommunityRepository().createComment({ postId: (await params).postId, userId: auth.user.id, body: text, parentId: body.parentId ?? null, replyToUserId: body.replyToUserId ?? null });
    return NextResponse.json({ comment }, { status: 201 });
  } catch { return NextResponse.json({ error: 'not_found', message: '帖子或父评论不存在' }, { status: 404 }); }
}
