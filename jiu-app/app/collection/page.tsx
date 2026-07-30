'use client';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BIRDS, CATEGORY_LABELS, Bird } from '@/lib/constants';
import { BirdCard } from '@/components/collection/BirdCard';
import { BirdDetail } from '@/components/collection/BirdDetail';

export default function CollectionPage() {
  const [selectedBird, setSelectedBird] = useState<Bird | null>(null);
  const categories = ['cute', 'abstract', 'mystery'] as const;

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FFF8F0] px-4 py-3 border-b border-orange-100">
        <h1 className="text-xl font-bold text-gray-800 text-center">🐦 图鉴</h1>
      </div>

      {/* Categories */}
      <div className="p-4 space-y-6">
        {categories.map((cat) => {
          const birds = BIRDS.filter((b) => b.category === cat);
          if (birds.length === 0) return null;
          return (
            <div key={cat}>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">
                ── {CATEGORY_LABELS[cat]} ──
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {birds.map((bird) => (
                  <BirdCard
                    key={bird.id}
                    bird={bird}
                    onClick={() => setSelectedBird(bird)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBird && (
          <BirdDetail bird={selectedBird} onClose={() => setSelectedBird(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
