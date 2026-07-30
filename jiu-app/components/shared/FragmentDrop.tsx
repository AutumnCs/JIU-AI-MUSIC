'use client';
import { motion, AnimatePresence } from 'framer-motion';

interface FragmentDropProps {
  show: boolean;
  type: string;
  count: number;
  onClose: () => void;
}

export function FragmentDrop({ show, type, count, onClose }: FragmentDropProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            className="bg-white rounded-2xl p-8 text-center max-w-xs w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-5xl mb-4"
            >
              🎉
            </motion.div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">练习完成！</h2>
            <div className="bg-orange-50 rounded-xl p-4 my-4">
              <div className="text-3xl mb-1">{count > 0 ? '✨' : '🌱'}</div>
              <div className="text-lg font-semibold text-[#FF9F43]">
                {count > 0 ? `获得 ${type}碎片 ×${count}` : '这次没有新的碎片，继续练习会变得更厉害！'}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#FF9F43] text-white font-medium hover:bg-[#e8903d] active:scale-[0.98] transition-all"
            >
              继续探索 →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
