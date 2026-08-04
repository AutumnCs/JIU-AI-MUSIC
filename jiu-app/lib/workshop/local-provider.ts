import type { WorkshopDraft, WorkshopProvider } from './types.ts';

const DEFAULT_SAMPLE_AUDIO_URL = '/audio/sample-song.mp3';

export function createLocalWorkshopProvider(
  options: { sampleAudioUrl: string } = { sampleAudioUrl: DEFAULT_SAMPLE_AUDIO_URL },
): WorkshopProvider {
  const sampleAudioUrl = options.sampleAudioUrl || DEFAULT_SAMPLE_AUDIO_URL;

  return {
    provider: 'local',
    async createTask(draft) {
      const id = `local-${hashDraft(draft)}`;
      const now = new Date().toISOString();
      const title = draft.title.trim() || draft.idea.trim() || 'Untitled song';
      const lyrics = draft.instrumental ? '' : draft.lyrics.trim() || draft.idea.trim();

      return {
        id,
        status: 'succeeded',
        provider: 'local',
        request: { ...draft, instruments: [...draft.instruments] },
        createdAt: now,
        updatedAt: now,
        result: {
          taskId: id,
          title,
          lyrics,
          audioUrl: sampleAudioUrl,
          genre: draft.genre,
          mood: draft.mood,
          instruments: [...draft.instruments],
          sourceProvider: 'local',
        },
      };
    },
  };
}

function hashDraft(draft: WorkshopDraft): string {
  let hash = 5381;
  for (const character of JSON.stringify(draft)) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
}
