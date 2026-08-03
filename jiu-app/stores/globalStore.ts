import { create } from 'zustand';

import { getActiveUserId } from '@/lib/auth/active-user';
import { BIRDS } from '@/lib/constants';
import type { AuthState } from '@/lib/auth/types';

type FragmentType = '绒羽' | '怪羽' | '暗羽';

type FragmentCounts = Record<FragmentType, number>;

export interface AcademyProgress {
  completed: boolean;
  bestScore: number;
  attempts: number;
  baseRewardClaimed: boolean;
  perfectRewardClaimed: boolean;
}

export interface AcademySession {
  levelId: number | null;
  wrongStreak: number;
  assistanceVisible: boolean;
  simpleMode: boolean;
}

export interface LevelRewardResult {
  type: '绒羽';
  count: number;
  firstCompletion: boolean;
  perfectBonus: boolean;
}

interface GlobalState {
  authState: AuthState;
  currentBirdId: number;
  fragments: FragmentCounts;
  unlockedBirds: number[];
  academyProgress: Record<number, AcademyProgress>;
  academySession: AcademySession;
  hasSeenOnboarding: boolean;

  init: (authState: AuthState) => void;
  setCurrentBird: (id: number) => void;
  addFragment: (type: FragmentType, count: number) => void;
  unlockBird: (id: number) => void;
  exchangeBird: (id: number) => boolean;
  completeLevel: (levelId: number, score: number) => LevelRewardResult;
  startAcademyLevel: (levelId: number) => void;
  reportAcademyMistake: (levelId: number) => void;
  resetAcademyMistakes: () => void;
  enableSimpleMode: () => void;
  dismissAcademyAssistance: () => void;
  setOnboarded: () => void;
  getUnlockedBirdIds: () => number[];
}

const DEFAULT_FRAGMENTS: FragmentCounts = {
  '绒羽': 0,
  '怪羽': 0,
  '暗羽': 0,
};

const DEFAULT_ACADEMY_SESSION: AcademySession = {
  levelId: null,
  wrongStreak: 0,
  assistanceVisible: false,
  simpleMode: false,
};

const STATE_STORAGE_KEY = 'jiu_state';

export const useGlobalStore = create<GlobalState>((set, get) => ({
  authState: { user: null, session: null, source: 'local' },
  currentBirdId: 1,
  fragments: { ...DEFAULT_FRAGMENTS },
  unlockedBirds: [1],
  academyProgress: {},
  academySession: { ...DEFAULT_ACADEMY_SESSION },
  hasSeenOnboarding: false,

  init: (authState) => {
    const restoredState = readPersistedState(authState);
    if (restoredState) {
      set({
        authState,
        currentBirdId: restoredState.currentBirdId ?? 1,
        fragments: restoredState.fragments ?? { ...DEFAULT_FRAGMENTS },
        unlockedBirds: restoredState.unlockedBirds ?? [1],
        academyProgress: restoredState.academyProgress ?? {},
        academySession: { ...DEFAULT_ACADEMY_SESSION },
        hasSeenOnboarding: restoredState.hasSeenOnboarding ?? false,
      });
      persistState(get());
      return;
    }

    set({
      authState,
      currentBirdId: 1,
      fragments: { ...DEFAULT_FRAGMENTS },
      unlockedBirds: [1],
      academyProgress: {},
      academySession: { ...DEFAULT_ACADEMY_SESSION },
      hasSeenOnboarding: false,
    });
    persistState(get());
  },

  setCurrentBird: (id) => {
    set({ currentBirdId: id });
    persistState(get());
  },

  addFragment: (type, count) => {
    set((state) => ({
      fragments: {
        ...state.fragments,
        [type]: state.fragments[type] + count,
      },
    }));
    persistState(get());
  },

  unlockBird: (id) => {
    set((state) => {
      if (state.unlockedBirds.includes(id)) return state;
      return { unlockedBirds: [...state.unlockedBirds, id] };
    });
    persistState(get());
  },

  exchangeBird: (id) => {
    const bird = BIRDS.find((item) => item.id === id);
    if (!bird || !bird.fragmentType || bird.fragmentNeeded <= 0) return false;
    if (get().unlockedBirds.includes(id)) return true;

    const fragmentType = bird.fragmentType as FragmentType;
    if (get().fragments[fragmentType] < bird.fragmentNeeded) return false;

    set((state) => ({
      fragments: {
        ...state.fragments,
        [fragmentType]: state.fragments[fragmentType] - bird.fragmentNeeded,
      },
      unlockedBirds: [...state.unlockedBirds, id],
    }));
    persistState(get());
    return true;
  },

  completeLevel: (levelId, score) => {
    const rewardType: FragmentType = '绒羽';
    const previous = get().academyProgress[levelId];
    const firstCompletion = !previous?.baseRewardClaimed;
    const perfectBonus = score >= 3 && !previous?.perfectRewardClaimed;
    const rewardCount = (firstCompletion ? 2 : 0) + (perfectBonus ? 1 : 0);

    set((state) => {
      const prev = state.academyProgress[levelId];
      const bestScore = prev ? Math.max(prev.bestScore, score) : score;
      return {
        fragments:
          rewardCount > 0
            ? {
                ...state.fragments,
                [rewardType]: state.fragments[rewardType] + rewardCount,
              }
            : state.fragments,
        academyProgress: {
          ...state.academyProgress,
          [levelId]: {
            completed: true,
            bestScore,
            attempts: (prev?.attempts ?? 0) + 1,
            baseRewardClaimed: true,
            perfectRewardClaimed: Boolean(prev?.perfectRewardClaimed || score >= 3),
          },
        },
      };
    });
    persistState(get());

    return {
      type: rewardType,
      count: rewardCount,
      firstCompletion,
      perfectBonus,
    };
  },

  startAcademyLevel: (levelId) => {
    set({
      academySession: {
        levelId,
        wrongStreak: 0,
        assistanceVisible: false,
        simpleMode: false,
      },
    });
  },

  reportAcademyMistake: (levelId) => {
    set((state) => {
      const isCurrentLevel = state.academySession.levelId === levelId;
      const wrongStreak = isCurrentLevel ? state.academySession.wrongStreak + 1 : 1;
      return {
        academySession: {
          levelId,
          wrongStreak,
          simpleMode: isCurrentLevel ? state.academySession.simpleMode : false,
          assistanceVisible: wrongStreak >= 3,
        },
      };
    });
  },

  resetAcademyMistakes: () => {
    set((state) => ({
      academySession: {
        ...state.academySession,
        wrongStreak: 0,
        assistanceVisible: false,
      },
    }));
  },

  enableSimpleMode: () => {
    set((state) => ({
      academySession: {
        ...state.academySession,
        wrongStreak: 0,
        assistanceVisible: false,
        simpleMode: true,
      },
    }));
  },

  dismissAcademyAssistance: () => {
    set((state) => ({
      academySession: {
        ...state.academySession,
        assistanceVisible: false,
      },
    }));
  },

  setOnboarded: () => {
    set({ hasSeenOnboarding: true });
    localStorage.setItem('jiu_onboarded', '1');
    persistState(get());
  },

  getUnlockedBirdIds: () => get().unlockedBirds,
}));

