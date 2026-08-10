import { getCloudflareContext } from '@opennextjs/cloudflare';

import { createLyricsPostHandler, generateLyrics } from '@/lib/lyrics/route';
import { getCurrentUserFromRequest } from '@/lib/server/auth';

export const runtime = 'nodejs';

const postHandler = createLyricsPostHandler({
  getCurrentUser: getCurrentUserFromRequest,
  generateLyrics,
  runtimeEnv,
});

export function POST(request: Request) {
  return postHandler(request);
}

function runtimeEnv(): Record<string, string | undefined> {
  try {
    const context = getCloudflareContext();
    return { ...process.env, ...(context.env as Record<string, string | undefined>) };
  } catch {
    return process.env;
  }
}
