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

export function SoundElevator({
  onComplete,
  onMistake,
  simpleMode,
}: AcademyGameProps) {
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [activeSoundIndex, setActiveSoundIndex] = useState<number | null>(null);
  const [playbackMode, setPlaybackMode] = useState<
    'sequence' | 'single' | null
  >(null);
  const playbackTimerRef = useRef<number | null>(null);
  const [questions] = useState(() =>
    Array.from({ length: 3 }, () => {
      const low = 210 + Math.random() * 70;
      const gap = simpleMode ? 260 : 140 + Math.random() * 100;
      const secondHigher = Math.random() > 0.5;
      return {
        first: secondHigher ? low : low + gap,
        second: secondHigher ? low + gap : low,
        secondHigher,
      };
    }),
  );

  const playQuestion = useCallback(() => {
    if (round >= questions.length) return;
    if (playbackTimerRef.current) {
      window.clearTimeout(playbackTimerRef.current);
    }
    setCanAnswer(false);
    const question = questions[round];
    setIsPlaying(true);
    setPlaybackMode('sequence');
    setActiveSoundIndex(0);
    playTone(question.first, 0.4);
    playbackTimerRef.current = window.setTimeout(() => {
      setActiveSoundIndex(1);
      playTone(question.second, 0.4);
      playbackTimerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        setActiveSoundIndex(null);
        setPlaybackMode(null);
        setCanAnswer(true);
        playbackTimerRef.current = null;
      }, 420);
    }, 620);
  }, [questions, round]);

  const playSoundCard = useCallback(
    (soundIndex: number) => {
      if (answered) return;
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }

      const question = questions[round];
      const frequency = soundIndex === 0 ? question.first : question.second;
      setCanAnswer(false);
      setIsPlaying(true);
      setPlaybackMode('single');
      setActiveSoundIndex(soundIndex);
      playTone(frequency, 0.4);
      playbackTimerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        setActiveSoundIndex(null);
        setPlaybackMode(null);
        setCanAnswer(true);
        playbackTimerRef.current = null;
      }, 420);
    },
    [answered, questions, round],
  );

  useEffect(() => {
    playQuestion();
    return () => {
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }
    };
  }, [playQuestion]);

  const handleAnswer = (higher: boolean) => {
    if (answered || !canAnswer) return;
    setAnswered(true);
    setSelectedAnswer(higher);
    const isCorrect = higher === questions[round].secondHigher;
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    setCorrect(nextCorrect);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) onMistake();

    window.setTimeout(() => {
      if (round >= questions.length - 1) {
        onComplete(scoreFromCorrect(nextCorrect, questions.length));
        return;
      }
      setRound((value) => value + 1);
      setAnswered(false);
      setCanAnswer(false);
      setFeedback(null);
      setSelectedAnswer(null);
    }, 900);
  };

  return (
    <div className="flex flex-col items-center gap-2.5 sm:gap-4">
      <GameIntro detail="连续听两个音，判断第二个音是上楼了，还是下楼了">
        🎧 声音电梯准备出发
      </GameIntro>
      <SimpleModeNotice show={simpleMode} />

      <div className="w-full max-w-sm rounded-[1.5rem] border border-sky-100 bg-gradient-to-b from-sky-50 via-white to-orange-50 p-3 shadow-inner sm:rounded-[1.75rem] sm:p-4">
        <div className="mb-2 flex items-center justify-between sm:mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-500">
              听音站
            </p>
            <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">听完两声，再判断方向</p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              isPlaying
                ? 'bg-orange-100 text-orange-600'
                : 'bg-slate-100 text-slate-500'
            }`}
            aria-live="polite"
          >
            {isPlaying ? '正在播放' : canAnswer ? '准备选择' : '正在准备'}
          </span>
        </div>

        <div
          className="mb-2 grid grid-cols-2 gap-2 sm:mb-3"
          aria-label="声音播放顺序"
        >
          <button
            type="button"
            onClick={() => playSoundCard(0)}
            disabled={answered}
            aria-label="播放第一声"
            className={`rounded-xl border px-2.5 py-1.5 text-left transition sm:px-3 sm:py-2 ${
              activeSoundIndex === 0
                ? 'border-orange-300 bg-orange-100 shadow-sm'
                : 'border-white/90 bg-white/70 hover:border-orange-200 hover:bg-orange-50'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <p className="text-[10px] font-black text-slate-400">① 第一声</p>
            <p className="mt-0.5 text-xs font-black text-slate-700">起始音</p>
          </button>
          <button
            type="button"
            onClick={() => playSoundCard(1)}
            disabled={answered}
            aria-label="播放第二声"
            className={`rounded-xl border px-2.5 py-1.5 text-left transition sm:px-3 sm:py-2 ${
              activeSoundIndex === 1
                ? 'border-orange-300 bg-orange-100 shadow-sm'
                : 'border-white/90 bg-white/70 hover:border-orange-200 hover:bg-orange-50'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <p className="text-[10px] font-black text-slate-400">② 第二声</p>
            <p className="mt-0.5 text-xs font-black text-slate-700">目标音</p>
          </button>
        </div>

        <div className="relative h-28 overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-b from-sky-100 to-slate-100 sm:h-44">
          <div className="absolute left-1/2 top-1 -translate-x-1/2 text-center sm:top-3">
            <p className="text-xs font-black text-sky-700">高音层</p>
            <p className="text-[10px] font-bold text-sky-500">声音更高</p>
          </div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-center sm:bottom-3">
            <p className="text-xs font-black text-slate-600">低音层</p>
            <p className="text-[10px] font-bold text-slate-400">声音更低</p>
          </div>
          <div className="absolute inset-y-1 left-1/2 w-14 -translate-x-1/2 rounded-xl border-2 border-white/90 bg-white/45 shadow-inner sm:inset-y-3 sm:w-16" />
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/75" />
          <div className="absolute left-1/2 top-8 -translate-x-1/2 text-[10px] font-black text-sky-400 sm:top-12 sm:text-xs">
            ↑
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 sm:bottom-12 sm:text-xs">
            ↓
          </div>

          <motion.div
            className="absolute left-1/2 top-1/2 z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-4 border-orange-200 bg-white text-xl shadow-lg sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl"
            animate={isPlaying ? { y: [-12, 12, -12] } : { y: 0 }}
            transition={
              isPlaying
                ? { duration: 1.2, ease: 'easeInOut', repeat: Infinity }
                : { duration: 0.25 }
            }
          >
            🚋
          </motion.div>
        </div>

        <button
          onClick={playQuestion}
          disabled={isPlaying || answered}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white py-2.5 text-xs font-black text-orange-600 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-3 sm:py-3 sm:text-sm"
        >
          <span className="text-base" aria-hidden="true">
            {isPlaying ? '🔊' : '▶️'}
          </span>
          {isPlaying
            ? playbackMode === 'single'
              ? activeSoundIndex === 0
                ? '正在播放起始音…'
                : '正在播放目标音…'
              : '正在播放两个声音…'
            : '再听一次'}
        </button>
      </div>

      <RoundProgress current={round} total={questions.length} label="电梯行程" />

      <div className="w-full max-w-sm text-center">
        <p className="hidden text-[11px] font-bold text-slate-500 sm:block sm:text-xs">
          第二个声音比第一个声音——
        </p>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {[
          { value: true, icon: '⬆️', label: '上楼', detail: '声音更高' },
          { value: false, icon: '⬇️', label: '下楼', detail: '声音更低' },
        ].map((option) => {
          const isCorrectOption = option.value === questions[round].secondHigher;
          const isSelected = selectedAnswer === option.value;
          const stateClass = answered
            ? isCorrectOption
              ? 'border-green-400 bg-green-50 text-green-700'
              : isSelected
                ? 'border-red-300 bg-red-50 text-red-600'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            : !canAnswer
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300';

          return (
            <motion.button
              key={option.label}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAnswer(option.value)}
              disabled={answered || !canAnswer}
              className={`relative rounded-2xl border-2 px-3 py-2 text-sm font-black transition sm:py-4 sm:text-base ${stateClass}`}
            >
              {answered && isCorrectOption && (
                <span className="absolute right-2 top-2 text-green-600">✓</span>
              )}
              <span className="mb-0.5 block text-xl sm:mb-1 sm:text-3xl">{option.icon}</span>
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
          ? '听对啦，声音的方向判断得很准！'
          : '留意第二个音是升高还是降低。'}
      </AnswerFeedback>
      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        已答对 {correct} 题
      </div>
    </div>
  );
}
