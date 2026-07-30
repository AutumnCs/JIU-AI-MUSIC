'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { LEVELS } from '@/lib/constants';
import { useGlobalStore } from '@/stores/globalStore';
import { ACADEMY_GAMES } from '@/components/academy/games';
import { LevelPreparation } from '@/components/academy/LevelPreparation';
import { LevelResultModal } from '@/components/academy/LevelResultModal';

type Phase = 'preparation' | 'playing' | 'result';

const STAGE_BACKGROUND = {
  1: 'from-sky-100 via-cyan-50 to-orange-50',
  2: 'from-lime-100 via-green-50 to-amber-50',
  3: 'from-indigo-100 via-purple-50 to-[#fff8f0]',
} as const;

export default function LevelPage() {
  const params = useParams();
  const router = useRouter();
  const levelId = Number(params.id);
  const levelIndex = LEVELS.findIndex((item) => item.id === levelId);
  const level = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1];
  const {
    academySession,
    startAcademyLevel,
    reportAcademyMistake,
    completeLevel,
  } = useGlobalStore();
  const [phase, setPhase] = useState<Phase>('preparation');
  const [attemptKey, setAttemptKey] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [reward, setReward] = useState<{
    type: '绒羽';
    count: number;
  } | null>(null);

  useEffect(() => {
    if (level) startAcademyLevel(level.id);
  }, [level, startAcademyLevel]);

  useEffect(() => {
    setPhase('preparation');
    setAttemptKey(0);
    setHelpOpen(false);
    setScore(0);
    setReward(null);
  }, [levelId]);

  const handleComplete = useCallback(
    (nextScore: number) => {
      if (!level || phase === 'result') return;
      const result = completeLevel(level.id, nextScore);
      setScore(nextScore);
      setReward({ type: result.type, count: result.count });
      setPhase('result');
    },
    [completeLevel, level, phase],
  );

  const retry = () => {
    if (!level) return;
    startAcademyLevel(level.id);
    setAttemptKey((value) => value + 1);
    setScore(0);
    setReward(null);
    setHelpOpen(false);
    setPhase('playing');
  };

  if (!level) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0] p-8 text-center">
        <div>
          <div className="mb-3 text-5xl">🧭</div>
          <p className="font-bold text-gray-700">这条山路还没有开放</p>
          <button
            onClick={() => router.push('/academy')}
            className="mt-4 rounded-xl bg-orange-500 px-5 py-2 font-bold text-white"
          >
            返回地图
          </button>
        </div>
      </div>
    );
  }

  const Game = ACADEMY_GAMES[level.game];
  const stageProgress = (level.order / LEVELS.length) * 100;

  return (
    <main
      className={`flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-gradient-to-b ${STAGE_BACKGROUND[level.stageId]}`}
      style={{ height: 'calc(100dvh - var(--bottom-nav-height))' }}
    >
      <header className="z-30 shrink-0 border-b border-white/70 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-xl sm:py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/academy')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-600"
            aria-label="返回学院地图"
          >
            ←
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-wider text-green-600">
              第 {level.stageId} 阶段 · {level.stageName}
            </p>
            <h1 className="truncate text-base font-black text-slate-800">
              {level.stageId}-{level.lesson} · {level.name}
            </h1>
          </div>
          {phase === 'playing' && (
            <button
              onClick={() => setHelpOpen((value) => !value)}
              className={`grid h-9 w-9 place-items-center rounded-full text-sm font-black ${
                helpOpen ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
              }`}
              aria-label={helpOpen ? '关闭关卡帮助' : '打开关卡帮助'}
            >
              ?
            </button>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-green-500"
            animate={{ width: `${stageProgress}%` }}
          />
        </div>
      </header>

      <section className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col overflow-hidden px-3 py-2 sm:px-4 sm:py-5">
        <AnimatePresence mode="wait">
          {phase === 'preparation' && (
            <motion.div
              key="preparation"
              className="min-h-0 flex-1"
              exit={{ opacity: 0, y: -12 }}
            >
              <LevelPreparation
                level={level}
                simpleMode={academySession.simpleMode}
                onStart={() => setPhase('playing')}
              />
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div
              key={`playing-${attemptKey}`}
              className="min-h-0 flex-1 overflow-hidden"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-2 hidden items-center justify-between sm:flex">
                <div>
                  <p className="text-[11px] font-black tracking-wider text-slate-400">正在挑战</p>
                  <p className="mt-0.5 hidden text-sm font-bold text-slate-700 sm:block">
                    {level.subtitle}
                  </p>
                </div>
                {academySession.simpleMode && (
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-orange-600 shadow-sm">
                    🐦 简单模式
                  </span>
                )}
              </div>

              <AnimatePresence>
                {helpOpen && (
                  <motion.aside
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="flex gap-2 rounded-2xl border border-orange-100 bg-white/90 p-3 shadow-sm">
                      <span className="text-xl" aria-hidden="true">🐦</span>
                      <div>
                        <p className="text-xs font-black text-orange-500">过关提示</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                          {level.companionTip}
                        </p>
                      </div>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              <div className="h-full min-h-0 overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/75 p-3 shadow-xl shadow-slate-200/50 backdrop-blur-sm sm:rounded-[1.75rem] sm:p-4">
                <Game
                  key={attemptKey}
                  onComplete={handleComplete}
                  onMistake={() => reportAcademyMistake(level.id)}
                  simpleMode={academySession.simpleMode}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {phase === 'result' && (
        <LevelResultModal
          level={level}
          nextLevel={nextLevel}
          score={score}
          rewardCount={reward?.count ?? 0}
          onRetry={retry}
          onMap={() => router.push('/academy')}
          onNext={() =>
            nextLevel
              ? router.push(`/academy/level/${nextLevel.id}`)
              : router.push('/academy')
          }
        />
      )}
    </main>
  );
}
