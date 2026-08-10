export type SongTitleInput = { idea: string; lyrics?: string; genre?: string; mood?: string };

export async function requestSongTitle(input: SongTitleInput): Promise<string> {
  const response = await fetch('/api/music/title', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Song title generation failed');
  const payload = await response.json() as { title?: string };
  if (!payload.title?.trim()) throw new Error('Song title was empty');
  return payload.title.trim();
}
