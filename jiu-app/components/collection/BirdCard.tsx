'use client';

import { motion } from 'framer-motion';
import { Bird } from '@/lib/constants';
import { useGlobalStore } from '@/stores/globalStore';
import { BirdPortrait } from './BirdPortrait';

interface BirdCardProps {
  bird: Bird;
  onOpen: () => void;
}

const FRAGMENT_MARKS = {
  绒羽: '✦',
  怪羽: '◆',
  暗羽: '✧',
} as const;

export function BirdCard({ bird, onOpen }: BirdCardProps) {
  const { unlockedBirds, fragments, currentBirdId } = useGlobalStore();
  const isUnlocked = unlockedBirds.includes(bird.id);
  const isCurrent = currentBirdId === bird.id;
  const fragmentCount = bird.fragmentType ? fragments[bird.fragmentType] : 0;
  const progress = bird.fragmentNeeded > 0
    ? Math.min(fragmentCount / bird.fragmentNeeded, 1)
    : 1;
  const hasFragments = fragmentCount > 0;
  const canOpen = isUnlocked || hasFragments;
  const reveal = isUnlocked ? 1 : hasFragments ? Math.max(0.16, progress) : 0;

  return (
    <motion.article
      whileHover={canOpen ? { y: -3 } : undefined}
      whileTap={canOpen ? { scale: 0.98 } : undefined}
      className={`relative w-[154px] shrink-0 overflow-hidden rounded-[22px] border bg-white/90 shadow-[0_12px_30px_rgba(73,56,38,0.09)] ${
        isCurrent
          ? 'border-[#FF9F43] ring-2 ring-[#FF9F43]/20'
          : 'border-white/80'
      }`}
    >
      {isCurrent && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-[#2C3E50] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
          正在陪伴
        </div>
      )}

      {!isUnlocked && hasFragments && (
        <div className="absolute left-3 right-3 top-3 z-10">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#59483A]">
            <span>{FRAGMENT_MARKS[bird.fragmentType || '绒羽']} {bird.fragmentType}</span>
            <span>{fragmentCount}/{bird.fragmentNeeded}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-[#FF9F43] transition-[width] duration-700"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {!canOpen && (
        <div className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/75 text-sm text-[#756B61] shadow-sm">
          <span aria-hidden="true">●</span>
          <span className="sr-only">尚未发现</span>
        </div>
      )}

      <button
        type="button"
        onClick={canOpen ? onOpen : undefined}
        disabled={!canOpen}
        className="block w-full text-left disabled:cursor-default"
        aria-label={canOpen ? `查看${bird.name}详情` : '尚未发现的鸟'}
      >
        <BirdPortrait
          bird={bird}
          reveal={reveal}
          className={`aspect-[1/1.04] w-full ${
            isUnlocked
              ? 'bg-gradient-to-b from-[#FFF7DC] to-[#FFF0DE]'
              : hasFragments
                ? 'bg-gradient-to-b from-[#FFF8EA] to-[#F4ECE3]'
                : 'bg-[#EEEAE4]'
          }`}
        />

        <div className="min-h-[86px] px-3.5 pb-3.5 pt-2.5">
          <h3 className={`truncate text-[15px] font-extrabold ${
            canOpen ? 'text-[#2C3E50]' : 'text-[#8C857D]'
          }`}>
            {canOpen ? bird.name : '神秘鸟影'}
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-[#8E8175]">
            {isUnlocked
              ? bird.englishName
              : hasFragments
                ? `还差 ${Math.max(bird.fragmentNeeded - fragmentCount, 0)} 枚碎片`
                : '获得第一枚碎片后揭晓'}
          </p>

          <div className={`mt-2.5 flex min-h-7 items-center justify-center rounded-full text-[11px] font-bold ${
            isCurrent
              ? 'bg-[#2C3E50]/7 text-[#2C3E50]'
              : canOpen
                ? 'bg-[#FF9F43]/12 text-[#D87419]'
                : 'bg-[#8B8177]/8 text-[#918980]'
          }`}>
            {isCurrent ? '我的音乐伙伴' : canOpen ? '了解详情' : '等待发现'}
          </div>
        </div>
      </button>
    </motion.article>
  );
}
