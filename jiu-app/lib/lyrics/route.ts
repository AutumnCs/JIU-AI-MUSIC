import { generateLyrics as generateLyricsFromProvider, validateLyricsInput } from './provider.ts';
import type { LyricsGenerateInput, LyricsGeneration } from './types.ts';

type CurrentUser = { id: string };
type RuntimeEnv = Record<string, string | undefined>;

export type LyricsPostHandlerDependencies = {
  getCurrentUser: (request: Request) => Promise<{ user: CurrentUser | null }>;
  generateLyrics: (input: LyricsGenerateInput, env: RuntimeEnv) => Promise<LyricsGeneration>;
  runtimeEnv: () => RuntimeEnv;
};

export function createLyricsPostHandler(dependencies: LyricsPostHandlerDependencies) {
  return async function post(request: Request): Promise<Response> {
    const auth = await dependencies.getCurrentUser(request);
    if (!auth.user) return Response.json({ error: 'unauthorized' }, { status: 401 });

    let body: LyricsGenerateInput;
    try {
      body = await request.json() as LyricsGenerateInput;
      body = validateLyricsInput(body);
    } catch {
      return Response.json({ error: 'bad_request' }, { status: 400 });
    }

    try {
      return Response.json(await dependencies.generateLyrics(body, dependencies.runtimeEnv()));
    } catch {
      return Response.json({ error: 'bad_request' }, { status: 400 });
    }
  };
}

export const generateLyrics = generateLyricsFromProvider;
