import { create } from 'zustand';
import { BIRDS } from '@/lib/constants';

function getUserId(): string {
  if (typeof window === 'undefined') return 'server';
  let uid = localStorage.getItem('jiu_user_id');
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('jiu_user_id', uid);
  }
  return uid;
}

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
  userId: string;
  currentBirdId: number;
  fragments: { 绒羽: number; 怪羽: number; 暗羽: number };
  unlockedBirds: number[];
  academyProgress: Record<number, AcademyProgress>;
  academySession: AcademySession;
  hasSeenOnboarding: boolean;

  init: () => void;
  setCurrentBird: (id: number) => void;
  addFragment: (type: '绒羽' | '怪羽' | '暗羽', count: number) => void;
  unlockBird: (id: number) => void;
  completeLevel: (
    levelId: number,
    score: number,
  ) => LevelRewardResult;
  startAcademyLevel: (levelId: number) => void;
  reportAcademyMistake: (levelId: number) => void;
  resetAcademyMistakes: () => void;
  enableSimpleMode: () => void;
  dismissAcademyAssistance: () => void;
  setOnboarded: () => void;
  getUnlockedBirdIds: () => number[];
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  userId: '',
  currentBirdId: 1,
  fragments: { 绒羽: 0, 怪羽: 0, 暗羽: 0 },
  unlockedBirds: [1],
  academyProgress: {},
  academySession: {
    levelId: null,
    wrongStreak: 0,
    assistanceVisible: false,
    simpleMode: false,
  },
  hasSeenOnboarding: false,

  init: () => {
    const uid = getUserId();
    const saved = localStorage.getItem('jiu_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const academyProgress = Object.fromEntries(
          Object.entries(parsed.academyProgress ?? {}).map(([id, value]) => {
            const progress = value as Partial<AcademyProgress>;
            return [
              id,
              {
                completed: Boolean(progress.completed),
                bestScore: progress.bestScore ?? 0,
                attempts: progress.attempts ?? (progress.completed ? 1 : 0),
                // Older saves already received a reward when the level completed.
                baseRewardClaimed:
                  progress.baseRewardClaimed ?? Boolean(progress.completed),
                perfectRewardClaimed:
                  progress.perfectRewardClaimed ??
                  Boolean(progress.completed && (progress.bestScore ?? 0) >= 3),
              },
            ];
          }),
        );
        set({
          ...parsed,
          academyProgress,
          academySession: {
            levelId: null,
            wrongStreak: 0,
            assistanceVisible: false,
            simpleMode: false,
          },
          userId: uid,
        });
        return;
      } catch {}
    }
    set({ userId: uid, unlockedBirds: [1], currentBirdId: 1 });
  },

  setCurrentBird: (id) => {
    set({ currentBirdId: id });
    persistState(get());
  },

  addFragment: (type, count) => {
    set((s) => {
      const newFragments = { ...s.fragments, [type]: s.fragments[type] + count };
      return { fragments: newFragments };
    });
    checkBirdUnlocks(get(), set);
    persistState(get());
  },

  unlockBird: (id) => {
    set((s) => {
      if (s.unlockedBirds.includes(id)) return s;
      return { unlockedBirds: [...s.unlockedBirds, id] };
    });
    persistState(get());
  },

  completeLevel: (levelId, score) => {
    const rewardType = '绒羽' as const;
    const previous = get().academyProgress[levelId];
    const firstCompletion = !previous?.baseRewardClaimed;
    const perfectBonus = score >= 3 && !previous?.perfectRewardClaimed;
    const rewardCount = (firstCompletion ? 2 : 0) + (perfectBonus ? 1 : 0);

    set((s) => {
      const prev = s.academyProgress[levelId];
      const bestScore = prev ? Math.max(prev.bestScore, score) : score;
      return {
        fragments:
          rewardCount > 0
            ? {
                ...s.fragments,
                [rewardType]: s.fragments[rewardType] + rewardCount,
              }
            : s.fragments,
        academyProgress: {
          ...s.academyProgress,
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
    checkBirdUnlocks(get(), set);
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
  },

  getUnlockedBirdIds: () => get().unlockedBirds,
}));

function persistState(state: GlobalState) {
  const { userId, academySession, ...toSave } = state;
  void userId;
  void academySession;
  localStorage.setItem('jiu_state', JSON.stringify(toSave));
}

function checkBirdUnlocks(
  state: GlobalState,
  set: (fn: (s: GlobalState) => Partial<GlobalState>) => void
) {
  for (const bird of BIRDS) {
    if (state.unlockedBirds.includes(bird.id)) continue;
    if (!bird.fragmentType) continue;
    const have = state.fragments[bird.fragmentType as keyof typeof state.fragments] || 0;
    if (have >= bird.fragmentNeeded) {
      set((s) => ({
        unlockedBirds: [...s.unlockedBirds, bird.id],
      }));
    }
  }
}
