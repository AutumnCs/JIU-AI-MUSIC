'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalStore } from '@/stores/globalStore';

const pages = [
  { title: '欢迎来到「啾」！', desc: '让我们一起探索音乐的世界吧！', icon: '🐦' },
  { title: '学院', desc: '在游戏中学习乐理知识', icon: '🎓' },
  { title: '工坊', desc: '用 AI 创作属于你的音乐', icon: '🎨' },
  { title: '图鉴', desc: '收集可爱的鸟类伙伴', icon: '🐦' },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const { setOnboarded } = useGlobalStore();

  if (page >= pages.length) {
    return null;
  }

  const isLast = page === pages.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center"
          >
            <div className="text-6xl mb-6">{pages[page].icon}</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">{pages[page].title}</h1>
            <p className="text-gray-500 text-lg">{pages[page].desc}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-6 space-y-4">
        {/* Page indicators */}
        <div className="flex justify-center gap-2">
          {pages.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === page ? 'bg-[#FF9F43] w-6' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {isLast && (
          <label className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span>我已阅读并同意《用户须知》</span>
          </label>
        )}

        <button
          onClick={() => {
            if (isLast) {
              if (!agreed) return;
              setOnboarded();
              onComplete();
            } else {
              setPage(page + 1);
            }
          }}
          disabled={isLast && !agreed}
          className={`w-full py-3.5 rounded-xl text-white font-medium text-lg transition-all ${
            isLast && !agreed
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-[#FF9F43] hover:bg-[#e8903d] active:scale-[0.98]'
          }`}
        >
          {isLast ? '开始探索 →' : '下一步 →'}
        </button>
      </div>
    </div>
  );
}
