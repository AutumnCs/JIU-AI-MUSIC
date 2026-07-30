'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { GameIntro, RoundProgress, SimpleModeNotice } from './GameUI';
import { playRhythm } from './audio';

type NoteValue = 1 | 0.5;
type PuzzleStatus = 'idle' | 'correct' | 'wrong';

const PATTERNS: NoteValue[][] = [
  [1, 1, 1, 1],
  [1, 0.5, 0.5, 1, 1],
  [0.5, 0.5, 1, 0.5, 0.5, 1],
];

function noteLabel(value: NoteValue) {
  return value === 1 ? '♩' : '♪';
}

function NoteBlock({
  value,
  onClick,
}: {
  value: NoteValue;
  onClick?: () => void;
}) {
  const id = value === 1 ? 'quarter' : 'eighth';
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={onClick}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: 'none',
      }}
      className={`grid min-w-20 place-items-center rounded-xl border-2 px-3 py-2 font-black shadow-sm transition ${
        value === 1
          ? 'border-orange-200 bg-orange-50 text-orange-600 hover:border-orange-300'
          : 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300'
      } ${isDragging ? 'z-50 scale-105 opacity-80' : ''}`}
    >
      <span className="text-xl">{noteLabel(value)}</span>
      <span className="text-[9px] font-bold opacity-70">
        {value === 1 ? '走路拍' : '跑步拍'}
      </span>
    </button>
  );
}

function RhythmStrip({
  id,
  notes,
  emptyText,
  isOver,
}: {
  id: 'target' | 'built';
  notes: NoteValue[];
  emptyText: string;
  isOver?: boolean;
}) {
  const target = id === 'target';
  return (
    <div
      className={`relative grid min-h-16 w-full grid-cols-8 items-center gap-1.5 overflow-hidden rounded-2xl border-2 px-2.5 py-2 transition ${
        target
          ? 'border-amber-100 bg-amber-50/80'
          : isOver
            ? 'border-green-400 bg-green-50'
            : 'border-dashed border-slate-300 bg-white/80'
      }`}
    >
      <div className="absolute inset-x-2 top-1/2 border-t border-dashed border-slate-200" />
      {notes.length === 0 ? (
        <span className="relative z-10 col-span-8 w-full text-center text-[11px] font-bold text-slate-400">
          {emptyText}
        </span>
      ) : (
        notes.map((value, index) => (
          <span
            key={`${value}-${index}`}
            className={`relative z-10 grid h-10 place-items-center rounded-lg font-black ${
              value === 1
                ? 'bg-orange-200 text-orange-700'
                : 'bg-blue-200 text-blue-700'
            }`}
            style={{ gridColumn: `span ${value === 1 ? 2 : 1}` }}
          >
            {noteLabel(value)}
          </span>
        ))
      )}
    </div>
  );
}

