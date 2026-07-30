'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { AcademyGameProps } from './types';
import {
  AnswerFeedback,
  GameIntro,
  RoundProgress,
  SimpleModeNotice,
} from './GameUI';
import { playTone } from './audio';

type Feedback = 'correct' | 'wrong' | null;

const TOWN_NOTES = [
  { name: 'Do', shortName: 'C', freq: 261.63, color: '#ff8b5c' },
  { name: 'Re', shortName: 'D', freq: 293.66, color: '#ffcb57' },
  { name: 'Mi', shortName: 'E', freq: 329.63, color: '#60c98b' },
  { name: 'Fa', shortName: 'F', freq: 349.23, color: '#4ca7e8' },
  { name: 'Sol', shortName: 'G', freq: 392, color: '#7d74db' },
  { name: 'La', shortName: 'A', freq: 440, color: '#b46bd4' },
  { name: 'Si', shortName: 'B', freq: 493.88, color: '#e56b9f' },
] as const;

const ORDER = [0, 2, 4, 1, 3, 5, 6];
const HOMES = [
  {
    index: 0,
    label: '第 1 个音符家',
    detail: '下加一线',
    top: 74,
    left: 18,
  },
  {
    index: 1,
    label: '第 2 个音符家',
    detail: '线下间',
    top: 68,
    left: 30,
  },
  {
    index: 2,
    label: '第 3 个音符家',
    detail: '第一线',
    top: 62,
    left: 42,
  },
  {
    index: 3,
    label: '第 4 个音符家',
    detail: '第一间',
    top: 56,
    left: 54,
  },
  {
    index: 4,
    label: '第 5 个音符家',
    detail: '第二线',
    top: 50,
    left: 66,
  },
  {
    index: 5,
    label: '第 6 个音符家',
    detail: '第二间',
    top: 44,
    left: 78,
  },
  {
    index: 6,
    label: '第 7 个音符家',
    detail: '第三线',
    top: 38,
    left: 90,
  },
] as const;

function NoteCharacter({
  noteIndex,
  disabled,
}: {
  noteIndex: number;
  disabled: boolean;
}) {
  const note = TOWN_NOTES[noteIndex];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `note-${noteIndex}`,
    disabled,
  });

  return (
    <motion.button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      whileTap={disabled ? undefined : { scale: 0.96 }}
      style={{
        backgroundColor: note.color,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: 'none',
      }}
      className={`relative z-30 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-4 border-white text-white shadow-lg ${
        isDragging ? 'scale-110 opacity-85' : ''
      }`}
      aria-label={`拖动 ${note.name} 音符`}
    >
      <span>
        <span className="block text-2xl leading-none">♪</span>
        <strong className="mt-1 block text-sm">{note.name}</strong>
      </span>
    </motion.button>
  );
}

function StaffHome({
  home,
  targetIndex,
  selectedHome,
  feedback,
  simpleMode,
  disabled,
  onChoose,
}: {
  home: (typeof HOMES)[number];
  targetIndex: number;
  selectedHome: number | null;
  feedback: Feedback;
  simpleMode: boolean;
  disabled: boolean;
  onChoose: (homeIndex: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `home-${home.index}`,
    disabled,
  });
  const isSelected = selectedHome === home.index;
  const isCorrect = feedback === 'correct' && isSelected;
  const isWrong = feedback === 'wrong' && isSelected;
  const isHint = simpleMode && home.index === targetIndex && !feedback;
  const hasStaffLine = [0, 2, 4, 6].includes(home.index);

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      onClick={() => onChoose(home.index)}
      disabled={disabled}
      animate={
        isCorrect
          ? { scale: [1, 1.2, 1] }
          : isWrong
            ? { x: [0, -4, 4, 0] }
            : isHint
              ? { scale: [1, 1.08, 1] }
              : { scale: 1 }
      }
      transition={
        isHint
          ? { duration: 1.4, repeat: Infinity }
          : { duration: 0.35 }
      }
      className={`absolute z-20 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border-2 transition ${
        isCorrect
          ? 'border-green-500 bg-green-100 text-green-600'
          : isWrong
            ? 'border-red-400 bg-red-100 text-red-500'
            : isOver
              ? 'scale-110 border-orange-400 bg-orange-100 text-orange-500'
              : isHint
                ? 'border-violet-400 bg-violet-100 text-violet-600'
                : 'border-dashed border-slate-400 bg-white/90 text-slate-400'
      } disabled:cursor-not-allowed`}
      style={{ top: `${home.top}%`, left: `${home.left}%` }}
      aria-label={home.label}
    >
      <span
        className={`relative z-20 grid h-5 w-5 place-items-center rounded-full border-2 bg-white text-[10px] font-black ${
          isCorrect
            ? 'border-green-500 text-green-600'
            : isWrong
              ? 'border-red-400 text-red-500'
              : 'border-slate-400 text-slate-400'
        }`}
      >
        {isCorrect ? '♪' : ''}
      </span>
      {hasStaffLine && (
        <span className="pointer-events-none absolute left-[-7px] right-[-7px] top-1/2 z-10 border-t-2 border-slate-400" />
      )}
    </motion.button>
  );
}

