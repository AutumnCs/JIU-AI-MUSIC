import { NextResponse } from 'next/server';

import { createGuestUser, getCurrentUserFromRequest } from '@/lib/server/auth';
import { setSessionCookie } from '@/lib/server/cookies';

export async function POST(request: Request) {
  const current = await getCurrentUserFromRequest(request);
  if (current.user) return NextResponse.json({ user: current.user });

  const { user, session } = await createGuestUser();
  const response = NextResponse.json({ user });
  setSessionCookie(response, session.id);
  return response;
}
