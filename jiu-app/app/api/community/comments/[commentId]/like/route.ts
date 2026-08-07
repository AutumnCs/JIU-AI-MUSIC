import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try { return NextResponse.json(await getCommunityRepository().toggleCommentLike((await params).commentId, auth.user.id)); }
  catch { return NextResponse.json({ error: 'not_found' }, { status: 404 }); }
}
