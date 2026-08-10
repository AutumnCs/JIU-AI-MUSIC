import { NextResponse } from 'next/server';

import { registerEmailAccount, getCurrentUserFromRequest } from '@/lib/server/auth';
import { setSessionCookie } from '@/lib/server/cookies';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; displayName?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'invalid_json', message: '请求格式不正确' }, { status: 400 }); }

  try {
    const current = await getCurrentUserFromRequest(request);
    const result = await registerEmailAccount({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      guestUserId: current.user?.type === 'guest' ? current.user.id : undefined,
    });
    const response = NextResponse.json(result, { status: 201 });
    setSessionCookie(response, result.session.id);
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : 'register_failed';
    if (code === 'invalid_email') return NextResponse.json({ error: code, message: '请输入正确的邮箱地址' }, { status: 400 });
    if (code === 'invalid_password') return NextResponse.json({ error: code, message: '密码需要为 8-72 位' }, { status: 400 });
    if (code === 'invalid_display_name') return NextResponse.json({ error: code, message: '昵称需要为 1-24 个字符' }, { status: 400 });
    if (code === 'email_exists') return NextResponse.json({ error: code, message: '这个邮箱已经注册过了' }, { status: 409 });
    return NextResponse.json({ error: 'register_failed', message: '注册暂时失败，请稍后再试' }, { status: 500 });
  }
}
