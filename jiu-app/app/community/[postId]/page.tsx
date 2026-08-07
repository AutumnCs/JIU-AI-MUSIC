'use client';
/* User-provided media URLs are intentionally rendered without a fixed image loader. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Comment = { id: string; userId: string; author: { displayName: string }; parentId: string | null; body: string; likeCount: number; liked: boolean; createdAt: string; replies?: Comment[] };
type Post = { id: string; author: { displayName: string }; body: string; media: string[]; music: { audioUrl: string | null; providerTaskId: string } | null; likeCount: number; favoriteCount: number; liked: boolean; favorited: boolean };

export default function CommunityPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { void (async () => { const id = (await params).postId; const response = await fetch(`/api/community/posts/${id}`); const payload = await response.json() as { post?: Post; comments?: Comment[]; message?: string }; if (!response.ok) { setError(payload.message ?? '帖子不存在'); return; } setPost(payload.post ?? null); setComments(tree(payload.comments ?? [])); })(); }, [params]);
  const addComment = async () => { if (!body.trim() || !post) return; const response = await fetch(`/api/community/posts/${post.id}/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body, parentId: replyTo?.id ?? null, replyToUserId: replyTo?.userId ?? null }) }); const payload = await response.json() as { comment?: Comment; message?: string }; if (!response.ok) { setError(payload.message ?? '评论失败'); return; } setComments((current) => tree([...flatten(current), payload.comment!])); setBody(''); setReplyTo(null); };
  if (error) return <main className="p-6 text-center text-red-600">{error}</main>;
  if (!post) return <main className="p-6 text-center text-[#8A7666]">加载中...</main>;
  return <main className="min-h-screen bg-[#FFF8F0] pb-32"><header className="sticky top-0 z-20 flex items-center gap-4 border-b border-orange-100 bg-[#FFF8F0]/95 px-4 py-4 backdrop-blur"><Link href="/community" className="text-2xl">‹</Link><h1 className="text-xl font-black">帖子详情</h1></header><article className="mx-auto max-w-lg p-4"><div className="rounded-3xl bg-white p-5 shadow-sm"><p className="font-black">{post.author.displayName}</p><p className="mt-4 whitespace-pre-wrap leading-8 text-[#5C4D42]">{post.body}</p>{post.media.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2">{post.media.map((url) => <img key={url} src={url} alt="帖子图片" className="rounded-2xl" />)}</div>}{post.music && <audio controls className="mt-4 w-full" src={post.music.audioUrl ?? `/api/music/audio/${post.music.providerTaskId}`} />}</div><section className="mt-4 rounded-3xl bg-white p-5"><h2 className="font-black">评论</h2><div className="mt-4 space-y-4">{comments.map((comment) => <CommentItem key={comment.id} comment={comment} onReply={setReplyTo} />)}</div></section></article><div className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-lg gap-2 border-t border-orange-100 bg-[#FFF9F2] p-3"><input value={body} onChange={(event) => setBody(event.target.value)} placeholder={replyTo ? `回复 ${replyTo.author.displayName}` : '说点什么...'} className="min-h-12 flex-1 rounded-2xl bg-white px-4 outline-none" /><button type="button" onClick={() => void addComment()} className="rounded-2xl bg-[#FF9F43] px-5 font-black text-white">发送</button></div></main>;
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: (comment: Comment) => void }) { return <div className="rounded-2xl bg-[#FFF9F2] p-3"><div className="flex justify-between text-sm"><b>{comment.author.displayName}</b><span className="text-[#A49488]">{comment.likeCount} 赞</span></div><p className="mt-2 text-sm leading-6">{comment.body}</p><button type="button" onClick={() => onReply(comment)} className="mt-2 text-xs font-bold text-[#C87835]">回复</button>{comment.replies && comment.replies.length > 0 && <div className="mt-3 space-y-2 border-l-2 border-[#F2D1AD] pl-3">{comment.replies.map((reply) => <CommentItem key={reply.id} comment={reply} onReply={onReply} />)}</div>}</div>; }
function tree(records: Comment[]): Comment[] { const map = new Map(records.map((item) => [item.id, { ...item, replies: [] as Comment[] }])); const roots: Comment[] = []; for (const item of map.values()) { const parent = item.parentId ? map.get(item.parentId) : null; if (parent) parent.replies!.push(item); else roots.push(item); } return roots; }
function flatten(records: Comment[]): Comment[] { return records.flatMap((item) => [item, ...flatten(item.replies ?? [])]); }
