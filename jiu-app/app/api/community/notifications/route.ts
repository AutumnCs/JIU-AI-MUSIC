import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ notifications: await getCommunityRepository().listNotifications(auth.user.id) });
}
