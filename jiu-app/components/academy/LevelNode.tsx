'use client';

import { motion } from 'framer-motion';
import { LEVELS } from '@/lib/constants';
import styles from '@/app/academy/academy.module.css';

export type LevelStatus = 'completed' | 'current' | 'locked';

type Level = (typeof LEVELS)[number];

interface LevelNodeProps {
  level: Level;
  status: LevelStatus;
  bestScore?: number;
  isSelected: boolean;
  onSelect: () => void;
}

const STATUS_COPY: Record<LevelStatus, string> = {
  completed: '已通关',
  current: '可挑战',
  locked: '未解锁',
};

export function LevelNode({
  level,
  status,
  bestScore,
  isSelected,
  onSelect,
}: LevelNodeProps) {
  const isLocked = status === 'locked';
  const earnedStars = Math.max(0, Math.min(3, bestScore ?? 0));

  return (
    <button
      type="button"
      className={styles.levelButton}
      aria-label={`${level.stageId}-${level.lesson} ${level.name}，${STATUS_COPY[status]}${isSelected ? '，已选中' : ''}`}
      aria-pressed={isSelected}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <motion.div
        className={`${styles.nodeContent} ${styles[status]} ${isSelected ? styles.selected : ''}`}
        animate={status === 'current' ? { y: [0, -6, 0] } : undefined}
        transition={
          status === 'current'
            ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        {status === 'current' && (
          <motion.span
            className={styles.currentRing}
            aria-hidden="true"
            animate={{ scale: [0.9, 1.2], opacity: [0.65, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        <span className={styles.nodeOrb} aria-hidden="true">
          <span className={styles.nodeIcon}>
            {status === 'completed' ? '⭐' : isLocked ? '🔒' : level.icon}
          </span>
          <span className={styles.levelNumber}>
            {level.stageId}-{level.lesson}
          </span>
        </span>

        <span className={styles.nodeNameTag}>
          <strong>{level.name}</strong>
          {isLocked && <span aria-hidden="true"> · 锁定</span>}
        </span>

        {status === 'completed' && (
          <span
            className={styles.nodeStars}
            aria-label={`本关获得 ${earnedStars} 颗星`}
          >
            {[1, 2, 3].map((star) => (
              <span
                key={star}
                className={star <= earnedStars ? styles.starEarned : styles.starEmpty}
                aria-hidden="true"
              >
                ★
              </span>
            ))}
          </span>
        )}
      </motion.div>
    </button>
  );
}
