'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AcademyGameProps } from './types';
import { GameIntro, SimpleModeNotice } from './GameUI';
import { playTone } from './audio';

type TapResult = 'hit' | 'miss' | null;

export function HeartbeatDrummer({
  onComplete,
  onMistake,
  simpleMode,
}: AcademyGameProps) {
  const [started, setStarted] = useState(false);
  const [beat, setBeat] = useState(0);
  const [hits, setHits] = useState(0);
  const [taps, setTaps] = useState(0);
  const [flash, setFlash] = useState(false);
  const [tapResult, setTapResult] = useState<TapResult>(null);
  const lastBeatAt = useRef(0);
  const lastTappedBeat = useRef(0);
  const hitsRef = useRef(0);
  const bpm = simpleMode ? 68 : 80;
  const interval = (60 / bpm) * 1000;

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setStarted(true), 900);
    return () => window.clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    if (!started) return;
    let beatCount = 0;

    const tick = () => {
      lastBeatAt.current = performance.now();
      beatCount += 1;
      lastTappedBeat.current = 0;
      setBeat(beatCount);
      playTone(180, 0.08, 0.24);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 150);

      if (beatCount >= 8) {
        window.clearInterval(timer);
        window.setTimeout(() => {
          const result = hitsRef.current;
          onComplete(result >= 6 ? 3 : result >= 3 ? 2 : 1);
        }, 720);
      }
    };

    const timer = window.setInterval(tick, interval);
    tick();
    return () => window.clearInterval(timer);
  }, [interval, onComplete, started]);

  const handleTap = () => {
    if (!started || beat === 0 || lastTappedBeat.current === beat) return;
    lastTappedBeat.current = beat;

    const difference = Math.abs(performance.now() - lastBeatAt.current);
    const tolerance = simpleMode ? 380 : 260;
    const isHit = difference <= tolerance;
    setTaps((value) => value + 1);
    setTapResult(isHit ? 'hit' : 'miss');
    window.setTimeout(() => setTapResult(null), 320);

    if (isHit) {
      hitsRef.current += 1;
      setHits(hitsRef.current);
    } else {
      onMistake();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-4">
      <GameIntro detail="鼓点亮起时点击中央大鼓，连续完成八拍">
        🥁 心跳鼓手准备登场
      </GameIntro>
      <SimpleModeNotice show={simpleMode} />

      <div className="w-full max-w-sm rounded-[1.5rem] border border-orange-100 bg-gradient-to-b from-orange-50 via-white to-red-50 p-3 shadow-inner sm:rounded-[1.75rem] sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">
              心跳节拍场
            </p>
            <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">
              看见鼓面亮起，就跟着敲一下
            </p>
          </div>
          <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-600">
            ♩ {bpm} BPM
          </span>
        </div>

        <div className="mt-3 rounded-2xl border border-white/90 bg-white/75 p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] font-black text-slate-400">
            <span>{started ? `第 ${Math.max(beat, 1)} 拍` : '准备中'}</span>
            <span>{Math.min(beat, 8)} / 8</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: 8 }, (_, index) => {
              const number = index + 1;
              const isCurrent = number === beat;
              const isPassed = number < beat;
              return (
                <motion.span
                  key={number}
                  animate={isCurrent && flash ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                  className={`h-2.5 rounded-full transition ${
                    isCurrent
                      ? 'bg-orange-500 shadow-[0_0_9px_rgba(249,115,22,0.65)]'
                      : isPassed
                        ? 'bg-green-400'
                        : 'bg-slate-200'
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="relative mt-3 grid place-items-center rounded-[1.5rem] border border-white/90 bg-gradient-to-b from-red-50 to-orange-100/70 py-4 sm:mt-4 sm:py-6">
          <motion.div
            className="absolute h-40 w-40 rounded-full border-2 border-orange-200/70 sm:h-48 sm:w-48"
            animate={flash ? { scale: [0.88, 1.08], opacity: [0.8, 0] } : { scale: 0.88, opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
          <motion.button
            animate={
              flash
                ? { scale: [1, 1.12, 1] }
                : tapResult === 'hit'
                  ? { scale: [1, 0.94, 1] }
                  : tapResult === 'miss'
                    ? { x: [0, -5, 5, 0] }
                    : { scale: 1 }
            }
            onClick={handleTap}
            disabled={!started}
            className={`relative z-10 grid h-32 w-32 place-items-center rounded-full border-[7px] text-5xl shadow-xl transition sm:h-40 sm:w-40 sm:text-6xl ${
              tapResult === 'hit'
                ? 'border-green-200 bg-gradient-to-b from-green-300 to-green-500'
                : tapResult === 'miss'
                  ? 'border-red-200 bg-gradient-to-b from-red-300 to-red-500'
                  : flash
                    ? 'border-yellow-200 bg-gradient-to-b from-orange-300 to-orange-500 shadow-orange-300'
                    : 'border-orange-200 bg-gradient-to-b from-orange-200 to-orange-400'
            } disabled:opacity-70`}
            aria-label={started ? '敲鼓' : '鼓点准备中'}
          >
            <span>
              <span className="block">🥁</span>
              <span className="mt-1 block text-[10px] font-black text-white sm:text-xs">
                {!started
                  ? '准备…'
                  : tapResult === 'hit'
                    ? '好拍！'
                    : tapResult === 'miss'
                      ? '再跟紧'
                      : '点击跟拍'}
              </span>
            </span>
          </motion.button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-green-50 px-2 py-2">
            <span className="block text-[10px] font-black text-green-500">命中节拍</span>
            <strong className="mt-0.5 block text-lg text-green-700">{hits}</strong>
          </div>
          <div className="rounded-xl bg-slate-100 px-2 py-2">
            <span className="block text-[10px] font-black text-slate-400">已敲击</span>
            <strong className="mt-0.5 block text-lg text-slate-600">{taps}</strong>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] font-bold text-slate-500 sm:text-xs">
        跟着亮光慢慢来，不需要抢拍
      </p>
    </div>
  );
}