export function RhythmPuzzle({
  onComplete,
  onMistake,
  simpleMode,
}: AcademyGameProps) {
  const patterns = simpleMode ? PATTERNS.slice(0, 2) : PATTERNS;
  const [round, setRound] = useState(0);
  const [built, setBuilt] = useState<NoteValue[]>([]);
  const [correct, setCorrect] = useState(0);
  const [status, setStatus] = useState<PuzzleStatus>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimerRef = useRef<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const target = patterns[round];
  const usedBeats = useMemo(
    () => built.reduce<number>((sum, note) => sum + note, 0),
    [built],
  );

  const playTarget = useCallback(async () => {
      setIsPlaying(true);
      const duration = await playRhythm(target);
      playbackTimerRef.current = window.setTimeout(() => {
        setIsPlaying(false);
        playbackTimerRef.current = null;
      }, duration + 100);
    }, [target]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void playTarget(), 420);
    return () => {
      window.clearTimeout(timeout);
      if (playbackTimerRef.current) {
        window.clearTimeout(playbackTimerRef.current);
      }
    };
  }, [playTarget]);

  const addNote = (value: NoteValue) => {
    if (isPlaying || status !== 'idle' || usedBeats + value > 4) return;
    setBuilt((items) => [...items, value]);
    setStatus('idle');
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over?.id !== 'rhythm-strip') return;
    addNote(active.id === 'quarter' ? 1 : 0.5);
  };

  const submit = () => {
    if (isPlaying || usedBeats !== 4) return;
    const isCorrect =
      built.length === target.length &&
      built.every((value, index) => value === target[index]);
    const nextCorrect = correct + (isCorrect ? 1 : 0);
    if (!isCorrect) {
      onMistake();
      setStatus('wrong');
      window.setTimeout(() => {
        setBuilt([]);
        setStatus('idle');
      }, 500);
      return;
    }
    setCorrect(nextCorrect);
    setStatus('correct');
    void playRhythm(built);
    window.setTimeout(() => {
      if (round >= patterns.length - 1) {
        onComplete(nextCorrect >= patterns.length ? 3 : nextCorrect > 0 ? 2 : 1);
      } else {
        setRound((value) => value + 1);
        setBuilt([]);
        setStatus('idle');
      }
    }, 900);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col items-center gap-2.5 sm:gap-4">
        <GameIntro detail="听示范节奏，把相同的音符顺序搭进节奏桥">
          🧩 节奏拼图开始搭桥
        </GameIntro>
        <SimpleModeNotice show={simpleMode} />
        <RoundProgress current={round} total={patterns.length} label="搭桥进度" />

        <div className="w-full max-w-sm rounded-[1.5rem] border border-amber-100 bg-gradient-to-b from-amber-50 via-white to-sky-50 p-3 shadow-inner sm:rounded-[1.75rem] sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                节奏桥工坊
              </p>
              <p className="mt-0.5 text-xs font-black text-slate-700 sm:text-sm">
                用音符积木拼满 4 拍
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                isPlaying
                  ? 'bg-blue-100 text-blue-600'
                  : status === 'correct'
                    ? 'bg-green-100 text-green-600'
                    : status === 'wrong'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-500'
              }`}
              aria-live="polite"
            >
              {isPlaying
                ? '示范播放中'
                : status === 'correct'
                  ? '搭建正确'
                  : status === 'wrong'
                    ? '再试一次'
                    : `${usedBeats} / 4 拍`}
            </span>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-black text-slate-400">
              <span>示范节奏</span>
              <button
                onClick={() => void playTarget()}
                disabled={isPlaying || status !== 'idle'}
                className="font-black text-blue-500 underline disabled:opacity-50"
              >
                {isPlaying ? '播放中…' : '再听一次'}
              </button>
            </div>
            <RhythmStrip id="target" notes={target} emptyText="" />
          </div>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[10px] font-black text-slate-400">
              <span>你的节奏桥</span>
              <span>{usedBeats} / 4 拍</span>
            </div>
            <DroppableRhythmStrip
              notes={built}
              emptyText="拖进来，也可以直接点击音符"
            />
          </div>

          <div className="mt-3 flex justify-center gap-2.5">
            <NoteBlock value={1} onClick={() => addNote(1)} />
            <NoteBlock value={0.5} onClick={() => addNote(0.5)} />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setBuilt((items) => items.slice(0, -1))}
              disabled={built.length === 0 || isPlaying || status !== 'idle'}
              className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              撤回一块
            </button>
            <button
              onClick={submit}
              disabled={usedBeats !== 4 || isPlaying || status !== 'idle'}
              className="flex-[1.4] rounded-xl bg-amber-500 py-2.5 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              完成拼图
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] font-bold text-slate-500 sm:text-xs">
          四分音符像长木板，八分音符像短木板
        </p>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          已搭对 {correct} 轮
        </div>
      </div>
    </DndContext>
  );
}

function DroppableRhythmStrip({
  notes,
  emptyText,
}: {
  notes: NoteValue[];
  emptyText: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: 'rhythm-strip' });
  return (
    <div ref={setNodeRef}>
      <RhythmStrip id="built" notes={notes} emptyText={emptyText} isOver={isOver} />
    </div>
  );
}
