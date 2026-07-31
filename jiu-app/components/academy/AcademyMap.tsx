'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LEVELS } from '@/lib/constants';
import { CountrysideBackground } from './CountrysideBackground';
import { LevelNode, LevelStatus } from './LevelNode';
import { LevelDetailSheet } from './LevelDetailSheet';
import styles from '@/app/academy/academy.module.css';

interface AcademyProgress {
  completed: boolean;
  bestScore: number;
}

interface AcademyMapProps {
  progress: Record<number, AcademyProgress>;
}

const DECORATIONS = [
  { icon: '🌲', x: 84, y: 11, size: 'medium' },
  { icon: '🌲', x: 88, y: 28, size: 'medium' },
  { icon: '🌳', x: 10, y: 36, size: 'large' },
  { icon: '🪨', x: 12, y: 46, size: 'small' },
  { icon: '🌼', x: 87, y: 50, size: 'small' },
  { icon: '🌻', x: 11, y: 67, size: 'medium' },
  { icon: '💧', x: 87, y: 75, size: 'small' },
  { icon: '🌾', x: 82, y: 87, size: 'large' },
] as const;

export function AcademyMap({ progress }: AcademyMapProps) {
  const currentNodeRef = useRef<HTMLDivElement>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);

  const levelStates = useMemo(
    () =>
      LEVELS.map((level, index) => {
        const isCompleted = Boolean(progress[level.id]?.completed);
        const previousLevel = LEVELS[index - 1];
        const isUnlocked =
          index === 0 || Boolean(previousLevel && progress[previousLevel.id]?.completed);
        const status: LevelStatus = isCompleted
          ? 'completed'
          : isUnlocked
            ? 'current'
            : 'locked';

        return { level, status, bestScore: progress[level.id]?.bestScore };
      }),
    [progress],
  );

  const currentLevelId =
    levelStates.find(({ status }) => status === 'current')?.level.id ??
    LEVELS[LEVELS.length - 1].id;
  const selectedLevel = levelStates.find(
    ({ level }) => level.id === selectedLevelId,
  );

  useLayoutEffect(() => {
    const currentNode = currentNodeRef.current;
    if (!currentNode) return;

    const header = document.querySelector<HTMLElement>(`.${styles.header}`);
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const bottomNavigationHeight = 72;
    const visibleHeight = Math.max(
      window.innerHeight - headerHeight - bottomNavigationHeight,
      0,
    );
    const nodeRect = currentNode.getBoundingClientRect();
    const targetTop = Math.max(
      0,
      window.scrollY +
        nodeRect.top -
        headerHeight -
        (visibleHeight - nodeRect.height) / 2,
    );

    window.scrollTo({ top: targetTop, behavior: 'auto' });
  }, [currentLevelId]);

  return (
    <div
      className={styles.mapCanvas}
      onClick={() => setSelectedLevelId(null)}
    >
      <CountrysideBackground />
      <div className={styles.sun} aria-hidden="true" />

      <motion.div
        className={`${styles.cloud} ${styles.cloudOne}`}
        aria-hidden="true"
        animate={{ x: [0, 18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☁️
      </motion.div>
      <motion.div
        className={`${styles.cloud} ${styles.cloudTwo}`}
        aria-hidden="true"
        animate={{ x: [0, -14, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      >
        ☁️
      </motion.div>

      <div className={`${styles.areaSign} ${styles.forestSign}`}>
        <span>✨</span>
        <span>第三阶段 · 旋律星图</span>
      </div>
      <div className={`${styles.areaSign} ${styles.hillSign}`}>
        <span>🥁</span>
        <span>第二阶段 · 节奏魔法</span>
      </div>
      <div className={`${styles.areaSign} ${styles.fieldSign}`}>
        <span>👂</span>
        <span>第一阶段 · 听的世界</span>
      </div>

      <svg
        className={styles.route}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className={styles.routeShadow}
          d="M 30 96 C 20 92, 22 86, 30 90 S 77 86, 68 81 S 23 76, 31 72 S 78 66, 69 61 S 22 56, 31 52 S 78 47, 69 43 S 22 37, 31 32 S 78 27, 69 23 S 22 18, 31 14"
        />
        <path
          className={styles.routeRoad}
          d="M 30 96 C 20 92, 22 86, 30 90 S 77 86, 68 81 S 23 76, 31 72 S 78 66, 69 61 S 22 56, 31 52 S 78 47, 69 43 S 22 37, 31 32 S 78 27, 69 23 S 22 18, 31 14"
        />
        <path
          className={styles.routeDashes}
          d="M 30 96 C 20 92, 22 86, 30 90 S 77 86, 68 81 S 23 76, 31 72 S 78 66, 69 61 S 22 56, 31 52 S 78 47, 69 43 S 22 37, 31 32 S 78 27, 69 23 S 22 18, 31 14"
        />
      </svg>

      {DECORATIONS.map((decoration) => (
        <span
          key={`${decoration.icon}-${decoration.x}-${decoration.y}`}
          className={`${styles.decoration} ${styles[decoration.size]}`}
          style={{ left: `${decoration.x}%`, top: `${decoration.y}%` }}
          aria-hidden="true"
        >
          {decoration.icon}
        </span>
      ))}

      <div className={styles.windmill} aria-hidden="true">
        <span className={styles.windmillBlades}>✣</span>
        <span className={styles.windmillTower} />
      </div>

      <div className={styles.fence} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      {levelStates.map(({ level, status, bestScore }) => (
        <div
          key={level.id}
          ref={level.id === currentLevelId ? currentNodeRef : undefined}
          className={styles.nodePosition}
          style={{
            left: `${level.position.x}%`,
            top: `${level.position.y}%`,
          }}
        >
          <LevelNode
            level={level}
            status={status}
            bestScore={bestScore}
            isSelected={level.id === selectedLevelId}
            onSelect={() => setSelectedLevelId(level.id)}
          />
        </div>
      ))}

      <AnimatePresence mode="wait">
        {selectedLevel && (
          <LevelDetailSheet
            key={selectedLevel.level.id}
            level={selectedLevel.level}
            status={selectedLevel.status}
            bestScore={selectedLevel.bestScore}
            onClose={() => setSelectedLevelId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
