import { createLocalWorkshopProvider } from './local-provider.ts';
import { createRemoteWorkshopProvider } from './remote-provider.ts';
import type { WorkshopProvider } from './types.ts';

export function selectWorkshopProvider(options: { baseUrl?: string } = {}): WorkshopProvider {
  const baseUrl = options.baseUrl?.trim();
  return baseUrl ? createRemoteWorkshopProvider({ baseUrl }) : createLocalWorkshopProvider();
}

export function createWorkshopProvider(
  options: { baseUrl?: string; sampleAudioUrl?: string } = {},
): WorkshopProvider {
  const baseUrl = options.baseUrl?.trim();
  return baseUrl
    ? createRemoteWorkshopProvider({ baseUrl })
    : createLocalWorkshopProvider({ sampleAudioUrl: options.sampleAudioUrl ?? '/audio/sample-song.mp3' });
}
