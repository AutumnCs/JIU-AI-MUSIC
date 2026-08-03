import { NextResponse } from 'next/server';

import { getCurrentUserFromRequest } from '@/lib/server/auth';

export async function GET(request: Request) {
  const { user } = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ user });
}
