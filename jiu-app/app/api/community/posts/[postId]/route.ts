import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized', message: '请先创建游客身份' }, { status: 401 });
  const { postId } = await params;
  const repository = getCommunityRepository();
  const post = await repository.findPost(postId, auth.user.id);
  if (!post) return NextResponse.json({ error: 'not_found', message: '帖子不存在' }, { status: 404 });
  const comments = await repository.listComments(postId, auth.user.id);
  return NextResponse.json({ post, comments });
}
