'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getActiveUserId } from '@/lib/auth/active-user';
import { readWorkshopWorks } from '@/lib/workshop/storage';
import type { PublishedWork } from '@/lib/workshop/types';
import { useGlobalStore } from '@/stores/globalStore';

interface Work {
  id: number;
  title: string;
  author: string;
  time: string;
  style: string;
  stars: number;
  starred: boolean;
  audio?: string;
  caption?: string;
  emoji?: string;
}

const GENRE_LABELS: Record<string, string> = {
  pop: '流行',
  rnb: '节奏蓝调',
  hiphop: '嘻哈',
  rap: '说唱',
  rock: '摇滚',
  jazz: '爵士',
  country: '乡村',
  classic: '古典',
};

const MOOD_LABELS: Record<string, string> = {
  happy: '开心',
  sad: '难过',
  excited: '兴奋',
  relaxed: '放松',
  romantic: '浪漫',
  powerful: '有力量',
  mysterious: '神秘',
  nostalgic: '怀念',
  playful: '俏皮',
  dreamy: '梦幻',
};

const DEMO_WORKS: Work[] = [
  { id: 1, title: '乡间小路', author: '小明', time: '2 分钟前', style: '😊 欢快', stars: 12, starred: false },
  { id: 2, title: '山里的风', author: '小红', time: '1 小时前', style: '🌙 安静', stars: 8, starred: false },
  { id: 3, title: '梦中的鸟', author: '小刚', time: '3 小时前', style: '✨ 梦幻', stars: 5, starred: false },
  { id: 4, title: '溪水叮咚', author: '小美', time: '5 小时前', style: '🌙 安静', stars: 3, starred: false },
];

export default function CommunityPage() {
  const { authState } = useGlobalStore();
  const activeUserId = getActiveUserId(authState);
  const [works, setWorks] = useState(DEMO_WORKS);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const publishedWorks = readWorkshopWorks(activeUserId, authState.source)
        .filter((work) => work.status === 'published')
        .map(toCommunityWork);

      setWorks(publishedWorks.length > 0 ? publishedWorks : DEMO_WORKS);
    } catch {
      setWorks(DEMO_WORKS);
    }

    return () => audioRef.current?.pause();
  }, [activeUserId, authState.source]);

  const handleStar = (id: number) => {
    setWorks((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, starred: !w.starred, stars: w.starred ? w.stars - 1 : w.stars + 1 } : w,
      ),
    );
  };

  const togglePlay = (work: Work) => {
    if (!work.audio) return;
    if (playingId === work.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(work.audio);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    void audio.play();
    setPlayingId(work.id);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-20">
      <div className="sticky top-0 z-10 border-b border-orange-100 bg-[#FFF8F0] px-4 py-3">
        <h1 className="text-center text-xl font-bold text-gray-800">社区</h1>
      </div>

      <div className="space-y-3 p-4">
        {works.map((work) => (
          <motion.div
            key={work.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-gray-50 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">{work.emoji ?? '🎵'}</span>
              <div>
                <div className="font-semibold text-gray-800">{work.title}</div>
                <div className="text-xs text-gray-400">
                  {work.author} · {work.time}
                </div>
              </div>
            </div>

            {work.caption && (
              <p className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-sm text-gray-600">{work.caption}</p>
            )}

            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <button
                type="button"
                onClick={() => togglePlay(work)}
                disabled={!work.audio}
                aria-label={playingId === work.id ? `暂停${work.title}` : `播放${work.title}`}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF9F43] text-sm text-white disabled:opacity-70"
              >
                {playingId === work.id ? '❚❚' : '▶'}
              </button>
              <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                <div className={`h-full rounded-full bg-[#FF9F43] transition-all ${playingId === work.id ? 'w-2/3' : 'w-1/3'}`} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">{work.style}</span>
              <motion.button
                whileTap={{ scale: 1.3 }}
                onClick={() => handleStar(work.id)}
                className={`flex items-center gap-1 text-sm transition-all ${
                  work.starred ? 'text-[#FF9F43]' : 'text-gray-400'
                }`}
              >
                <span className="text-lg">{work.starred ? '⭐' : '☆'}</span>
                <span>{work.stars}</span>
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function toCommunityWork(work: PublishedWork): Work {
  return {
    id: work.id,
    title: work.title,
    author: work.authorId ? `用户 ${work.authorId}` : '我',
    time: '刚刚',
    style: `${MOOD_LABELS[work.mood] ?? '原创'} · ${GENRE_LABELS[work.genre] ?? '音乐'}`,
    stars: 0,
    starred: false,
    audio: work.audio,
    caption: work.caption,
    emoji: work.emoji,
  };
}
