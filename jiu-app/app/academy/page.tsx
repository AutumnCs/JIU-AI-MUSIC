'use client';

import { useGlobalStore } from '@/stores/globalStore';
import { LEVELS } from '@/lib/constants';
import { AcademyMap } from '@/components/academy/AcademyMap';
import styles from './academy.module.css';

export default function AcademyPage() {
  const { academyProgress } = useGlobalStore();
  const completedCount = LEVELS.filter(
    (level) => academyProgress[level.id]?.completed,
  ).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleGroup}>
            <span className={styles.titleIcon} aria-hidden="true">
              🎓
            </span>
            <div>
              <h1 className={styles.title}>音乐探索地图</h1>
              <span className={styles.eyebrow}>从田野出发，一路唱进山林</span>
            </div>
          </div>
          <div className={styles.progressCount}>
            <strong>{completedCount}</strong> / {LEVELS.length} 关
          </div>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="学院关卡进度"
          aria-valuemin={0}
          aria-valuemax={LEVELS.length}
          aria-valuenow={completedCount}
        >
          <div
            className={styles.progressFill}
            style={{ width: `${(completedCount / LEVELS.length) * 100}%` }}
          />
        </div>
      </header>

      <AcademyMap progress={academyProgress} />
    </main>
  );
}
