import { normalizeStoredDraft, normalizeStoredPublishedWorks } from './normalize.ts';
import type { PublishedWork, WorkshopDraft } from './types.ts';

const DRAFT_STORAGE_KEY = 'jiu_workshop_draft';
const WORKS_STORAGE_KEY = 'jiu_workshop_works';

type StorageSource = 'local' | 'server';

export function readWorkshopDraft(activeUserId: string | null, source: StorageSource): WorkshopDraft | null {
  const scopedRaw = getStorageItem(getDraftStorageKey(activeUserId));
  if (scopedRaw !== null) return normalizeStoredDraft(scopedRaw);

  return source === 'local' ? normalizeStoredDraft(getStorageItem(DRAFT_STORAGE_KEY)) : null;
}

export function readWorkshopWorks(activeUserId: string | null, source: StorageSource): PublishedWork[] {
  const scopedRaw = getStorageItem(getWorksStorageKey(activeUserId));
  if (scopedRaw !== null) return normalizeStoredPublishedWorks(scopedRaw) ?? [];

  return source === 'local' ? normalizeStoredPublishedWorks(getStorageItem(WORKS_STORAGE_KEY)) ?? [] : [];
}

export function writeWorkshopDraft(activeUserId: string | null, draft: WorkshopDraft): void {
  setStorageItem(getDraftStorageKey(activeUserId), JSON.stringify(draft));
}

export function writeWorkshopWork(activeUserId: string | null, work: PublishedWork): void {
  const key = getWorksStorageKey(activeUserId);
  const existing = normalizeStoredPublishedWorks(getStorageItem(key)) ?? [];
  setStorageItem(key, JSON.stringify([work, ...existing]));
}

function getDraftStorageKey(activeUserId: string | null): string {
  return activeUserId ? `${DRAFT_STORAGE_KEY}:${activeUserId}` : DRAFT_STORAGE_KEY;
}

function getWorksStorageKey(activeUserId: string | null): string {
  return activeUserId ? `${WORKS_STORAGE_KEY}:${activeUserId}` : WORKS_STORAGE_KEY;
}

function getStorageItem(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;

  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is best-effort so unavailable browser storage never breaks the workshop.
  }
}
