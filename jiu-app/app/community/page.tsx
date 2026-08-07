'use client';
/* User-provided media URLs are intentionally rendered without a fixed image loader. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readWorkshopWorks } from '@/lib/workshop/storage';
import { getActiveUserId } from '@/lib/auth/active-user';
import { useGlobalStore } from '@/stores/globalStore';

type Post = {
  id: string;
  author: { displayName: string };
  body: string;
  media: string[];
  music: { providerTaskId: string; audioUrl: string | null; lyrics: string | null } | null;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  liked: boolean;
  favorited: boolean;
  createdAt: string;
};

export default function CommunityPage() {
  const { authState } = useGlobalStore();
  const userId = getActiveUserId(authState);
  const [sort, setSort] = useState<'latest' | 'hot'>('latest');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [error, setError] = useState('');

  const loadPosts = async (reset = true) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ sort, limit: '12' });
      if (!reset && cursor) query.set('cursor', cursor);
      const response = await fetch(`/api/community/posts?${query}`);
      const payload = await response.json() as { posts?: Post[]; nextCursor?: string | null; error?: string };
      if (!response.ok) throw new Error(payload.error ?? '加载失败');
      setPosts((current) => reset ? payload.posts ?? [] : [...current, ...(payload.posts ?? [])]);
      setCursor(payload.nextCursor ?? null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '社区暂时无法加载');
    } finally {
      setLoading(false);
    }
  };

  // The loader is intentionally recreated with the selected sort/cursor state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadPosts(true); }, [sort]);

  const toggle = async (post: Post, kind: 'like' | 'favorite') => {
    const key = kind === 'like' ? 'liked' : 'favorited';
    const countKey = kind === 'like' ? 'likeCount' : 'favoriteCount';
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, [key]: !item[key], [countKey]: item[countKey] + (item[key] ? -1 : 1) } : item));
    try {
      const response = await fetch(`/api/community/posts/${post.id}/${kind}`, { method: 'POST' });
      if (!response.ok) throw new Error('互动失败');
      const result = await response.json() as { active: boolean; count: number };
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, [key]: result.active, [countKey]: result.count } : item));
    } catch {
      setPosts((current) => current.map((item) => item.id === post.id ? post : item));
      setError('网络不稳定，互动没有保存');
    }
  };

  return (
    <main className="min-h-screen bg-[#FFF8F0] pb-28">
      <header className="sticky top-0 z-20 border-b border-orange-100 bg-[#FFF8F0]/95 px-4 py-3 backdrop-blur">
        <h1 className="text-center text-xl font-black text-[#352B25]">啾啾社区</h1>
        <div className="mx-auto mt-3 flex max-w-xs rounded-2xl bg-white p-1 shadow-sm">
          {(['latest', 'hot'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setSort(item)} className={`min-h-10 flex-1 rounded-xl text-sm font-black ${sort === item ? 'bg-[#FF9F43] text-white' : 'text-[#8A7666]'}`}>
              {item === 'latest' ? '最新' : '热门'}
            </button>
          ))}
        </div>
      </header>

      {error && <p role="status" className="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <section className="mx-auto max-w-lg space-y-4 p-4">
        {!loading && posts.length === 0 && <div className="rounded-3xl bg-white p-10 text-center text-sm font-bold text-[#8A7666]">还没有帖子，发布第一首作品吧。</div>}
        {posts.map((post) => <PostCard key={post.id} post={post} onToggle={toggle} />)}
        {cursor && <button type="button" onClick={() => void loadPosts(false)} disabled={loading} className="min-h-12 w-full rounded-2xl bg-white text-sm font-black text-[#B96221]">{loading ? '加载中...' : '加载更多'}</button>}
      </section>

      <button type="button" onClick={() => setShowPublish(true)} aria-label="发布帖子" className="fixed bottom-24 right-5 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFAD57] to-[#F47B43] text-4xl font-light text-white shadow-xl">+</button>
      {showPublish && <PublishDialog userId={userId} onClose={() => setShowPublish(false)} onPublished={() => { setShowPublish(false); void loadPosts(true); }} />}
    </main>
  );
}

function PostCard({ post, onToggle }: { post: Post; onToggle: (post: Post, kind: 'like' | 'favorite') => void }) {
  return <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#F2E5D9]">
    <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DFF3EF] text-xl">🐦</div><div><p className="font-black text-[#4A3B32]">{post.author.displayName}</p><p className="text-xs text-[#A49488]">{relativeTime(post.createdAt)}</p></div></div>
    {post.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5C4D42]">{post.body}</p>}
    {post.media.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{post.media.map((url) => <img key={url} src={url} alt="帖子图片" className="aspect-square w-full rounded-xl object-cover" />)}</div>}
    {post.music && <div className="mt-3 rounded-2xl bg-[#FFF5E8] p-3"><audio controls preload="none" className="w-full" src={post.music.audioUrl ?? `/api/music/audio/${post.music.providerTaskId}`} /><p className="mt-1 text-xs font-bold text-[#A86A36]">我的 AI 音乐作品</p></div>}
    <div className="mt-4 flex items-center justify-between text-sm font-bold text-[#8A7666]">
      <div className="flex gap-4"><button type="button" onClick={() => onToggle(post, 'like')} className={post.liked ? 'text-[#E87824]' : ''}>♥ {post.likeCount}</button><button type="button" onClick={() => onToggle(post, 'favorite')} className={post.favorited ? 'text-[#E87824]' : ''}>★ {post.favoriteCount}</button><Link href={`/community/${post.id}`}>评论 {post.commentCount}</Link></div>
      <Link href={`/community/${post.id}`} className="text-[#C87835]">查看详情</Link>
    </div>
  </article>;
}

function PublishDialog({ userId, onClose, onPublished }: { userId: string | null; onClose: () => void; onPublished: () => void }) {
  const works = userId ? readWorkshopWorks(userId, 'server').filter((work) => work.status === 'saved' || work.status === 'published') : [];
  const [body, setBody] = useState('');
  const [media, setMedia] = useState('');
  const [providerTaskId, setProviderTaskId] = useState('');
  const [error, setError] = useState('');
  const submit = async () => {
    const response = await fetch('/api/community/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body, media: media.split(/\s+/).filter(Boolean), providerTaskId: providerTaskId || null }) });
    if (!response.ok) { const payload = await response.json() as { message?: string }; setError(payload.message ?? '发布失败'); return; }
    onPublished();
  };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0" onClick={onClose}><section className="w-full max-w-lg rounded-t-3xl bg-[#FFF9F2] p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-[#352B25]">发布帖子</h2><button type="button" onClick={onClose} className="text-2xl text-[#8A7666]">×</button></div><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="分享你的创作心情..." className="min-h-28 w-full rounded-2xl border border-[#F0E5DA] bg-white p-3 outline-none" /><input value={media} onChange={(event) => setMedia(event.target.value)} placeholder="图片地址，可填写多个，用空格分隔" className="mt-3 min-h-12 w-full rounded-2xl border border-[#F0E5DA] bg-white px-3 outline-none" /><select value={providerTaskId} onChange={(event) => setProviderTaskId(event.target.value)} className="mt-3 min-h-12 w-full rounded-2xl border border-[#F0E5DA] bg-white px-3"><option value="">不附加音乐</option>{works.map((work) => <option key={work.id} value={work.taskId ?? ''} disabled={!work.taskId}>{work.title}{work.taskId ? '' : '（旧作品暂不可关联）'}</option>)}</select>{error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}<button type="button" onClick={() => void submit()} className="mt-4 min-h-13 w-full rounded-2xl bg-[#FF9F43] font-black text-white">发布</button></section></div>;
}

function relativeTime(value: string) { const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return '刚刚'; if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`; if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`; return `${Math.floor(seconds / 86400)} 天前`; }
