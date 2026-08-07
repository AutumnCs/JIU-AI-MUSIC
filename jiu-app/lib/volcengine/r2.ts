type R2Binding = {
  get(key: string): Promise<{ body?: ReadableStream | null; httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
};

export async function persistAudioToR2(
  bucket: R2Binding | null | undefined,
  audioUrl: string,
  taskId: string,
): Promise<{ url: string; persisted: boolean }> {
  if (!bucket) return { url: audioUrl, persisted: false };

  const key = `${taskId}.wav`;
  if (await bucket.get(key)) return { url: `/api/music/audio/${encodeURIComponent(taskId)}`, persisted: true };

  const response = await fetch(audioUrl);
  if (!response.ok) throw new Error(`Failed to download audio: ${response.status}`);
  await bucket.put(key, response.body as ReadableStream, {
    httpMetadata: { contentType: response.headers.get('content-type') ?? 'audio/wav' },
  });
  return { url: `/api/music/audio/${encodeURIComponent(taskId)}`, persisted: true };
}

export function isR2Binding(value: unknown): value is R2Binding {
  return typeof value === 'object' && value !== null && typeof (value as R2Binding).get === 'function' && typeof (value as R2Binding).put === 'function';
}