type PersistedState = {
  currentBirdId?: number;
  fragments?: FragmentCounts;
  unlockedBirds?: number[];
  academyProgress?: Record<number, AcademyProgress>;
  hasSeenOnboarding?: boolean;
};

function persistState(state: GlobalState) {
  const { authState, academySession, ...toSave } = state;
  void academySession;
  localStorage.setItem(getStateStorageKey(authState), JSON.stringify(toSave));
}

function readPersistedState(authState: AuthState): PersistedState | null {
  const scopedKey = getStateStorageKey(authState);
  const scopedState = localStorage.getItem(scopedKey);
  if (scopedState) return parsePersistedState(scopedState);

  if (authState.source === 'local') {
    const legacyState = localStorage.getItem(STATE_STORAGE_KEY);
    if (legacyState) return parsePersistedState(legacyState);
  }

  return null;
}

function parsePersistedState(raw: string): PersistedState | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      currentBirdId: typeof parsed.currentBirdId === 'number' ? parsed.currentBirdId : undefined,
      fragments: isFragmentCounts(parsed.fragments) ? parsed.fragments : undefined,
      unlockedBirds: Array.isArray(parsed.unlockedBirds)
        ? parsed.unlockedBirds.filter((value): value is number => typeof value === 'number')
        : undefined,
      academyProgress: normalizeAcademyProgress(parsed.academyProgress),
      hasSeenOnboarding: typeof parsed.hasSeenOnboarding === 'boolean' ? parsed.hasSeenOnboarding : undefined,
    };
  } catch {
    return null;
  }
}

function normalizeAcademyProgress(value: unknown): Record<number, AcademyProgress> | undefined {
  if (!isRecord(value)) return undefined;

  return Object.fromEntries(
    Object.entries(value).flatMap(([id, rawProgress]) => {
      if (!isRecord(rawProgress)) return [];

      const completed = Boolean(rawProgress.completed);
      return [
        [
          Number(id),
          {
            completed,
            bestScore: typeof rawProgress.bestScore === 'number' ? rawProgress.bestScore : 0,
            attempts:
              typeof rawProgress.attempts === 'number'
                ? rawProgress.attempts
                : completed
                  ? 1
                  : 0,
            baseRewardClaimed:
              typeof rawProgress.baseRewardClaimed === 'boolean'
                ? rawProgress.baseRewardClaimed
                : completed,
            perfectRewardClaimed:
              typeof rawProgress.perfectRewardClaimed === 'boolean'
                ? rawProgress.perfectRewardClaimed
                : Boolean(completed && (typeof rawProgress.bestScore === 'number' ? rawProgress.bestScore : 0) >= 3),
          },
        ] as const,
      ];
    }),
  );
}

function isFragmentCounts(value: unknown): value is FragmentCounts {
  return (
    isRecord(value) &&
    typeof value['绒羽'] === 'number' &&
    typeof value['怪羽'] === 'number' &&
    typeof value['暗羽'] === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStateStorageKey(authState: AuthState): string {
  const activeUserId = getActiveUserId(authState);
  return activeUserId ? `${STATE_STORAGE_KEY}:${activeUserId}` : STATE_STORAGE_KEY;
}
