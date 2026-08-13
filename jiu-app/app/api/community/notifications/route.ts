import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { getCommunityRepository } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserFromRequest(request);
    if (!auth.user) return NextResponse.json({ error: 'unauthorized', notifications: [] }, { status: 401 });
    return NextResponse.json({ notifications: await getCommunityRepository().listNotifications(auth.user.id) });
  } catch (cause) {
    console.error('community_notifications_failed', cause);
    return NextResponse.json({ error: '暂时无法加载消息', notifications: [] }, { status: 500 });
  }
}