export function NoteHome({
  onComplete,
  onMistake,
  simpleMode,
}: AcademyGameProps) {
  const rounds = simpleMode ? ORDER.slice(0, 3) : ORDER;
  const [round, setRound] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [selectedHome, setSelectedHome] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [answered, setAnswered] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const noteIndex = rounds[round];
  const note = TOWN_NOTES[noteIndex];

  useEffect(
    () => () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  const chooseHome = (homeIndex: number) => {
    if (answered) return;
    const isCorrect = noteIndex === homeIndex;
    setSelectedHome(homeIndex);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setAnswered(true);

    if (!isCorrect) {
      setMistakes((value) => value + 1);
      onMistake();
      transitionTimerRef.current = window.setTimeout(() => {
        setSelectedHome(null);
        setFeedback(null);
        setAnswered(false);
        transitionTimerRef.current = null;
      }, 720);
      return;
    }

    playTone(note.freq, 0.45, 0.2);
    transitionTimerRef.current = window.setTimeout(() => {
      if (round >= rounds.length - 1) {
        onComplete(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1);
      } else {
        setRound((value) => value + 1);
        setSelectedHome(null);
        setFeedback(null);
        setAnswered(false);
      }
      transitionTimerRef.current = null;
    }, 820);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || answered) return;
    const dragged = Number(String(active.id).replace('note-', ''));
    if (dragged !== noteIndex) return;
    chooseHome(Number(String(over.id).replace('home-', '')));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col items-center gap-2.5 sm:gap-4">
        <GameIntro detail={`把 ${note.name} 放到五线谱中的正确位置`}>
          🎼 星光树屋正在分房间
        </GameIntro>
        <SimpleModeNotice show={simpleMode} />
        <RoundProgress current={round} total={rounds.length} label="入住进度" />

        <div className="w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-gradient-to-b from-indigo-50 via-white to-amber-50 shadow-inner sm:rounded-[1.75rem]">
          <div className="flex items-center justify-between px-3 pt-3 sm:px-4 sm:pt-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
                五线谱星光树屋
              </p>
              <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">
                音越高，住的位置越靠上
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                feedback === 'correct'
                  ? 'bg-green-100 text-green-600'
                  : feedback === 'wrong'
                    ? 'bg-red-100 text-red-500'
                    : 'bg-indigo-100 text-indigo-600'
              }`}
              aria-live="polite"
            >
              {feedback === 'correct'
                ? '入住成功'
                : feedback === 'wrong'
                  ? '再找找'
                  : `寻找 ${note.name} 的家`}
            </span>
          </div>

        <div className="mx-3 mt-2 flex items-center gap-2 rounded-2xl border border-white bg-white/80 p-2 sm:mx-4">
            <NoteCharacter noteIndex={noteIndex} disabled={answered} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400">待入住音符</p>
              <p className="mt-0.5 text-sm font-black" style={{ color: note.color }}>
                {note.name} · {note.shortName}
              </p>
              <p className="mt-0.5 text-[8px] font-bold text-slate-400">
                拖动音符，或直接点击谱面上的小屋
              </p>
            </div>
            <button
              type="button"
              onClick={() => playTone(note.freq, 0.7, 0.22)}
              disabled={answered}
              className="shrink-0 rounded-xl bg-indigo-50 px-2.5 py-2 text-[10px] font-black text-indigo-600 disabled:opacity-50"
            >
              ▶ 听音
            </button>
          </div>

          <div className="relative mx-3 mt-2 h-44 overflow-hidden rounded-2xl border border-white/90 bg-gradient-to-b from-indigo-100 via-sky-50 to-amber-50 sm:mx-4 sm:h-48">
            <span className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-5xl font-serif text-indigo-500">
              𝄞
            </span>

            {[24, 36, 48, 60, 72].map((top, index) => (
              <div
                key={top}
                className={`absolute left-14 right-4 border-t-2 ${
                  index === 0 ? 'border-indigo-400' : 'border-slate-300'
                }`}
                style={{ top: `${top}%` }}
              />
            ))}

            {HOMES.map((home) => (
              <StaffHome
                key={home.index}
                home={home}
                targetIndex={noteIndex}
                selectedHome={selectedHome}
                feedback={feedback}
                simpleMode={simpleMode}
                disabled={answered}
                onChoose={chooseHome}
              />
            ))}

            <span className="absolute bottom-1 left-3 text-[7px] font-bold text-slate-400">
              低音区
            </span>
            <span className="absolute right-3 top-[13%] text-[7px] font-bold text-slate-400">
              高音区
            </span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-bold text-slate-400">
              从下往上数五条线
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pb-2 pt-2 text-center sm:px-4 sm:pb-3">
            {[
              { label: 'Do', detail: '下加一线', color: TOWN_NOTES[0].color },
              { label: 'Re', detail: '线下间', color: TOWN_NOTES[1].color },
              { label: 'Mi', detail: '第一线', color: TOWN_NOTES[2].color },
              { label: 'Fa', detail: '第一间', color: TOWN_NOTES[3].color },
              { label: 'Sol', detail: '第二线', color: TOWN_NOTES[4].color },
              { label: 'La', detail: '第二间', color: TOWN_NOTES[5].color },
              { label: 'Si', detail: '第三线', color: TOWN_NOTES[6].color },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white/80 px-0.5 py-1">
                <strong className="block text-[9px]" style={{ color: item.color }}>
                  {item.label}
                </strong>
                <span className="block text-[7px] font-bold text-slate-400">
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        <AnswerFeedback type={feedback}>
          {feedback === 'correct'
            ? `${note.name} 找到五线谱上的家啦！`
            : '音高越高，音符在五线谱上的位置也越高。'}
        </AnswerFeedback>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 sm:text-xs">
          记忆顺口溜：Do 加线 · Re 线下 · Mi 在线，音符逐级向上
        </div>
      </div>
    </DndContext>
  );
}
