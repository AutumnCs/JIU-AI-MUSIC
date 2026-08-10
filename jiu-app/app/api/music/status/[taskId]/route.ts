import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { NextRequest } from 'next/server';

import { createGetHandler, selectMusicProvider } from '@/lib/music/provider';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { findMusicTaskRecord, updateMusicTaskRecord } from '@/lib/server/db';
import { isR2Binding, persistAudioToR2 } from '@/lib/volcengine/r2';

export const runtime = 'nodejs';

const getHandler = createGetHandler({
  getCurrentUser: (request) => getCurrentUserFromRequest(request as NextRequest),
  findTask: findMusicTaskRecord,
  selectProvider: (name) => selectMusicProvider(runtimeEnv(), name),
  updateTask: updateMusicTaskRecord,
  persistAudio: (sourceUrl, taskId) => persistAudioToR2(getR2Bucket(), sourceUrl, taskId),
});

export function GET(request: NextRequest, context: { params: Promise<{ taskId: string }> }) {
  return getHandler(request, context);
}

function getR2Bucket() {
  try {
    const env = getCloudflareContext().env as { MUSIC_BUCKET?: unknown };
    return isR2Binding(env.MUSIC_BUCKET) ? env.MUSIC_BUCKET : null;
  } catch {
    return null;
  }
}

function runtimeEnv() {
  try {
    const context = getCloudflareContext();
    return { ...process.env, ...(context.env as Record<string, string | undefined>) };
  } catch {
    return process.env;
  }
}
