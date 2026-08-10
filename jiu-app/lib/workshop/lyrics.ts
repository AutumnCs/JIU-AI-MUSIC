type LyricsRequest = {
  mode: 'write' | 'continue';
  theme?: string;
  lyrics?: string;
  genre?: string;
  mood?: string;
};

export async function requestWorkshopLyrics(
  input: LyricsRequest,
  fallback: () => string,
  request: typeof fetch = globalThis.fetch,
): Promise<string> {
  try {
    const response = await request('/api/lyrics/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) return fallback();
    const payload = await response.json() as { lyrics?: unknown };
    return typeof payload.lyrics === 'string' && payload.lyrics.trim() ? payload.lyrics.trim() : fallback();
  } catch {
    return fallback();
  }
}
