'use client';
/* Community media is user-provided and stored outside Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';

type Post = {
  id: string;
  userId: string;
  author: { id: string; displayName: string; avatarUrl?: string };
  body: string;
  media: string[];
  music: { title?: string; providerTaskId: string; audioUrl: string | null } | null;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  liked: boolean;
  favorited: boolean;
  createdAt: string;
};

type Work = { id: string; taskId: string; title: string; audio: string; genre: string; mood: string };

export default function CommunityPage() {
  const [initialTaskId, setInitialTaskId] = useState('');
  const [sort, setSort] = useState<'latest' | 'hot'>('latest');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [error, setError] = useState('');
  const loadingMore = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadPosts = async (reset: boolean) => {
    if (!reset && (loadingMore.current || !cursor)) return;
    loadingMore.current = true;
    setLoading(true);
    try {
      const query = new URLSearchParams({ sort, limit: '12' });
      if (!reset && cursor) query.set('cursor', cursor);
      const response = await fetch(`/api/community/posts?${query}`);
      const payload = await response.json() as { posts?: Post[]; nextCursor?: string | null; message?: string };
      if (!response.ok) throw new Error(payload.message ?? '加载失败');
      setPosts((current) => reset ? payload.posts ?? [] : [...current, ...(payload.posts ?? [])]);
      setCursor(payload.nextCursor ?? null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '社区暂时无法加载');
    } finally {
      loadingMore.current = false;
      setLoading(false);
    }
  };

  useEffect(() => { void loadPosts(true); }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setInitialTaskId(new URLSearchParams(window.location.search).get('musicTaskId') ?? ''); }, []);
  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/music/tasks');
      if (response.ok) setWorks((await response.json() as { works?: Work[] }).works ?? []);
    })();
  }, []);
  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void loadPosts(false); }, { rootMargin: '240px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (post: Post, kind: 'like' | 'favorite') => {
    const activeKey = kind === 'like' ? 'liked' : 'favorited';
    const countKey = kind === 'like' ? 'likeCount' : 'favoriteCount';
    const previous = post[activeKey];
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, [activeKey]: !previous, [countKey]: item[countKey] + (previous ? -1 : 1) } : item));
    try {
      const response = await fetch(`/api/community/posts/${post.id}/${kind}`, { method: 'POST' });
      if (!response.ok) throw new Error('互动失败');
      const result = await response.json() as { active: boolean; count: number };
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, [activeKey]: result.active, [countKey]: result.count } : item));
    } catch {
      setPosts((current) => current.map((item) => item.id === post.id ? post : item));
      setError('网络不稳定，互动没有保存');
    }
  };

  return <main className="jiu-page">
    <PageHeader eyebrow="JIU COMMUNITY" title="啾啾社区" subtitle="分享你的音乐作品，听听大家的灵感" />
    <div className="jiu-tab-bar mx-4 mt-3 flex rounded-2xl bg-white/80 p-1 shadow-sm">
      {(['latest', 'hot'] as const).map((item) => <button key={item} type="button" onClick={() => setSort(item)} className={`min-h-10 flex-1 rounded-xl text-sm font-black ${sort === item ? 'bg-[#FF9F43] text-white' : 'text-[#8A7666]'}`}>{item === 'latest' ? '最新' : '热门'}</button>)}
    </div>
    {error && <p role="status" className="mx-4 mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
    <section className="mx-auto max-w-lg space-y-4 p-4">
      {!loading && posts.length === 0 && <div className="rounded-3xl bg-white p-10 text-center text-sm font-bold text-[#8A7666]">还没有帖子，发布第一首作品吧。</div>}
      {posts.map((post) => <PostCard key={post.id} post={post} onToggle={toggle} />)}
      <div ref={sentinel} className="h-8 text-center text-xs font-bold text-[#A49488]">{loading && posts.length > 0 ? '加载中...' : cursor ? '继续下滑加载更多' : ''}</div>
    </section>
    <button type="button" onClick={() => setShowPublish(true)} aria-label="发布帖子" className="fixed bottom-24 right-5 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFAD57] to-[#F47B43] text-4xl font-light text-white shadow-xl">+</button>
    {showPublish && <PublishDialog works={works} initialTaskId={initialTaskId} onClose={() => setShowPublish(false)} onPublished={() => { setShowPublish(false); void loadPosts(true); }} />}
  </main>;
}

function PostCard({ post, onToggle }: { post: Post; onToggle: (post: Post, kind: 'like' | 'favorite') => void }) {
  const [expanded, setExpanded] = useState(false);
  return <article className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#F2E5D9]">
    <div className="flex items-center gap-3"><Link href={`/me?userId=${encodeURIComponent(post.userId)}`} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#DFF3EF] text-xl">{post.author.avatarUrl ? <img src={post.author.avatarUrl} alt="发布者头像" className="h-full w-full object-cover" /> : '🐦'}</Link><div><p className="font-black text-[#4A3B32]">{post.author.displayName}</p><p className="text-xs text-[#A49488]">{relativeTime(post.createdAt)}</p></div></div>
    {post.body && <div className="mt-3"><p className={`whitespace-pre-wrap text-sm leading-7 text-[#5C4D42] ${expanded ? '' : 'line-clamp-3'}`}>{post.body}</p>{post.body.split('\n').join('').length > 90 && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 text-xs font-black text-[#C87835]">{expanded ? '收起' : '展开'}</button>}</div>}
    {post.media.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{post.media.map((url) => <img key={url} src={url} alt="帖子图片" className="aspect-square w-full rounded-xl object-cover" />)}</div>}
    {post.music && <div className="mt-3 rounded-2xl bg-[#FFF5E8] p-3"><p className="mb-2 text-sm font-black text-[#8A542B]">{post.music.title ?? '我的 AI 音乐作品'}</p><audio controls preload="none" className="w-full" src={post.music.audioUrl ?? `/api/music/audio/${post.music.providerTaskId}`} /></div>}
    <div className="mt-4 flex items-center justify-between text-sm font-bold text-[#8A7666]"><div className="flex gap-4"><button type="button" onClick={() => onToggle(post, 'like')} className={post.liked ? 'text-[#E87824]' : ''}>♥ {post.likeCount}</button><button type="button" onClick={() => onToggle(post, 'favorite')} className={post.favorited ? 'text-[#E87824]' : ''}>★ {post.favoriteCount}</button><Link href={`/community/${post.id}`}>评论 {post.commentCount}</Link></div><Link href={`/community/${post.id}`} className="text-[#C87835]">查看详情</Link></div>
  </article>;
}

function PublishDialog({ works, initialTaskId, onClose, onPublished }: { works: Work[]; initialTaskId: string; onClose: () => void; onPublished: () => void }) {
  const [body, setBody] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [providerTaskId, setProviderTaskId] = useState(initialTaskId);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const upload = async (files: FileList | null) => {
    if (!files) return;
    if (media.length + files.length > 9) { setError('最多上传 9 张图片'); return; }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData(); form.append('file', file);
        const response = await fetch('/api/community/media', { method: 'POST', body: form });
        const payload = await response.json() as { url?: string; message?: string };
        if (!response.ok || !payload.url) throw new Error(payload.message ?? '图片上传失败');
        urls.push(payload.url);
      }
      setMedia((current) => [...current, ...urls]); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : '图片上传失败'); } finally { setUploading(false); }
  };
  const submit = async () => {
    if (!body.trim() && media.length === 0 && !providerTaskId) { setError('文字、图片和音乐至少选择一项'); return; }
    const response = await fetch('/api/community/posts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body, media, providerTaskId: providerTaskId || null }) });
    if (!response.ok) { const payload = await response.json() as { message?: string }; setError(payload.message ?? '发布失败'); return; }
    onPublished();
  };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0" onClick={onClose}><section className="w-full max-w-lg rounded-t-3xl bg-[#FFF9F2] p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-[#352B25]">发布帖子</h2><button type="button" onClick={onClose} className="text-2xl text-[#8A7666]">×</button></div><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="分享你的创作心情..." className="min-h-28 w-full rounded-2xl border border-[#F0E5DA] bg-white p-3 outline-none" /><label className="mt-3 block rounded-2xl border border-dashed border-[#E8C9A7] bg-white p-3 text-center text-sm font-bold text-[#B96221]"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(event) => void upload(event.target.files)} />{uploading ? '图片上传中...' : `添加图片（${media.length}/9）`}</label>{media.length > 0 && <div className="mt-2 grid grid-cols-4 gap-2">{media.map((url) => <img key={url} src={url} alt="已上传图片" className="aspect-square rounded-lg object-cover" />)}</div>}<select value={providerTaskId} onChange={(event) => setProviderTaskId(event.target.value)} className="mt-3 min-h-12 w-full rounded-2xl border border-[#F0E5DA] bg-white px-3"><option value="">不附加音乐</option>{works.map((work) => <option key={work.id} value={work.taskId}>{work.title}</option>)}</select>{error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}<button type="button" disabled={uploading} onClick={() => void submit()} className="mt-4 min-h-13 w-full rounded-2xl bg-[#FF9F43] font-black text-white disabled:opacity-50">发布</button></section></div>;
}

function relativeTime(value: string) { const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return '刚刚'; if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`; if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`; return `${Math.floor(seconds / 86400)} 天前`; }
