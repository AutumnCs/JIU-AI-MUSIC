import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse } from 'next/server';

import { getCurrentUserFromRequest } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { user } = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let input: { idea?: string; lyrics?: string; genre?: string; mood?: string };
  try { input = await request.json() as typeof input; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const idea = input.idea?.trim() ?? '';
  if (!idea && !input.lyrics?.trim()) return NextResponse.json({ error: 'A song idea is required' }, { status: 400 });
  const env = runtimeEnv();
  const title = env.ARK_API_KEY?.trim() ? await askArk(env, input) : localTitle(input);
  return NextResponse.json({ title, provider: env.ARK_API_KEY?.trim() ? 'ark' : 'template' });
}

async function askArk(env: Record<string, string | undefined>, input: { idea?: string; lyrics?: string; genre?: string; mood?: string }) {
  const prompt = `Give this child-friendly song exactly one short Chinese title, 2 to 12 Chinese characters. Do not add quotes, punctuation, explanation, or multiple options. Theme: ${input.idea?.trim() || input.lyrics?.trim().slice(0, 160)}. Genre: ${input.genre ?? 'pop'}. Mood: ${input.mood ?? 'happy'}.`;
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', { method: 'POST', headers: { authorization: `Bearer ${env.ARK_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: env.ARK_MODEL ?? 'ep-20250318183720-xxxxx', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 32 }) });
    if (!response.ok) return localTitle(input);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
    const title = payload.choices?.[0]?.message?.content;
    if (typeof title !== 'string') return localTitle(input);
    const cleaned = title.replace(/["“”「」《》'：:，,。.!！?？\n\r]/g, '').trim().slice(0, 24);
    return cleaned || localTitle(input);
  } catch { return localTitle(input); }
}

function localTitle(input: { idea?: string; genre?: string; mood?: string }) {
  const themes = ['星光小旅行', '云朵放歌', '风里的颜色', '月亮练习曲', '森林回声', '彩虹节拍', '小小发明家', '午后纸飞机'];
  const key = `${input.idea ?? ''}|${input.genre ?? ''}|${input.mood ?? ''}`;
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return themes[hash % themes.length];
}

function runtimeEnv() {
  try { return { ...process.env, ...(getCloudflareContext().env as Record<string, string | undefined>) }; } catch { return process.env; }
}
