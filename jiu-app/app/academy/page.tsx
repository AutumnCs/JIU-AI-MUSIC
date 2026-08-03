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
            <div>
              <span className={styles.eyebrow}>JIU MUSIC ACADEMY</span>
              <h1 className={styles.title}>音乐探索地图</h1>
              <p className={styles.subtitle}>从田野出发，一路唱进山林</p>
            </div>
          </div>
          <div className={styles.progressCount}>
            <span>已完成 </span><strong>{completedCount}</strong> / {LEVELS.length}
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

      <section className={styles.journeyCard} aria-label="当前学习旅程">
        <div>
          <p className={styles.journeyEyebrow}>CURRENT JOURNEY · 当前旅程</p>
          <h2>沿着音乐小径继续前进</h2>
          <p>完成每一站练习，解锁新的旋律与奖励。</p>
        </div>
        <span className={styles.journeyMark} aria-hidden="true">✦</span>
      </section>

      <div className={styles.mapFrame}>
        <AcademyMap progress={academyProgress} />
      </div>
    </main>
  );
}
