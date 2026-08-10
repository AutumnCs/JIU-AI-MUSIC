import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { isR2Binding } from '@/lib/volcengine/r2';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(request: Request) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return NextResponse.json({ error: 'unauthorized', message: '请先创建游客身份' }, { status: 401 });

  const bucket = getBucket();
  if (!bucket) return NextResponse.json({ error: 'storage_unavailable', message: '图片存储暂不可用' }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'bad_request', message: '请选择图片' }, { status: 400 });
  if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'bad_request', message: '仅支持 5MB 以内的 JPG、PNG、WEBP 或 GIF 图片' }, { status: 400 });
  }

  const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
  const key = `community-${crypto.randomUUID()}.${extension}`;
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return NextResponse.json({ url: `/api/community/media/${key}`, key });
}

function getBucket() {
  try {
    const bucket = (getCloudflareContext().env as { MUSIC_BUCKET?: unknown }).MUSIC_BUCKET;
    return isR2Binding(bucket) ? bucket : null;
  } catch {
    return null;
  }
}
