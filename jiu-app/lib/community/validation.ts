export type PostInput = { body: string; media: string[]; providerTaskId: string | null };

export type CommentRecord = {
  id: string;
  parentId: string | null;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
  likeCount: number;
};

export type CommentNode = CommentRecord & { replies: CommentNode[] };

export function validatePostInput(input: PostInput): { ok: true } | { ok: false; message: string } {
  const body = input.body.trim();
  if (!body && input.media.length === 0 && !input.providerTaskId) return { ok: false, message: '帖子至少需要文字、图片或音乐' };
  if (body.length > 2000) return { ok: false, message: '帖子正文不能超过 2000 个字符' };
  if (input.media.length > 9) return { ok: false, message: '最多上传 9 张图片' };
  if (input.media.some((url) => !isAllowedMediaUrl(url))) return { ok: false, message: '图片地址无效' };
  return { ok: true };
}

function isAllowedMediaUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^\/api\/community\/media\/[A-Za-z0-9._-]+$/.test(url);
}

export function buildCommentTree(records: CommentRecord[]): CommentNode[] {
  const nodes = new Map(records.map((record) => [record.id, { ...record, replies: [] as CommentNode[] }]));
  const roots: CommentNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}
