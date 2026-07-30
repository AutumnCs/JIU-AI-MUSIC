'use client';
import { motion } from 'framer-motion';
import { Bird } from '@/lib/constants';
import { useGlobalStore } from '@/stores/globalStore';

interface BirdCardProps {
  bird: Bird;
  onClick: () => void;
}

export function BirdCard({ bird, onClick }: BirdCardProps) {
  const { unlockedBirds, fragments, currentBirdId } = useGlobalStore();
  const isUnlocked = unlockedBirds.includes(bird.id);
  const isCurrent = currentBirdId === bird.id;
  const fragmentCount = bird.fragmentType
    ? fragments[bird.fragmentType as keyof typeof fragments] || 0
    : 0;
  const progress = bird.fragmentNeeded > 0 ? fragmentCount / bird.fragmentNeeded : 1;

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative w-[140px] rounded-2xl p-3 text-left transition-all ${
        isUnlocked
          ? 'bg-white shadow-md border border-gray-100'
          : 'bg-gray-50 border border-gray-200'
      }`}
    >
      {/* Current badge */}
      {isCurrent && (
        <div className="absolute -top-2 -right-2 bg-[#FF9F43] text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
          当前
        </div>
      )}

      {/* Bird image */}
      <div className={`w-full aspect-square rounded-xl mb-2 flex items-center justify-center text-4xl ${
        isUnlocked ? 'bg-orange-50' : 'bg-gray-200'
      }`}>
        {isUnlocked ? '🐦' : '🔒'}
      </div>

      {/* Name */}
      <div className={`text-sm font-semibold truncate ${isUnlocked ? 'text-gray-800' : 'text-gray-400'}`}>
        {isUnlocked ? bird.name : '???'}
      </div>

      {/* Progress bar */}
      {bird.fragmentNeeded > 0 && (
        <div className="mt-1.5">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF9F43] rounded-full transition-all"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {fragmentCount}/{bird.fragmentNeeded} {bird.fragmentType}
          </div>
        </div>
      )}
    </motion.button>
  );
}
