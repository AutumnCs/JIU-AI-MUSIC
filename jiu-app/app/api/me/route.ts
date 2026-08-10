import { NextResponse } from 'next/server';

import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { updateUserProfile } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { user } = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  const { user } = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { displayName?: string; avatarUrl?: string | null };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (body.avatarUrl !== undefined && body.avatarUrl !== null && !/^\/api\/community\/media\/[A-Za-z0-9._-]+$/.test(body.avatarUrl)) {
    return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
  }
  try {
    const updated = await updateUserProfile(user.id, body);
    return updated ? NextResponse.json({ user: updated }) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid_display_name') return NextResponse.json({ error: 'Name must be 1-24 characters' }, { status: 400 });
    return NextResponse.json({ error: 'Profile update failed' }, { status: 500 });
  }
}
