'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useGlobalStore } from '@/stores/globalStore';

type Work = {
  id: string;
  taskId: string;
  title: string;
  audio: string;
  genre: string;
  mood: string;
  createdAt: string;
};
type Notification = { id: string; type: string; actorName: string; createdAt: string };

export default function MePage() {
  const { authState, fragments, unlockedBirds } = useGlobalStore();
  const [works, setWorks] = useState<Work[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/music/tasks');
        const payload = await response.json() as { works?: Work[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? '作品加载失败');
        setWorks(payload.works ?? []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '作品暂时无法加载');
      }
    })();
    void (async () => {
      const response = await fetch('/api/community/notifications');
      if (response.ok) setNotifications((await response.json() as { notifications?: Notification[] }).notifications ?? []);
    })();
  }, []);

  const displayName = authState.user?.displayName ?? (authState.user?.type === 'guest' ? '游客创作者' : '啾啾音乐人');

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 pb-28 pt-5">
      <header className="rounded-3xl bg-[#2C3E50] p-5 text-white shadow-lg">
        <p className="text-xs font-bold tracking-[0.18em] text-[#FFD7A0]">JIU CREATOR SPACE</p>
        <h1 className="mt-2 text-2xl font-black">我的</h1>
        <p className="mt-2 text-sm text-white/75">{displayName}</p>
        <p className="mt-1 break-all text-xs text-white/55">{authState.user?.id ?? '正在建立游客身份...'}</p>
      </header>

      <section className="mt-4 grid grid-cols-3 gap-2" aria-label="我的数据">
        <Stat label="我的作品" value={works.length} />
        <Stat label="已收集" value={unlockedBirds.length} />
        <Stat label="羽毛碎片" value={Object.values(fragments).reduce((sum, value) => sum + value, 0)} />
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#F2E5D9]">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-[#352B25]">我的作品</h2>
          <Link href="/workshop" className="text-sm font-bold text-[#C87835]">去工坊创作</Link>
        </div>
        {error && <p role="status" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>}
        {!error && works.length === 0 && <p className="mt-5 rounded-2xl bg-[#FFF8F0] p-4 text-center text-sm font-bold text-[#8A7666]">还没有云端作品，先去工坊写一首吧。</p>}
        <div className="mt-4 space-y-3">
          {works.map((work) => (
            <article key={work.id} className="rounded-2xl bg-[#FFF8F0] p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-black text-[#4A3B32]">{work.title}</h3>
                  <p className="mt-1 text-xs text-[#A49488]">{work.genre} · {work.mood}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#B96221]">已保存</span>
              </div>
              <audio controls preload="none" className="mt-3 w-full" src={work.audio} />
              <Link href={`/community?musicTaskId=${encodeURIComponent(work.taskId)}`} className="mt-2 inline-block text-xs font-black text-[#C87835]">发布到社区</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#F2E5D9]"><h2 className="font-black text-[#352B25]">消息中心</h2>{notifications.length === 0 ? <p className="mt-4 text-sm text-[#8A7666]">暂时没有新的互动消息。</p> : <div className="mt-3 space-y-2">{notifications.slice(0, 10).map((item) => <p key={item.id} className="rounded-xl bg-[#FFF8F0] px-3 py-2 text-sm text-[#5C4D42]">{item.actorName} {notificationText(item.type)}</p>)}</div>}</section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/collection" className="rounded-2xl bg-white p-4 font-black text-[#4A3B32] shadow-sm">查看图鉴</Link>
        <Link href="/community" className="rounded-2xl bg-white p-4 font-black text-[#4A3B32] shadow-sm">进入社区</Link>
      </section>
    </main>
  );
}

function notificationText(type: string) {
  if (type === 'post_like') return '赞了你的帖子';
  if (type === 'post_favorite') return '收藏了你的帖子';
  if (type === 'comment_like') return '赞了你的评论';
  if (type === 'comment_reply') return '回复了你的评论';
  return '评论了你的帖子';
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-xl font-black text-[#C87835]">{value}</p><p className="mt-1 text-xs font-bold text-[#8A7666]">{label}</p></div>;
}
