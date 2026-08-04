import type { PublishedWork, WorkshopDraft } from './types.ts';
import { normalizeStoredDraft, normalizeStoredPublishedWorks } from './normalize.ts';

const DRAFT_KEY = 'jiu_workshop_draft';
const WORKS_KEY = 'jiu_workshop_works';

export function getWorkshopDraftStorageKey(activeUserId: string | null): string {
  return activeUserId ? `${DRAFT_KEY}:${activeUserId}` : DRAFT_KEY;
}

export function getWorkshopWorksStorageKey(activeUserId: string | null): string {
  return activeUserId ? `${WORKS_KEY}:${activeUserId}` : WORKS_KEY;
}

export function readWorkshopDraft(activeUserId: string | null, source: 'local' | 'server'): WorkshopDraft | null {
  const storage = getStorage();
  if (!storage) return null;

  const scoped = normalizeStoredDraft(storage.getItem(getWorkshopDraftStorageKey(activeUserId)));
  if (scoped) return scoped;

  if (source !== 'local') return null;
  return normalizeStoredDraft(storage.getItem(DRAFT_KEY));
}

export function readWorkshopWorks(activeUserId: string | null, source: 'local' | 'server'): PublishedWork[] {
  const storage = getStorage();
  if (!storage) return [];

  const scoped = normalizeStoredPublishedWorks(storage.getItem(getWorkshopWorksStorageKey(activeUserId)));
  if (scoped) return scoped;

  if (source !== 'local') return [];
  return normalizeStoredPublishedWorks(storage.getItem(WORKS_KEY)) ?? [];
}

export function writeWorkshopDraft(activeUserId: string | null, draft: WorkshopDraft): void {
  const storage = getStorage();
  if (!storage) return;

  const serialized = JSON.stringify(draft);
  storage.setItem(getWorkshopDraftStorageKey(activeUserId), serialized);
  if (!activeUserId) {
    storage.setItem(DRAFT_KEY, serialized);
  }
}

export function writeWorkshopWork(activeUserId: string | null, work: PublishedWork): void {
  const storage = getStorage();
  if (!storage) return;

  const existing = readWorkshopWorks(activeUserId, 'local');
  const next = [work, ...existing.filter((item) => item.id !== work.id)];
  const serialized = JSON.stringify(next);
  storage.setItem(getWorkshopWorksStorageKey(activeUserId), serialized);
  if (!activeUserId) {
    storage.setItem(WORKS_KEY, serialized);
  }
}

function getStorage(): Storage | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null;
  return globalThis.localStorage;
}
