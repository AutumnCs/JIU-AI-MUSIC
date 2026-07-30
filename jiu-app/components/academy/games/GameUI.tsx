import { motion } from 'framer-motion';

export function GameIntro({
  children,
  detail,
}: {
  children: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="w-full rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-2.5 text-center sm:p-3.5">
      <p className="text-sm font-bold text-slate-700 sm:text-base">{children}</p>
      {detail && <p className="mt-0.5 text-[11px] leading-4 text-slate-500 sm:mt-1 sm:text-xs sm:leading-5">{detail}</p>}
    </div>
  );
}

export function RoundProgress({
  current,
  total,
  label = '练习进度',
}: {
  current: number;
  total: number;
  label?: string;
}) {
  const displayCurrent = Math.min(current + 1, total);
  const value = Math.min((displayCurrent / total) * 100, 100);
  return (
    <div className="w-full max-w-sm">
      <div className="mb-1.5 flex justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        <span>{displayCurrent} / {total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 sm:h-2.5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-green-500"
          animate={{ width: `${value}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 24 }}
        />
      </div>
    </div>
  );
}

export function SimpleModeNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
      🐦 已开启简单模式：提示更明显
    </div>
  );
}

export function AnswerFeedback({
  type,
  children,
}: {
  type: 'correct' | 'wrong' | null;
  children?: React.ReactNode;
}) {
  if (!type) return null;

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`pointer-events-none fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-full border px-3 py-2 text-center text-xs font-bold shadow-lg sm:static sm:w-full sm:translate-x-0 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm ${
        type === 'correct'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-600'
      }`}
    >
      <span className="mr-1">{type === 'correct' ? '✓' : '↻'}</span>
      {children ?? (type === 'correct' ? '答对啦！' : '再听一次，你会找到答案的。')}
    </motion.div>
  );
}
