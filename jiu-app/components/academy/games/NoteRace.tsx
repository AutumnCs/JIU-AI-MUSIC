'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AcademyGameProps } from './types';
import {
  AnswerFeedback,
  GameIntro,
  RoundProgress,
  SimpleModeNotice,
} from './GameUI';
import { playRhythm, scoreFromCorrect } from './audio';

type Pace = 'walk' | 'run';

function createPaces(simpleMode: boolean): Pace[] {
  const paces: Pace[] = simpleMode
    ? ['walk', 'run', 'walk']
    : ['walk', 'run', 'walk', 'run'];

  for (let index = paces.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [paces[index], paces[target]] = [paces[target], paces[index]];
  }
  return paces;
}

export function NoteRace({ onComplete, onMistake, simpleMode }: AcademyGameProps) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<Pace | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimerRef = useRef<number | null>(null);
  const [paces] = useState<Pace[]>(() => createPaces(simpleMode));
  const pace = paces[round];

  const playCurrent = useCallback(async () => {
    if (answered) return;
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
    }
    setIsPlaying(true);
    const duration = await playRhythm(
      pace === 'walk'
        ? [1, 1, 1, 1]
        : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    );
    playbackTimerRef.current = window.setTimeout(() => {
      setIsPlaying(false);
      playbackTimerRef.current = null;
    }, duration + 100);
  }, [answered, pace]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void playCurrent(), 420);
    return () => {
      window.clearTimeout(timeout);
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }
    };
  }, [playCurrent]);

  const answer = (choice: Pace) => {
    if (answered || isPlaying) return;
    setAnswered(true);
    setSelected(choice);
    const isCorrect = choice === pace;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    if (!isCorrect) onMistake();

    window.setTimeout(() => {
      if (round >= paces.length - 1) {
        onComplete(scoreFromCorrect(nextCorrect, paces.length));
      } else {
        setRound((value) => value + 1);
        setAnswered(false);
        setSelected(null);
        setFeedback(null);
      }
    }, 850);
  };

  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-4">
      <GameIntro detail="听节奏的疏密，判断音符是在稳稳走还是快快跑">
        🏁 音符赛跑准备出发
      </GameIntro>
      <SimpleModeNotice show={simpleMode} />
      <RoundProgress current={round} total={paces.length} label="赛跑进度" />

      <div className="w-full max-w-sm rounded-[1.5rem] border border-green-100 bg-gradient-to-b from-sky-50 via-white to-green-50 p-3 shadow-inner sm:rounded-[1.75rem] sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-green-600">
              乡间音符跑道
            </p>
            <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">
              只听节奏，不看选手动作
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              isPlaying
                ? 'bg-orange-100 text-orange-600'
                : answered
                  ? 'bg-green-100 text-green-600'
                  : 'bg-slate-100 text-slate-500'
            }`}
            aria-live="polite"
          >
            {isPlaying ? '节奏播放中' : answered ? '本轮完成' : '等待选择'}
          </span>
        </div>

        <div className="relative mt-3 h-36 overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-b from-sky-100 to-green-100 sm:h-44">
          <div className="absolute left-0 right-0 top-3 flex justify-between px-3 text-[10px] font-black text-slate-400">
            <span>起点</span>
            <span>终点</span>
          </div>
          <div className="absolute bottom-7 left-3 right-3 h-12 rounded-full border-4 border-white/80 bg-orange-100/90 shadow-inner">
            <div className="absolute left-4 right-4 top-1/2 border-t-2 border-dashed border-orange-300" />
            <span className="absolute -right-1 -top-5 text-3xl" aria-hidden="true">
              🏁
            </span>
          </div>

          <motion.div
            key={`${round}-${isPlaying}`}
            initial={{ left: '8%' }}
            animate={{ left: isPlaying ? '80%' : '8%' }}
            transition={{
              duration: isPlaying ? (pace === 'walk' ? 1.8 : 1.2) : 0.2,
              ease: 'linear',
            }}
            className="absolute bottom-[2.15rem] z-10 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-2xl border-4 border-white bg-gradient-to-br from-lime-100 to-emerald-200 text-2xl shadow-lg shadow-emerald-200"
          >
            🎵
          </motion.div>

          <div className="absolute left-1/2 top-8 flex -translate-x-1/2 items-end gap-1" aria-hidden="true">
            {[12, 22, 16, 28, 18, 24].map((height, index) => (
              <motion.span
                key={`${height}-${index}`}
                className="w-1 rounded-full bg-emerald-400"
                animate={isPlaying ? { height: [8, height, 8] } : { height: 8 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.05,
                  repeat: isPlaying ? Infinity : 0,
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => void playCurrent()}
          disabled={isPlaying || answered}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-green-100 bg-white py-2.5 text-xs font-black text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-3 sm:text-sm"
        >
          {isPlaying ? '🔊 仔细听节奏…' : '▶️ 再听一次节奏'}
        </button>
      </div>

      <p className="text-[11px] font-bold text-slate-500 sm:text-xs">
        这段节奏更像哪种速度？
      </p>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2.5 sm:gap-3">
        {[
          {
            value: 'walk' as const,
            icon: '🚶',
            label: '稳稳走',
            detail: '节拍较慢、间隔较宽',
            idleClass: 'border-blue-100 bg-white text-blue-600 hover:border-blue-300',
          },
          {
            value: 'run' as const,
            icon: '🏃',
            label: '快快跑',
            detail: '节拍较快、间隔较密',
            idleClass: 'border-orange-100 bg-white text-orange-600 hover:border-orange-300',
          },
        ].map((option) => {
          const isCorrectOption = option.value === pace;
          const isSelected = selected === option.value;
          const stateClass = answered
            ? isCorrectOption
              ? 'border-green-400 bg-green-50 text-green-700'
              : isSelected
                ? 'border-red-300 bg-red-50 text-red-600'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            : option.idleClass;

          return (
            <motion.button
              key={option.value}
              whileTap={{ scale: 0.96 }}
              disabled={answered || isPlaying}
              onClick={() => answer(option.value)}
              className={`relative rounded-2xl border-2 px-2 py-2.5 text-sm font-black transition disabled:cursor-not-allowed sm:py-3.5 ${stateClass}`}
            >
              {answered && isCorrectOption && (
                <span className="absolute right-2 top-2 text-green-600">✓</span>
              )}
              <span className="mb-0.5 block text-2xl sm:text-3xl">{option.icon}</span>
              <span className="block">{option.label}</span>
              <span className="mt-0.5 block text-[9px] font-bold opacity-70 sm:text-[10px]">
                {option.detail}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnswerFeedback type={feedback}>
        {feedback === 'correct'
          ? '节拍速度判断正确！'
          : '走路拍更稳，跑步拍更密。'}
      </AnswerFeedback>

      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        已判断正确 {correct} 轮
      </div>
    </div>
  );
}
