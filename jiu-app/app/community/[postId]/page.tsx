'use client';
/* Community media is user-provided and stored outside Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Comment = { id: string; userId: string; author: { displayName: string }; parentId: string | null; replyToUserId: string | null; replyToDisplayName?: string; body: string; likeCount: number; liked: boolean; createdAt: string; replies?: Comment[] };
type Post = { id: string; userId: string; author: { displayName: string }; body: string; media: string[]; music: { title?: string; audioUrl: string | null; providerTaskId: string } | null; likeCount: number; favoriteCount: number; commentCount: number; liked: boolean; favorited: boolean };

export default function CommunityPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => { void (async () => {
    const id = (await params).postId;
    const response = await fetch(`/api/community/posts/${id}`);
    const payload = await response.json() as { post?: Post; comments?: Comment[]; message?: string };
    if (!response.ok) { setError(payload.message ?? '帖子不存在'); return; }
    setPost(payload.post ?? null); setComments(tree(payload.comments ?? []));
    const me = await fetch('/api/me');
    if (me.ok) setCurrentUserId(((await me.json()) as { user?: { id?: string } }).user?.id ?? '');
  })(); }, [params]);

  const togglePost = async (kind: 'like' | 'favorite') => {
    if (!post) return;
    const activeKey = kind === 'like' ? 'liked' : 'favorited';
    const countKey = kind === 'like' ? 'likeCount' : 'favoriteCount';
    const previous = post[activeKey];
    setPost({ ...post, [activeKey]: !previous, [countKey]: post[countKey] + (previous ? -1 : 1) });
    try {
      const response = await fetch(`/api/community/posts/${post.id}/${kind}`, { method: 'POST' });
      if (!response.ok) throw new Error();
      const result = await response.json() as { active: boolean; count: number };
      setPost((current) => current ? { ...current, [activeKey]: result.active, [countKey]: result.count } : current);
    } catch { setPost(post); setError('互动没有保存，请重试'); }
  };

  const addComment = async () => {
    if (!body.trim() || !post) return;
    const response = await fetch(`/api/community/posts/${post.id}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body, parentId: replyTo?.id ?? null, replyToUserId: replyTo?.userId ?? null }) });
    const payload = await response.json() as { comment?: Comment; message?: string };
    if (!response.ok || !payload.comment) { setError(payload.message ?? '评论失败'); return; }
    setComments((current) => tree([...flatten(current), payload.comment!])); setPost({ ...post, commentCount: post.commentCount + 1 }); setBody(''); setReplyTo(null);
  };

  if (error && !post) return <main className="p-6 text-center text-red-600">{error}</main>;
  if (!post) return <main className="p-6 text-center text-[#8A7666]">加载中...</main>;
  return <main className="min-h-screen bg-[#FFF8F0] pb-32">
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-orange-100 bg-[#FFF8F0]/95 px-4 py-4 backdrop-blur"><Link href="/community" className="text-2xl">‹</Link><h1 className="text-xl font-black">帖子详情</h1></header>
    <article className="mx-auto max-w-lg p-4"><div className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DFF3EF] text-xl">🐦</div><div><p className="font-black">{post.author.displayName}</p><p className="text-xs text-[#A49488]">作品分享</p></div></div><p className="mt-4 whitespace-pre-wrap leading-8 text-[#5C4D42]">{post.body}</p>{post.media.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2">{post.media.map((url) => <img key={url} src={url} alt="帖子图片" className="max-h-96 w-full rounded-2xl object-cover" />)}</div>}{post.music && <div className="mt-4 rounded-2xl bg-[#FFF5E8] p-3"><p className="mb-2 font-black text-[#8A542B]">{post.music.title ?? '我的 AI 音乐作品'}</p><audio controls className="w-full" src={post.music.audioUrl ?? `/api/music/audio/${post.music.providerTaskId}`} /></div>}<div className="mt-5 flex gap-5 border-t border-orange-50 pt-4 text-sm font-bold text-[#8A7666]"><button type="button" onClick={() => void togglePost('like')} className={post.liked ? 'text-[#E87824]' : ''}>♥ {post.likeCount}</button><button type="button" onClick={() => void togglePost('favorite')} className={post.favorited ? 'text-[#E87824]' : ''}>★ {post.favoriteCount}</button><span>评论 {post.commentCount}</span></div></div>
      <section className="mt-4 rounded-3xl bg-white p-5"><h2 className="font-black">评论</h2><div className="mt-4 space-y-4">{comments.map((comment) => <CommentItem key={comment.id} comment={comment} currentUserId={currentUserId} canManage={post.userId === currentUserId} onReply={setReplyTo} onChanged={(id, update) => setComments((current) => updateComment(id, update, current))} onDeleted={(id) => setComments((current) => removeComment(id, current))} />)}</div></section></article>
    <div className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-lg gap-2 border-t border-orange-100 bg-[#FFF9F2] p-3"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? `回复 ${replyTo.author.displayName}` : '说点什么...'} className="min-h-12 flex-1 rounded-2xl bg-white px-4 outline-none" /><button type="button" onClick={() => void addComment()} className="rounded-2xl bg-[#FF9F43] px-5 font-black text-white">发送</button></div>
  </main>;
}

function CommentItem({ comment, currentUserId, canManage, onReply, onChanged, onDeleted }: { comment: Comment; currentUserId: string; canManage: boolean; onReply: (comment: Comment) => void; onChanged: (id: string, update: (comment: Comment) => Comment) => void; onDeleted: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visibleReplies = expanded ? comment.replies ?? [] : (comment.replies ?? []).slice(0, 3);
  const toggleLike = async () => { const response = await fetch(`/api/community/comments/${comment.id}/like`, { method: 'POST' }); if (!response.ok) return; const result = await response.json() as { active: boolean; count: number }; onChanged(comment.id, (item) => ({ ...item, liked: result.active, likeCount: result.count })); };
  const deleteComment = async () => { if (!window.confirm('确定删除这条评论吗？')) return; const response = await fetch(`/api/community/comments/${comment.id}`, { method: 'DELETE' }); if (response.ok) onDeleted(comment.id); };
  return <div className="rounded-2xl bg-[#FFF9F2] p-3"><div className="flex justify-between gap-3 text-sm"><b>{comment.author.displayName}{comment.replyToDisplayName ? ` 回复 ${comment.replyToDisplayName}` : ''}</b><span className="text-xs text-[#A49488]">{relativeTime(comment.createdAt)}</span></div><p className="mt-2 text-sm leading-6">{comment.body}</p><div className="mt-2 flex gap-4 text-xs font-bold text-[#C87835]"><button type="button" onClick={() => void toggleLike()} className={comment.liked ? 'text-[#E87824]' : ''}>♥ {comment.likeCount}</button><button type="button" onClick={() => onReply(comment)}>回复</button>{(comment.userId === currentUserId || canManage) && <button type="button" onClick={() => void deleteComment()}>删除</button>}</div>{(comment.replies?.length ?? 0) > 0 && <div className="mt-3 space-y-2 border-l-2 border-[#F2D1AD] pl-3">{visibleReplies.map((reply) => <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} canManage={canManage} onReply={onReply} onChanged={onChanged} onDeleted={onDeleted} />)}{(comment.replies?.length ?? 0) > 3 && <button type="button" onClick={() => setExpanded((value) => !value)} className="text-xs font-bold text-[#C87835]">{expanded ? '收起回复' : `展开更多回复（${comment.replies!.length - 3}）`}</button>}</div>}</div>;
}

function updateComment(id: string, update: (comment: Comment) => Comment, records: Comment[] = []): Comment[] { return records.map((item) => item.id === id ? update(item) : { ...item, replies: updateComment(id, update, item.replies ?? []) }); }
function removeComment(id: string, records: Comment[] = []): Comment[] { return records.filter((item) => item.id !== id).map((item) => ({ ...item, replies: removeComment(id, item.replies ?? []) })); }
function tree(records: Comment[]): Comment[] { const map = new Map(records.map((item) => [item.id, { ...item, replies: [] as Comment[] }])); const roots: Comment[] = []; for (const item of map.values()) { const parent = item.parentId ? map.get(item.parentId) : null; if (parent) parent.replies!.push(item); else roots.push(item); } return roots; }
function flatten(records: Comment[]): Comment[] { return records.flatMap((item) => [item, ...flatten(item.replies ?? [])]); }
function relativeTime(value: string) { const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return '刚刚'; if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`; if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`; return `${Math.floor(seconds / 86400)} 天前`; }
