'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { AuthUser } from '@/lib/auth/types';
import { useGlobalStore } from '@/stores/globalStore';

type Work = { id: string; taskId: string; title: string; audio: string; genre: string; mood: string; createdAt: string };
type Notification = { id: string; type: string; actorName: string; createdAt: string };

export default function MePage() {
  const router = useRouter();
  const { authState, fragments, unlockedBirds, setUser, setAuthState } = useGlobalStore();
  const [works, setWorks] = useState<Work[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(authState.user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(authState.user?.displayName ?? '');
  }, [authState.user?.displayName]);
  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/music/tasks');
        const payload = await response.json() as { works?: Work[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? '作品加载失败');
        setWorks(payload.works ?? []);
      } catch (cause) { setError(cause instanceof Error ? cause.message : '作品暂时无法加载'); }
    })();
    void (async () => {
      const response = await fetch('/api/community/notifications');
      if (response.ok) setNotifications((await response.json() as { notifications?: Notification[] }).notifications ?? []);
    })();
  }, []);

  const saveName = async () => {
    const nextName = name.trim();
    if (!nextName || nextName.length > 24) { setError('名字需要 1 到 24 个字符'); return; }
    await saveProfile({ displayName: nextName });
    setEditingName(false);
  };
  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setSaving(true); setError('');
    try {
      const form = new FormData(); form.append('file', file);
      const uploadResponse = await fetch('/api/community/media', { method: 'POST', body: form });
      const uploadPayload = await uploadResponse.json() as { url?: string; message?: string };
      if (!uploadResponse.ok || !uploadPayload.url) throw new Error(uploadPayload.message ?? '头像上传失败');
      await saveProfile({ avatarUrl: uploadPayload.url });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '头像上传失败'); } finally { setSaving(false); }
  };
  const saveProfile = async (input: { displayName?: string; avatarUrl?: string }) => {
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/me', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
      const payload = await response.json() as { user?: AuthUser; error?: string };
      if (!response.ok || !payload.user) throw new Error(payload.error ?? '保存失败');
      setUser(payload.user);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败'); throw cause; } finally { setSaving(false); }
  };

  const logout = async () => {
    setSaving(true);
    setError('');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthState({ user: null, session: null, source: 'server' });
      router.replace('/login?next=/me');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '退出登录失败');
    } finally {
      setSaving(false);
    }
  };

  const user = authState.user;
  const displayName = user?.displayName ?? (user?.type === 'guest' ? '游客创作者' : '啾啾音乐人');
  return <main className="jiu-page me-page px-4">
    <header className="jiu-header -mx-4 flex flex-row-reverse items-center gap-3 px-4">
      <button type="button" onClick={() => fileInput.current?.click()} className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#DFF3EF] text-2xl shadow-md" aria-label="修改头像">
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="我的头像" className="h-full w-full object-cover" /> : '🐦'}
        <span className="absolute inset-x-0 bottom-0 bg-[#2C3E50]/75 py-0.5 text-center text-[9px] font-bold text-white">修改</span>
      </button>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold tracking-[0.18em] text-[#A77950]">JIU CREATOR SPACE</p><div className="mt-1 flex items-center gap-2"><h1 className="truncate text-[22px] font-black text-[#263746]">{displayName}</h1><button type="button" onClick={() => setEditingName(true)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm shadow-sm" aria-label="编辑名字">✎</button></div><p className="mt-0.5 truncate text-xs text-[#75685D]">{user?.type === 'guest' ? '游客模式，作品会绑定到当前身份' : '啾啾音乐创作者'}</p></div>
    </header>

    {user?.type === 'guest' && <section className="mt-4 rounded-3xl border border-[#F2D1AD] bg-gradient-to-r from-[#FFF1D8] to-[#EAF5EA] p-4 shadow-sm"><p className="text-sm font-black text-[#4A3B32]">把这段创作旅程保存下来</p><p className="mt-1 text-xs leading-5 text-[#75685D]">注册邮箱账号后，作品、社区帖子和探索进度都不会丢。</p><Link href="/login?next=/me" className="mt-3 inline-flex min-h-11 items-center rounded-2xl bg-[#E47A24] px-4 text-sm font-black text-white">登录 / 注册账号</Link></section>}
    {user?.type === 'email' && <button type="button" disabled={saving} onClick={() => void logout()} className="mt-4 min-h-11 rounded-2xl border border-[#E8D5C2] bg-white px-4 text-sm font-black text-[#8A7666] shadow-sm">{saving ? '正在退出...' : '退出登录'}</button>}

    {editingName && <div className="jiu-card mt-4 p-4"><label className="text-xs font-bold text-[#75685D]" htmlFor="display-name">修改名字</label><div className="mt-2 flex gap-2"><input id="display-name" autoFocus value={name} maxLength={24} onChange={(event) => setName(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-2xl border border-[#E8D5C2] bg-white px-3 outline-none" /><button type="button" disabled={saving} onClick={() => void saveName()} className="rounded-2xl bg-[#FF9F43] px-4 text-sm font-black text-white">保存</button><button type="button" onClick={() => { setEditingName(false); setName(user?.displayName ?? ''); }} className="rounded-2xl bg-[#F0E9E1] px-3 text-sm font-bold text-[#75685D]">取消</button></div></div>}
    {error && <p role="status" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}

    <section className="mt-4 grid grid-cols-3 gap-2" aria-label="我的数据"><Stat label="我的作品" value={works.length} /><Stat label="已收集" value={unlockedBirds.length} /><Stat label="羽毛碎片" value={Object.values(fragments).reduce((sum, value) => sum + value, 0)} /></section>
    <section className="jiu-card mt-4 p-5"><div className="flex items-center justify-between"><h2 className="font-black text-[#352B25]">我的作品</h2><Link href="/workshop" className="text-sm font-bold text-[#C87835]">去工坊创作</Link></div>{works.length === 0 && <p className="mt-5 rounded-2xl bg-[#FFF8F0] p-4 text-center text-sm font-bold text-[#8A7666]">还没有云端作品，先去工坊写一首吧。</p>}<div className="mt-4 space-y-3">{works.map((work) => <article key={work.id} className="rounded-2xl bg-[#FFF8F0] p-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-black text-[#4A3B32]">{work.title}</h3><p className="mt-1 text-xs text-[#A49488]">{work.genre} · {work.mood}</p></div><span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#B96221]">已保存</span></div><audio controls preload="none" className="mt-3 w-full" src={work.audio} /><Link href={`/community?musicTaskId=${encodeURIComponent(work.taskId)}`} className="mt-2 inline-block text-xs font-black text-[#C87835]">发布到社区</Link></article>)}</div></section>
    <section className="jiu-card mt-4 p-5"><h2 className="font-black text-[#352B25]">消息中心</h2>{notifications.length === 0 ? <p className="mt-4 text-sm text-[#8A7666]">暂时没有新的互动消息。</p> : <div className="mt-3 space-y-2">{notifications.slice(0, 10).map((item) => <p key={item.id} className="rounded-xl bg-[#FFF8F0] px-3 py-2 text-sm text-[#5C4D42]">{item.actorName} {notificationText(item.type)}</p>)}</div>}</section>
    <section className="mt-4 grid grid-cols-2 gap-3"><Link href="/collection" className="jiu-card p-4 font-black text-[#4A3B32]">查看图鉴</Link><Link href="/community" className="jiu-card p-4 font-black text-[#4A3B32]">进入社区</Link></section>
  </main>;
}

function notificationText(type: string) { if (type === 'post_like') return '赞了你的帖子'; if (type === 'post_favorite') return '收藏了你的帖子'; if (type === 'comment_like') return '赞了你的评论'; if (type === 'comment_reply') return '回复了你的评论'; return '评论了你的帖子'; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="jiu-card p-3 text-center"><p className="text-xl font-black text-[#C87835]">{value}</p><p className="mt-1 text-xs font-bold text-[#8A7666]">{label}</p></div>; }
