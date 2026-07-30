'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bird } from '@/lib/constants';
import { useGlobalStore } from '@/stores/globalStore';
import { BirdPortrait } from './BirdPortrait';

interface BirdDetailProps {
  bird: Bird;
  onClose: () => void;
}

const FRAGMENT_DESTINATIONS = {
  绒羽: { href: '/academy', label: '去学院练习' },
  怪羽: { href: '/workshop', label: '去完成课程与创作' },
  暗羽: { href: '/community', label: '去挑战与探索' },
} as const;

export function BirdDetail({ bird, onClose }: BirdDetailProps) {
  const { unlockedBirds, fragments, currentBirdId, setCurrentBird } = useGlobalStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUnlocked = unlockedBirds.includes(bird.id);
  const isCurrent = currentBirdId === bird.id;
  const fragmentCount = bird.fragmentType ? fragments[bird.fragmentType] : 0;
  const progress = bird.fragmentNeeded > 0
    ? Math.min(fragmentCount / bird.fragmentNeeded, 1)
    : 1;
  const destination = bird.fragmentType
    ? FRAGMENT_DESTINATIONS[bird.fragmentType]
    : null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      audioRef.current?.pause();
    };
  }, [onClose]);

  const toggleBirdCall = () => {
    if (!bird.birdCall) return;

    if (!audioRef.current) {
      const audio = new Audio(bird.birdCall);
      audio.addEventListener('ended', () => setIsPlaying(false));
      audio.addEventListener('error', () => {
        setIsPlaying(false);
        setAudioError(true);
      });
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setAudioError(false);
    void audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(() => setAudioError(true));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-[#16202A]/55 px-0 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <motion.section
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[30px] bg-[#FFF9F2] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bird-detail-title"
      >
        <div className="sticky top-0 z-20 flex h-12 items-center justify-center bg-[#FFF9F2]/90 backdrop-blur">
          <div className="h-1.5 w-12 rounded-full bg-[#D8CFC5]" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-[#6F655D] shadow-sm"
            aria-label="关闭详情"
          >
            ×
          </button>
        </div>

        <div className="px-5 pb-8">
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FFF0C8] via-[#FFE9D7] to-[#E4F5E9]">
            <div className="absolute -left-5 top-5 h-20 w-20 rounded-full bg-white/30" />
            <div className="absolute -right-6 bottom-0 h-28 w-28 rounded-full bg-[#77C69A]/15" />
            <BirdPortrait
              bird={bird}
              reveal={isUnlocked ? 1 : Math.max(0.16, progress)}
              className="mx-auto aspect-square w-[74%] max-w-[280px]"
            />
          </div>

          <div className="mt-5 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                isUnlocked
                  ? 'bg-[#52A879]/12 text-[#3E8B62]'
                  : 'bg-[#FF9F43]/12 text-[#D87419]'
              }`}>
                {isUnlocked ? '已经成为伙伴' : '正在收集碎片'}
              </span>
              {isCurrent && (
                <span className="rounded-full bg-[#2C3E50] px-2.5 py-1 text-[10px] font-bold text-white">
                  正在陪伴
                </span>
              )}
            </div>
            <h2 id="bird-detail-title" className="text-[28px] font-black tracking-tight text-[#263746]">
              {bird.name}
            </h2>
            <p className="mt-1 text-xs font-medium tracking-wide text-[#8E8175]">
              {bird.englishName}
            </p>
          </div>

          <div className="mt-5 rounded-[22px] bg-white p-4 shadow-[0_10px_30px_rgba(78,58,40,0.07)]">
            <p className="text-[14px] font-medium leading-7 text-[#584B40]">
              “{bird.description}”
            </p>
          </div>

          <button
            type="button"
            onClick={toggleBirdCall}
            disabled={!bird.birdCall}
            className={`mt-4 flex min-h-14 w-full items-center gap-3 rounded-[18px] px-4 text-left transition active:scale-[0.99] ${
              bird.birdCall
                ? 'bg-[#2C3E50] text-white'
                : 'cursor-not-allowed bg-[#EAE4DD] text-[#8B8279]'
            }`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${
              bird.birdCall ? 'bg-white/14' : 'bg-white/50'
            }`}>
              {isPlaying ? '■' : '▶'}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-extrabold">
                {bird.birdCall ? (isPlaying ? '正在播放鸟叫声' : '听听它的声音') : '鸟叫声正在收录'}
              </span>
              <span className={`mt-0.5 block text-[11px] ${
                bird.birdCall ? 'text-white/65' : 'text-[#9A9188]'
              }`}>
                {audioError ? '暂时无法播放，请稍后再试' : bird.sound}
              </span>
            </span>
            {isPlaying && (
              <span className="flex items-end gap-0.5" aria-hidden="true">
                {[10, 18, 13, 21, 15].map((height, index) => (
                  <motion.i
                    key={index}
                    className="w-0.5 rounded-full bg-[#FFD18A]"
                    animate={{ height: [6, height, 6] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: index * 0.08 }}
                  />
                ))}
              </span>
            )}
          </button>

          <div className="mt-6">
            <h3 className="text-base font-black text-[#2C3E50]">认识一下这位朋友</h3>
            <div className="mt-3 grid gap-3">
              {[
                { mark: '01', title: '长什么样', text: bird.feature, color: 'bg-[#FFF0D6]' },
                { mark: '02', title: '住在哪里', text: bird.habitat, color: 'bg-[#E8F5EC]' },
                { mark: '03', title: '平时做什么', text: bird.habit, color: 'bg-[#EAEAFB]' },
              ].map((item) => (
                <div key={item.title} className={`${item.color} rounded-[18px] p-4`}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-[10px] font-black tracking-wider text-[#7A6C60]">
                      {item.mark}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#3C4B55]">{item.title}</h4>
                      <p className="mt-1 text-xs leading-5 text-[#6F655D]">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isUnlocked && bird.fragmentType && destination && (
            <div className="mt-6 rounded-[22px] border border-[#F0D9BF] bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-extrabold text-[#4D433B]">{bird.fragmentType}收集进度</span>
                <span className="font-black text-[#D87419]">{fragmentCount}/{bird.fragmentNeeded}</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#EFE7DE]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FFB057] to-[#FF8C42]"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#84786D]">
                再收集 {Math.max(bird.fragmentNeeded - fragmentCount, 0)} 枚，就能让它成为你的音乐伙伴。
              </p>
              <Link
                href={destination.href}
                onClick={onClose}
                className="mt-3 flex min-h-12 items-center justify-center rounded-[16px] bg-[#FF9F43] px-4 text-sm font-extrabold text-white"
              >
                {destination.label} →
              </Link>
            </div>
          )}

          {isUnlocked && (
            <button
              type="button"
              onClick={() => setCurrentBird(bird.id)}
              disabled={isCurrent}
              className={`mt-6 min-h-14 w-full rounded-[18px] text-base font-black transition active:scale-[0.99] ${
                isCurrent
                  ? 'bg-[#E8E3DC] text-[#82786F]'
                  : 'bg-[#FF9F43] text-white shadow-[0_10px_24px_rgba(255,159,67,0.28)]'
              }`}
            >
              {isCurrent ? '正在陪伴我' : '让它陪我'}
            </button>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
