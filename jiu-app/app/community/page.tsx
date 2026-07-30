'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface Work {
  id: number;
  title: string;
  author: string;
  time: string;
  style: string;
  stars: number;
  starred: boolean;
}

const DEMO_WORKS: Work[] = [
  { id: 1, title: '乡间小路', author: '小明', time: '2 分钟前', style: '😊 欢快', stars: 12, starred: false },
  { id: 2, title: '山里的风', author: '小红', time: '1 小时前', style: '🌙 安静', stars: 8, starred: false },
  { id: 3, title: '梦中的鸟', author: '小刚', time: '3 小时前', style: '✨ 梦幻', stars: 5, starred: false },
  { id: 4, title: '溪水叮咚', author: '小美', time: '5 小时前', style: '🌙 安静', stars: 3, starred: false },
];

export default function CommunityPage() {
  const [works, setWorks] = useState(DEMO_WORKS);

  const handleStar = (id: number) => {
    setWorks((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, starred: !w.starred, stars: w.starred ? w.stars - 1 : w.stars + 1 } : w
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-20">
      <div className="sticky top-0 z-10 bg-[#FFF8F0] px-4 py-3 border-b border-orange-100">
        <h1 className="text-xl font-bold text-gray-800 text-center">🌟 社区</h1>
      </div>

      <div className="p-4 space-y-3">
        {works.map((work) => (
          <motion.div
            key={work.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎵</span>
              <div>
                <div className="font-semibold text-gray-800">{work.title}</div>
                <div className="text-xs text-gray-400">{work.author} · {work.time}</div>
              </div>
            </div>

            {/* Fake audio player */}
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 mb-3">
              <button className="w-8 h-8 rounded-full bg-[#FF9F43] text-white flex items-center justify-center text-sm">
                ▶️
              </button>
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
                <div className="h-full bg-[#FF9F43] rounded-full w-1/3" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">{work.style}</span>
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
