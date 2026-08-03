import { NextResponse } from 'next/server';

import { revokeCurrentSession } from '@/lib/server/auth';
import { clearSessionCookie } from '@/lib/server/cookies';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  await revokeCurrentSession(request);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
