'use client';

import { motion } from 'framer-motion';
import { AcademyLevel } from '@/lib/constants';

interface LevelResultModalProps {
  level: AcademyLevel;
  nextLevel?: AcademyLevel;
  score: number;
  rewardCount: number;
  onRetry: () => void;
  onNext: () => void;
  onMap: () => void;
}

export function LevelResultModal({
  level,
  nextLevel,
  score,
  rewardCount,
  onRetry,
  onNext,
  onMap,
}: LevelResultModalProps) {
  const performance = score >= 3 ? 100 : score === 2 ? 80 : 60;
  const message =
    score >= 3
      ? '太棒了，这是一次完美演出！'
      : score === 2
        ? '节奏越来越稳了，再来一次可以拿满星！'
        : '你已经完成挑战，继续练习会越来越轻松！';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm">
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={`${level.name}通关结果`}
        initial={{ opacity: 0, scale: 0.86, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/80 bg-[#fffdf5] p-5 text-center shadow-2xl"
      >
        <motion.div
          initial={{ rotate: -8, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-[1.7rem] bg-orange-100 text-4xl"
        >
          {score >= 3 ? '🏆' : '🎉'}
        </motion.div>

        <p className="mt-4 text-xs font-black tracking-widest text-orange-500">关卡完成</p>
        <h2 className="mt-1 text-xl font-black text-slate-800">{level.name}</h2>

        <div className="mt-3 flex justify-center gap-1 text-4xl" aria-label={`${score} 星`}>
          {[1, 2, 3].map((star) => (
            <motion.span
              key={star}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + star * 0.1 }}
              className={star <= score ? '' : 'grayscale opacity-25'}
            >
              ⭐
            </motion.span>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-600">{message}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-green-50 p-3">
            <span className="block text-2xl">🎯</span>
            <strong className="mt-1 block text-lg text-green-700">{performance}%</strong>
            <small className="text-green-600">本次表现</small>
          </div>
          <div className="rounded-2xl bg-orange-50 p-3">
            <span className="block text-2xl">{rewardCount > 0 ? '🎁' : '🌱'}</span>
            <strong className="mt-1 block text-lg text-orange-600">
              {rewardCount > 0 ? `+${rewardCount}` : '已领取'}
            </strong>
            <small className="text-orange-500">{level.rewardType}</small>
          </div>
        </div>

        <button
          onClick={onNext}
          className="mt-5 w-full rounded-2xl bg-orange-500 py-3.5 font-black text-white shadow-lg shadow-orange-200"
        >
          {nextLevel ? `下一关 · ${nextLevel.name}` : '完成学院旅程'}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={onRetry}
            className="rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600"
          >
            再玩一次
          </button>
          <button
            onClick={onMap}
            className="rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600"
          >
            返回地图
          </button>
        </div>
      </motion.section>
    </div>
  );
}
