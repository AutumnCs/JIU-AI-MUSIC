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
import { playTone, scoreFromCorrect } from './audio';

interface SoundQuestion {
  volumes: [number, number];
  louder: 0 | 1;
}

export function SoundBalance({ onComplete, onMistake, simpleMode }: AcademyGameProps) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimerRef = useRef<number | null>(null);
  const [questions] = useState<SoundQuestion[]>(() =>
    Array.from({ length: 3 }, () => {
      const louder = Math.random() > 0.5 ? 0 : 1;
      const quiet = simpleMode ? 0.08 : 0.13;
      const loud = simpleMode ? 0.38 : 0.3;
      return {
        volumes: louder === 0 ? [loud, quiet] : [quiet, loud],
        louder,
      };
    }),
  );

  const playQuestion = useCallback(() => {
    if (answered) return;
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
    }
    const question = questions[round];
    setIsPlaying(true);
    playTone(300, 0.45, question.volumes[0]);
    playbackTimerRef.current = window.setTimeout(() => {
      playTone(300, 0.45, question.volumes[1]);
      playbackTimerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        playbackTimerRef.current = null;
      }, 470);
    }, 650);
  }, [answered, questions, round]);

  useEffect(() => {
    const timeout = window.setTimeout(playQuestion, 420);
    return () => {
      window.clearTimeout(timeout);
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }
    };
  }, [playQuestion]);

  const answer = (index: 0 | 1) => {
    if (answered || isPlaying) return;
    setAnswered(true);
    setSelected(index);
    const isCorrect = index === questions[round].louder;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    if (!isCorrect) onMistake();

    window.setTimeout(() => {
      if (round >= questions.length - 1) {
        onComplete(scoreFromCorrect(nextCorrect, questions.length));
        return;
      }
      setRound((value) => value + 1);
      setAnswered(false);
      setSelected(null);
      setFeedback(null);
    }, 900);
  };

  const balanceTilt = answered
    ? questions[round].louder === 0
      ? -7
      : 7
    : 0;

  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-4">
      <GameIntro detail="连续听两个声音，选择更响、更有力量的一边">
        ⚖️ 声音天平准备称量
      </GameIntro>
      <SimpleModeNotice show={simpleMode} />
      <RoundProgress current={round} total={questions.length} label="称量进度" />

      <div className="w-full max-w-sm rounded-[1.5rem] border border-yellow-100 bg-gradient-to-b from-yellow-50 via-white to-orange-50 p-3 shadow-inner sm:rounded-[1.75rem] sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-600">
              听音称量台
            </p>
            <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">
              天平会告诉你哪边更有力
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
            {isPlaying ? '正在播放' : answered ? '称量完成' : '等待选择'}
          </span>
        </div>

        <button
          onClick={playQuestion}
          disabled={isPlaying || answered}
          className="mt-2 flex w-full items-center justify-between rounded-xl border border-yellow-100 bg-white px-3 py-2 text-left shadow-sm transition hover:border-yellow-300 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-3"
        >
          <span>
            <span className="block text-[10px] font-black text-slate-400">听音顺序</span>
            <span className="mt-0.5 block text-xs font-black text-yellow-700">
              第一声 → 第二声
            </span>
          </span>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
            {isPlaying ? '🔊 播放中' : '▶️ 再听一次'}
          </span>
        </button>

        <div
          className="relative mt-3 h-32 overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-b from-amber-100/80 to-orange-50 sm:mt-4 sm:h-40"
          aria-label="声音天平"
        >
          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-bold text-slate-400">
            先听，再判断哪边更响
          </div>
          <motion.div
            className="absolute left-1/2 top-[42%] z-10 h-1 w-[74%] -translate-x-1/2 rounded-full bg-orange-300"
            animate={{ rotate: balanceTilt }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <motion.span
              className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-orange-400 text-xl shadow-md"
              animate={isPlaying ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ repeat: isPlaying ? Infinity : 0, duration: 0.75 }}
            >
              ⚖️
            </motion.span>
          </motion.div>

          <div className="absolute bottom-2 left-[13%] text-center sm:bottom-3">
            <div className="mx-auto grid h-11 w-16 place-items-center rounded-xl border-2 border-white bg-white/90 text-2xl shadow-sm sm:h-14 sm:w-20 sm:text-3xl">
              🐘
            </div>
            <p className="mt-1 text-[10px] font-black text-slate-500">第一声</p>
          </div>
          <div className="absolute bottom-2 right-[13%] text-center sm:bottom-3">
            <div className="mx-auto grid h-11 w-16 place-items-center rounded-xl border-2 border-white bg-white/90 text-2xl shadow-sm sm:h-14 sm:w-20 sm:text-3xl">
              🐱
            </div>
            <p className="mt-1 text-[10px] font-black text-slate-500">第二声</p>
          </div>
          <div className="absolute bottom-0 left-1/2 h-1/2 w-1 -translate-x-1/2 rounded-full bg-orange-300" />
        </div>
      </div>

      <p className="text-[11px] font-bold text-slate-500 sm:text-xs">
        哪一边的声音更响？
      </p>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2.5 sm:gap-3">
        {[
          { index: 0 as const, label: '第一声更响', icon: '🐘' },
          { index: 1 as const, label: '第二声更响', icon: '🐱' },
        ].map((option) => {
          const isCorrectOption = option.index === questions[round].louder;
          const isSelected = selected === option.index;
          const stateClass = answered
            ? isCorrectOption
              ? 'border-green-400 bg-green-50 text-green-700'
              : isSelected
                ? 'border-red-300 bg-red-50 text-red-600'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            : 'border-yellow-200 bg-white text-slate-700 hover:border-yellow-400';

          return (
            <motion.button
              key={option.label}
              whileTap={{ scale: 0.96 }}
              disabled={answered || isPlaying}
              onClick={() => answer(option.index)}
              className={`relative rounded-2xl border-2 px-2.5 py-2.5 text-sm font-black shadow-sm transition disabled:cursor-not-allowed sm:py-3.5 ${stateClass}`}
            >
              {answered && isCorrectOption && (
                <span className="absolute right-2 top-2 text-green-600">✓</span>
              )}
              <span className="mb-0.5 block text-2xl sm:text-3xl">{option.icon}</span>
              {option.label}
            </motion.button>
          );
        })}
      </div>

      <AnswerFeedback type={feedback}>
        {feedback === 'correct'
          ? '听得很准，这一边的声音更有力量！'
          : '再比较一次两个声音的响度。'}
      </AnswerFeedback>

      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        已称对 {correct} 轮
      </div>
    </div>
  );
}
