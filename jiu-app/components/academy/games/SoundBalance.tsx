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
  const [selected, setSelected] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSoundIndex, setActiveSoundIndex] = useState<number | null>(null);
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
    setActiveSoundIndex(0);
    playTone(300, 0.45, question.volumes[0]);
    playbackTimerRef.current = window.setTimeout(() => {
      setActiveSoundIndex(1);
      playTone(300, 0.45, question.volumes[1]);
      playbackTimerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        setActiveSoundIndex(null);
        playbackTimerRef.current = null;
      }, 470);
    }, 650);
  }, [answered, questions, round]);

  const playSoundCard = useCallback(
    (soundIndex: 0 | 1) => {
      if (answered) return;
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }

      setIsPlaying(true);
      setActiveSoundIndex(soundIndex);
      playTone(300, 0.45, questions[round].volumes[soundIndex]);
      playbackTimerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        setActiveSoundIndex(null);
        playbackTimerRef.current = null;
      }, 470);
    },
    [answered, questions, round],
  );

  useEffect(() => {
    const timeout = window.setTimeout(playQuestion, 420);
    return () => {
      window.clearTimeout(timeout);
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }
    };
  }, [playQuestion]);

  const answer = (targetIsStronger: boolean) => {
    if (answered || isPlaying) return;
    setAnswered(true);
    setSelected(targetIsStronger);
    const isCorrect = targetIsStronger === (questions[round].louder === 1);
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
      <GameIntro detail="连续听起始音和目标音，判断目标音的强弱变化">
        ⚖️ 声音天平准备称量
      </GameIntro>
      <SimpleModeNotice show={simpleMode} />

      <div className="w-full max-w-sm rounded-[1.5rem] border border-yellow-100 bg-gradient-to-b from-yellow-50 via-white to-orange-50 p-3 shadow-inner sm:rounded-[1.75rem] sm:p-4">
        <div className="mb-2 flex items-center justify-between sm:mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-600">
              听音称量台
            </p>
            <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">
              听完两声，再判断强弱
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

        <div
          className="mb-2 grid grid-cols-2 gap-2 sm:mb-3"
          aria-label="声音播放顺序"
        >
          {[
            { index: 0 as const, number: '①', label: '声音一' },
            { index: 1 as const, number: '②', label: '声音二' },
          ].map((sound) => (
            <button
              key={sound.index}
              type="button"
              onClick={() => playSoundCard(sound.index)}
              disabled={answered}
              aria-label={`播放${sound.label}`}
              className={`rounded-xl border px-2.5 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                activeSoundIndex === sound.index
                  ? 'border-orange-300 bg-orange-100 shadow-sm'
                  : 'border-white/90 bg-white/70 hover:border-orange-200 hover:bg-orange-50'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <p className="text-[10px] font-black text-slate-400">
                {sound.number} {sound.label}
              </p>
              <p className="mt-0.5 text-xs font-black text-slate-700">
                {sound.index === 0 ? '起始音' : '目标音'}
              </p>
            </button>
          ))}
        </div>

        <div
          className="relative h-28 overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-b from-amber-100/80 to-orange-50 sm:h-44"
          aria-label="声音天平"
        >
          <motion.div
            className="absolute left-1/2 top-[30%] z-10 h-1 w-[74%] -translate-x-1/2 rounded-full bg-orange-300 sm:top-[32%]"
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

          <motion.div
            key={`left-sound-${answered ? questions[round].louder : 'hidden'}`}
            className={`absolute bottom-2 left-[13%] grid h-11 w-16 place-items-center rounded-full border-2 border-white bg-white/90 text-sm font-black text-orange-500 shadow-sm sm:bottom-3 sm:h-14 sm:w-20 sm:text-base ${
              activeSoundIndex === 0 ? 'ring-4 ring-orange-200/80' : ''
            }`}
            animate={activeSoundIndex === 0 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ repeat: activeSoundIndex === 0 ? Infinity : 0, duration: 0.75 }}
            aria-label={answered ? (questions[round].louder === 0 ? '起始音更强' : '起始音更弱') : '起始音播放中'}
          >
            {answered ? (questions[round].louder === 0 ? '🐘' : '🐱') : '♪'}
          </motion.div>
          <motion.div
            key={`right-sound-${answered ? questions[round].louder : 'hidden'}`}
            className={`absolute bottom-2 right-[13%] grid h-11 w-16 place-items-center rounded-full border-2 border-white bg-white/90 text-sm font-black text-orange-500 shadow-sm sm:bottom-3 sm:h-14 sm:w-20 sm:text-base ${
              activeSoundIndex === 1 ? 'ring-4 ring-orange-200/80' : ''
            }`}
            animate={activeSoundIndex === 1 ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ repeat: activeSoundIndex === 1 ? Infinity : 0, duration: 0.75 }}
            aria-label={answered ? (questions[round].louder === 1 ? '目标音更强' : '目标音更弱') : '目标音播放中'}
          >
            {answered ? (questions[round].louder === 1 ? '🐘' : '🐱') : '♪'}
          </motion.div>
          <div className="absolute bottom-0 left-1/2 h-[70%] w-1 -translate-x-1/2 rounded-full bg-orange-300 sm:h-[68%]" />
        </div>

        <button
          onClick={playQuestion}
          disabled={isPlaying || answered}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white py-2.5 text-xs font-black text-orange-600 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-3 sm:py-3 sm:text-sm"
        >
          <span className="text-base" aria-hidden="true">
            {isPlaying ? '🔊' : '▶️'}
          </span>
          {isPlaying ? '正在播放两个声音…' : '再听一次'}
        </button>
      </div>

      <RoundProgress current={round} total={questions.length} label="称量进度" />

      <div className="w-full max-w-sm text-center">
        <p className="hidden text-[11px] font-bold text-slate-500 sm:block sm:text-xs">
          目标音比起始音更强还是更弱？
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {[
          { value: true, icon: '🐘', label: '更强', detail: '目标音更有力量' },
          { value: false, icon: '🐱', label: '更弱', detail: '目标音更轻柔' },
        ].map((option) => {
          const targetIsStronger = questions[round].louder === 1;
          const isCorrectOption = option.value === targetIsStronger;
          const isSelected = selected === option.value;
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
              whileTap={{ scale: 0.95 }}
              disabled={answered || isPlaying}
              onClick={() => answer(option.value)}
              className={`relative rounded-2xl border-2 px-3 py-2 text-sm font-black shadow-sm transition disabled:cursor-not-allowed sm:py-4 sm:text-base ${stateClass}`}
            >
              {answered && isCorrectOption && (
                <span className="absolute right-2 top-2 text-green-600">✓</span>
              )}
              <span className="mb-0.5 block text-2xl sm:text-3xl">{option.icon}</span>
              <span className="block">{option.label}</span>
              <span className="mt-0.5 block text-[9px] font-bold opacity-70 sm:text-[11px]">
                {option.detail}
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnswerFeedback type={feedback}>
        {feedback === 'correct'
          ? '听得很准，目标音的强弱判断正确！'
          : '再比较一次起始音和目标音的响度。'}
      </AnswerFeedback>

      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        已称对 {correct} 轮
      </div>
    </div>
  );
}
