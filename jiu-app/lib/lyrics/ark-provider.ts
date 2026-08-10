import type { LyricsGenerateInput, LyricsProvider } from './types.ts';

const ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const MAX_ERROR_DIAGNOSTIC_BYTES = 20 * 1024;

export class LyricsProviderError extends Error {
  readonly diagnostic: string;

  constructor(message: string, diagnostic = '') {
    super(message);
    this.name = 'LyricsProviderError';
    this.diagnostic = diagnostic;
  }
}

export class ArkLyricsProvider implements LyricsProvider {
  readonly name = 'ark' as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly request: typeof fetch;

  constructor(options: { apiKey: string; model?: string; fetch?: typeof fetch }) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'ep-20250318183720-xxxxx';
    this.request = options.fetch ?? globalThis.fetch;
  }

  async generate(input: LyricsGenerateInput): Promise<string> {
    let response: Response;
    try {
      response = await this.request(ARK_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: buildPrompt(input) }],
        }),
      });
    } catch {
      throw new LyricsProviderError('Ark lyrics request failed');
    }

    if (!response.ok) {
      throw new LyricsProviderError('Ark lyrics request failed', await readDiagnostic(response));
    }

    try {
      const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
      const lyrics = payload.choices?.[0]?.message?.content;
      if (typeof lyrics !== 'string' || !lyrics.trim()) throw new Error('Invalid Ark lyrics response');
      return lyrics.trim();
    } catch {
      throw new LyricsProviderError('Ark lyrics request failed');
    }
  }
}

function buildPrompt(input: LyricsGenerateInput): string {
  const base = input.mode === 'continue'
    ? `Continue these child-safe structured song lyrics: ${input.lyrics!.trim()}.`
    : `Write child-safe structured song lyrics about ${input.theme!.trim()}.`;
  const genre = input.genre?.trim();
  const mood = input.mood?.trim();
  return `${base}${genre ? ` Genre: ${genre}.` : ''}${mood ? ` Mood: ${mood}.` : ''}`;
}

async function readDiagnostic(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let remaining = MAX_ERROR_DIAGNOSTIC_BYTES;

  try {
    while (remaining > 0) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      remaining -= chunk.byteLength;
    }
  } finally {
    await reader.cancel();
  }

  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
