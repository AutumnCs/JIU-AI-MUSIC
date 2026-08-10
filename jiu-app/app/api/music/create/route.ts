import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { NextRequest } from 'next/server';

import { createPostHandler, selectMusicProvider } from '@/lib/music/provider';
import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { createMusicTaskRecord } from '@/lib/server/db';

export const runtime = 'nodejs';

const postHandler = createPostHandler({
  getCurrentUser: (request) => getCurrentUserFromRequest(request as NextRequest),
  selectProvider: () => selectMusicProvider(runtimeEnv()),
  createTaskRecord: createMusicTaskRecord,
});

export function POST(request: NextRequest) {
  return postHandler(request);
}

function runtimeEnv() {
  try {
    const context = getCloudflareContext();
    return { ...process.env, ...(context.env as Record<string, string | undefined>) };
  } catch {
    return process.env;
  }
}
