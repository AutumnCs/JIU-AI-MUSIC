import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const deleted = await getCommunityRepository().deleteComment((await params).commentId, auth.user.id);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'forbidden' }, { status: 403 });
}
