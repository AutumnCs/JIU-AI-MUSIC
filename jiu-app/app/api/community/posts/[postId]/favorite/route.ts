import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const result = await getCommunityRepository().togglePostInteraction((await params).postId, auth.user.id, 'favorite');
    return NextResponse.json(result);
  } catch { return NextResponse.json({ error: 'not_found' }, { status: 404 }); }
}
