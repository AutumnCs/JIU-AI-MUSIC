'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AcademyGameProps } from './types';
import { GameIntro, RoundProgress, SimpleModeNotice } from './GameUI';
import { playTone, scoreFromCorrect } from './audio';

const TARGETS = [700, 1100, 1500];

export function SoundRelay({ onComplete, onMistake, simpleMode }: AcademyGameProps) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [holding, setHolding] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const frameRef = useRef<number | null>(null);
  const target = TARGETS[round];
  const targetSeconds = (target / 1000).toFixed(1);
  const progress = Math.min((elapsed / target) * 100, 100);

  useEffect(() => {
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const playTarget = () => playTone(360, target / 1000, 0.22);

  const trackHold = () => {
    setElapsed(performance.now() - startedAt.current);
    frameRef.current = window.requestAnimationFrame(trackHold);
  };

  const startHolding = () => {
    if (holding || result) return;
    startedAt.current = performance.now();
    setElapsed(0);
    setHolding(true);
    playTone(430, 0.12, 0.16);
    frameRef.current = window.requestAnimationFrame(trackHold);
  };

  const finishHolding = () => {
    if (!holding) return;
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setHolding(false);

    const duration = performance.now() - startedAt.current;
    setElapsed(duration);
    const tolerance = simpleMode ? 420 : 260;
    const isCorrect = Math.abs(duration - target) <= tolerance;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    setResult(
      isCorrect
        ? `接得刚刚好！${(duration / 1000).toFixed(1)} 秒`
        : duration < target
          ? '再长一点点，就接住啦！'
          : '稍微短一点会更合适！',
    );
    if (!isCorrect) onMistake();

    window.setTimeout(() => {
      if (round >= TARGETS.length - 1) {
        onComplete(scoreFromCorrect(nextCorrect, TARGETS.length));
        return;
      }
      setRound((value) => value + 1);
      setElapsed(0);
      setResult(null);
    }, 1100);
  };

  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-4">
      <GameIntro detail="先听目标声音，再按住水滴发出一样长的声音">
        💧 声音接力准备出发
      </GameIntro>
      <SimpleModeNotice show={simpleMode} />
      <RoundProgress current={round} total={TARGETS.length} label="接力进度" />

      <div className="w-full max-w-sm rounded-[1.5rem] border border-blue-100 bg-gradient-to-b from-blue-50 via-white to-cyan-50 p-3 shadow-inner sm:rounded-[1.75rem] sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500">
              声音接力站
            </p>
            <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">
              让水滴跑到目标线
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              holding
                ? 'bg-blue-100 text-blue-600'
                : result
                  ? 'bg-green-100 text-green-600'
                  : 'bg-slate-100 text-slate-500'
            }`}
            aria-live="polite"
          >
            {holding ? '接力中' : result ? '本轮完成' : '先听目标音'}
          </span>
        </div>

        <button
          onClick={playTarget}
          className="mt-2 flex w-full items-center justify-between rounded-xl border border-blue-100 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50 sm:mt-3"
        >
          <span>
            <span className="block text-[10px] font-black text-slate-400">目标声音</span>
            <span className="mt-0.5 block text-xs font-black text-blue-600">
              播放 {targetSeconds} 秒
            </span>
          </span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-600">
            ▶️ 听一听
          </span>
        </button>

        <div className="mt-3 rounded-2xl border border-white/90 bg-white/70 p-3 sm:mt-4">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>起点</span>
            <span>目标线 · {targetSeconds}s</span>
          </div>
          <div
            className="relative h-8 rounded-full bg-blue-100"
            aria-label={`声音接力进度 ${Math.round(progress)}%`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-300 to-cyan-400 transition-[width]"
              style={{ width: `${progress}%` }}
            />
            <div className="absolute inset-y-0 right-[1px] border-r-2 border-dashed border-orange-400" />
            <motion.div
              className="absolute top-1/2 z-10 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border-4 border-white bg-blue-500 text-xl shadow-lg"
              animate={{ left: `${Math.max(progress, 5)}%` }}
              transition={{ duration: holding ? 0.08 : 0.2, ease: 'linear' }}
            >
              💧
            </motion.div>
          </div>
          <div className="mt-2 text-center text-xs font-bold text-slate-500">
            {holding ? `已接力 ${(elapsed / 1000).toFixed(1)} 秒` : '按住水滴开始接力'}
          </div>
        </div>

        <motion.button
          animate={holding ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ repeat: holding ? Infinity : 0, duration: 0.75 }}
          onPointerDown={startHolding}
          onPointerUp={finishHolding}
          onPointerCancel={finishHolding}
          onPointerLeave={holding ? finishHolding : undefined}
          style={{ touchAction: 'none' }}
          className={`mt-3 grid h-28 w-full place-items-center rounded-2xl border-4 text-3xl shadow-lg transition sm:h-36 ${
            holding
              ? 'border-blue-300 bg-blue-500 text-white shadow-blue-200'
              : 'border-blue-100 bg-blue-50 text-blue-500 hover:border-blue-200'
          }`}
        >
          <span>
            <span className="block">💧</span>
            <span className="mt-1 block text-xs font-black">
              {holding ? '松开水滴' : '按住开始'}
            </span>
          </span>
        </motion.button>

        {result && (
          <p
            role="status"
            className={`mt-2 text-center text-xs font-black ${
              result.startsWith('接得') ? 'text-green-600' : 'text-orange-600'
            }`}
          >
            {result}
          </p>
        )}
      </div>

      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        已接对 {correct} 轮
      </div>
    </div>
  );
}
