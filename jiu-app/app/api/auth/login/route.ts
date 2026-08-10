import { NextResponse } from 'next/server';

import { loginEmailAccount } from '@/lib/server/auth';
import { setSessionCookie } from '@/lib/server/cookies';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: 'invalid_json', message: '请求格式不正确' }, { status: 400 }); }

  try {
    const result = await loginEmailAccount({ email: body.email, password: body.password });
    const response = NextResponse.json(result);
    setSessionCookie(response, result.session.id);
    return response;
  } catch (error) {
    const code = error instanceof Error ? error.message : 'login_failed';
    if (code === 'invalid_email' || code === 'invalid_password' || code === 'invalid_credentials') {
      return NextResponse.json({ error: 'invalid_credentials', message: '邮箱或密码不正确' }, { status: 401 });
    }
    return NextResponse.json({ error: 'login_failed', message: '登录暂时失败，请稍后再试' }, { status: 500 });
  }
}
