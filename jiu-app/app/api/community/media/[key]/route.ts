import { getCloudflareContext } from '@opennextjs/cloudflare';

import { isR2Binding } from '@/lib/volcengine/r2';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const bucket = getBucket();
  if (!bucket) return new Response('Storage unavailable', { status: 503 });
  const object = await bucket.get((await params).key);
  if (!object?.body) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    },
  });
}

function getBucket() {
  try {
    const bucket = (getCloudflareContext().env as { MUSIC_BUCKET?: unknown }).MUSIC_BUCKET;
    return isR2Binding(bucket) ? bucket : null;
  } catch {
    return null;
  }
}
