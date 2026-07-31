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
  const canExchange = Boolean(
    !isUnlocked &&
    bird.fragmentType &&
    fragmentCount >= bird.fragmentNeeded,
  );

  return (
    <motion.article
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
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

      {!isUnlocked && bird.fragmentType && (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold text-[#765A43] shadow-sm">
          {FRAGMENT_MARKS[bird.fragmentType]} {bird.fragmentNeeded} 枚
        </div>
      )}

      {!isUnlocked && (
        <div className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/75 text-sm text-[#756B61] shadow-sm">
          <span aria-hidden="true">●</span>
          <span className="sr-only">尚未兑换</span>
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={isUnlocked ? `查看${bird.name}详情` : `查看${bird.name}兑换条件`}
      >
        <BirdPortrait
          bird={bird}
          reveal={isUnlocked ? 1 : 0}
          className={`aspect-[1/1.04] w-full ${
            isUnlocked
              ? 'bg-gradient-to-b from-[#FFF7DC] to-[#FFF0DE]'
              : 'bg-[#EEEAE4]'
          }`}
        />

        <div className="min-h-[86px] px-3.5 pb-3.5 pt-2.5">
          <h3 className={`truncate text-[15px] font-extrabold ${
            isUnlocked ? 'text-[#2C3E50]' : 'text-[#8C857D]'
          }`}>
            {isUnlocked ? bird.name : '神秘鸟影'}
          </h3>
          <p className="mt-0.5 truncate text-[10px] text-[#8E8175]">
            {isUnlocked
              ? bird.englishName
              : `${bird.fragmentNeeded} 枚${bird.fragmentType}兑换`}
          </p>

          <div className={`mt-2.5 flex min-h-7 items-center justify-center rounded-full text-[11px] font-bold ${
            isCurrent
              ? 'bg-[#2C3E50]/7 text-[#2C3E50]'
              : isUnlocked || canExchange
                ? 'bg-[#FF9F43]/12 text-[#D87419]'
                : 'bg-[#8B8177]/8 text-[#918980]'
          }`}>
            {isCurrent
              ? '我的音乐伙伴'
              : isUnlocked
                ? '了解详情'
                : canExchange
                  ? '可以兑换'
                  : '碎片不足'}
          </div>
        </div>
      </button>
    </motion.article>
  );
}
