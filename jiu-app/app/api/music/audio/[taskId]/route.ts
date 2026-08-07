import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { findMusicTaskRecord } from '@/lib/server/db';
import { isR2Binding } from '@/lib/volcengine/r2';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized', message: '请先创建游客身份' }, { status: 401 });
  const { taskId } = await params;
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(taskId)) return NextResponse.json({ error: 'bad_request', message: '任务编号无效' }, { status: 400 });

  const task = await findMusicTaskRecord(taskId, auth.user.id);
  if (!task) return NextResponse.json({ error: 'not_found', message: '找不到这个音乐任务' }, { status: 404 });

  const bucket = getR2Bucket();
  if (!bucket) return NextResponse.json({ error: 'not_configured', message: 'R2 音频存储尚未配置' }, { status: 503 });
  const object = await bucket.get(`${taskId}.wav`);
  if (!object?.body) return NextResponse.json({ error: 'not_found', message: '音频还没有保存完成' }, { status: 404 });
  const headers = new Headers({
    'content-type': object.httpMetadata?.contentType ?? 'audio/wav',
    'cache-control': 'private, max-age=31536000, immutable',
  });
  return new Response(object.body, { headers });
}

function getR2Bucket() {
  try {
    const env = getCloudflareContext().env as { MUSIC_BUCKET?: unknown };
    return isR2Binding(env.MUSIC_BUCKET) ? env.MUSIC_BUCKET : null;
  } catch {
    return null;
  }
}
