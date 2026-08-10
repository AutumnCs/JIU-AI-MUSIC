import { ArkLyricsProvider } from './ark-provider.ts';
import { TemplateLyricsProvider } from './template-provider.ts';
import type { LyricsGenerateInput, LyricsGeneration, LyricsProvider } from './types.ts';

export class LyricsInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LyricsInputError';
  }
}

type LyricsRuntimeEnv = Record<string, string | undefined>;

export type GenerateLyricsDependencies = {
  arkProvider?: LyricsProvider;
  templateProvider?: LyricsProvider;
};

export async function generateLyrics(
  input: LyricsGenerateInput,
  env: LyricsRuntimeEnv,
  dependencies: GenerateLyricsDependencies = {},
): Promise<LyricsGeneration> {
  const validated = validateLyricsInput(input);
  const template = dependencies.templateProvider ?? new TemplateLyricsProvider();
  const apiKey = env.ARK_API_KEY?.trim();
  if (!apiKey) return generateWith(template, validated);

  const ark = dependencies.arkProvider ?? new ArkLyricsProvider({ apiKey, model: env.ARK_MODEL });
  try {
    return await generateWith(ark, validated);
  } catch {
    return generateWith(template, validated);
  }
}

export function validateLyricsInput(input: LyricsGenerateInput): LyricsGenerateInput {
  if (!input || (input.mode !== 'write' && input.mode !== 'continue')) {
    throw new LyricsInputError('Invalid lyrics mode');
  }
  if (input.theme !== undefined && typeof input.theme !== 'string') throw new LyricsInputError('Invalid lyrics theme');
  if (input.lyrics !== undefined && typeof input.lyrics !== 'string') throw new LyricsInputError('Invalid existing lyrics');
  if (input.genre !== undefined && typeof input.genre !== 'string') throw new LyricsInputError('Invalid genre');
  if (input.mood !== undefined && typeof input.mood !== 'string') throw new LyricsInputError('Invalid mood');

  const theme = input.theme?.trim();
  const lyrics = input.lyrics?.trim();
  if (theme && Array.from(theme).length > 200) throw new LyricsInputError('Lyrics theme is too long');
  if (lyrics && Array.from(lyrics).length > 1200) throw new LyricsInputError('Existing lyrics are too long');
  if (input.mode === 'write' && !theme) throw new LyricsInputError('Lyrics theme is required');
  if (input.mode === 'continue' && !lyrics) throw new LyricsInputError('Existing lyrics are required');

  return { ...input, ...(theme ? { theme } : {}), ...(lyrics ? { lyrics } : {}) };
}

async function generateWith(provider: LyricsProvider, input: LyricsGenerateInput): Promise<LyricsGeneration> {
  return { lyrics: await provider.generate(input), provider: provider.name };
}
