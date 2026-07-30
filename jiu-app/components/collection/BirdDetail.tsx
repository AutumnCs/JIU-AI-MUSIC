'use client';
import { motion } from 'framer-motion';
import { Bird } from '@/lib/constants';
import { useGlobalStore } from '@/stores/globalStore';

interface BirdDetailProps {
  bird: Bird;
  onClose: () => void;
}

export function BirdDetail({ bird, onClose }: BirdDetailProps) {
  const { unlockedBirds, fragments, currentBirdId, setCurrentBird } = useGlobalStore();
  const isUnlocked = unlockedBirds.includes(bird.id);
  const isCurrent = currentBirdId === bird.id;
  const fragmentCount = bird.fragmentType
    ? fragments[bird.fragmentType as keyof typeof fragments] || 0
    : 0;
  const progress = bird.fragmentNeeded > 0 ? fragmentCount / bird.fragmentNeeded : 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 text-xl">✕</button>

        {/* Bird Image */}
        <div className="flex justify-center mb-4">
          <div className={`w-40 h-40 rounded-2xl flex items-center justify-center text-6xl ${
            isUnlocked ? 'bg-orange-50' : 'bg-gray-200'
          }`}>
            {isUnlocked ? '🐦' : '🔒'}
          </div>
        </div>

        {/* Name */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">{isUnlocked ? bird.name : '???'}</h2>
          <p className="text-sm text-gray-400">{bird.englishName}</p>
        </div>

        {/* Description */}
        {isUnlocked && (
          <div className="bg-orange-50 rounded-xl p-4 mb-4">
            <p className="text-gray-600 italic">&ldquo;{bird.description}&rdquo;</p>
          </div>
        )}

        {/* Fragment progress */}
        {bird.fragmentNeeded > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">碎片进度</span>
              <span className="text-[#FF9F43] font-medium">{fragmentCount}/{bird.fragmentNeeded}</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF9F43] rounded-full transition-all"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              来源：{bird.fragmentType === '绒羽' ? '完成学院关卡' : bird.fragmentType === '怪羽' ? '在工坊完成作品' : '在社区发布作品/被点赞'}
            </p>
          </div>
        )}

        {/* Action button */}
        {isUnlocked && !isCurrent && (
          <button
            onClick={() => setCurrentBird(bird.id)}
            className="w-full py-3.5 rounded-xl bg-[#FF9F43] text-white font-medium text-lg hover:bg-[#e8903d] active:scale-[0.98] transition-all"
          >
            ⭐ 选择为伴学助手
          </button>
        )}
        {isCurrent && (
          <div className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-500 font-medium text-lg text-center">
            ✅ 当前伴学助手
          </div>
        )}
        {!isUnlocked && (
          <div className="w-full py-3.5 rounded-xl bg-gray-100 text-gray-400 text-center text-sm">
            完成{bird.fragmentType === '绒羽' ? '学院关卡' : bird.fragmentType === '怪羽' ? '工坊创作' : '社区互动'}可获得{bird.fragmentType}碎片
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
