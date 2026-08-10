'use client';

import { useGlobalStore } from '@/stores/globalStore';
import { LEVELS } from '@/lib/constants';
import { AcademyMap } from '@/components/academy/AcademyMap';
import { PageHeader } from '@/components/layout/PageHeader';
import styles from './academy.module.css';

export default function AcademyPage() {
  const { academyProgress } = useGlobalStore();
  const completedCount = LEVELS.filter(
    (level) => academyProgress[level.id]?.completed,
  ).length;

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="JIU MUSIC ACADEMY"
        title="音乐探索地图"
        subtitle="从田野出发，一路唱进山林"
        right={(
          <div className="jiu-status-badge rounded-full px-3 py-1.5 text-xs font-extrabold">
            <span>已完成 </span><strong className="text-[#E47A24]">{completedCount}</strong> / {LEVELS.length}
          </div>
        )}
      />

      <div className={styles.mapFrame}>
        <AcademyMap progress={academyProgress} />
      </div>
    </main>
  );
}
