import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { createMusicTaskRecord } from '@/lib/server/db';
import { loadCredentials } from '@/lib/volcengine/sign';
import { submitGenBGMForTime, submitGenSongForTime, VolcApiError } from '@/lib/volcengine/gensong';

export const runtime = 'nodejs';

type CreateBody = {
  track?: 'vocal' | 'instrumental';
  instrumental?: boolean;
  text?: string;
  lyrics?: string;
  prompt?: string;
  duration?: number;
  genre?: string;
  mood?: string;
  gender?: 'Female' | 'Male';
  timbre?: string;
  instruments?: string[];
  modelVersion?: 'v4.0' | 'v4.3' | 'v5.0';
  lang?: string;
  vodFormat?: 'wav' | 'mp3';
  callbackUrl?: string;
};

export async function POST(request: NextRequest) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return jsonError('unauthorized', '请先创建游客身份', 401);

  let body: CreateBody;
  try {
    body = await request.json() as CreateBody;
  } catch {
    return jsonError('bad_request', '请求内容不是有效 JSON', 400);
  }

  const track = body.track ?? (body.instrumental ? 'instrumental' : 'vocal');
  if (track !== 'vocal' && track !== 'instrumental') return jsonError('bad_request', '音乐类型无效', 400);
  if (body.instruments && (!Array.isArray(body.instruments) || body.instruments.length > 2)) return jsonError('bad_request', '最多选择两种主乐器', 400);

  let credentials;
  try {
    credentials = loadCredentials(runtimeEnv());
  } catch {
    return jsonError('missing_credentials', '音乐服务尚未配置', 503);
  }

  try {
    const submit = track === 'instrumental'
      ? await submitInstrumental(body, credentials)
      : await submitVocal(body, credentials);
    await createMusicTaskRecord({
      userId: auth.user.id,
      providerTaskId: submit.taskId,
      track,
      requestPayload: body as Record<string, unknown>,
    });
    return NextResponse.json({ taskId: submit.taskId, predictedWaitTime: submit.predictedWaitTime, track });
  } catch (error) {
    if (error instanceof InputError) return jsonError('bad_request', error.message, 400);
    if (error instanceof VolcApiError) return jsonError('provider_error', providerMessage(error.code), 502, { code: error.code, requestId: error.requestId });
    return jsonError('internal', '音乐生成失败，请稍后再试', 500);
  }
}

async function submitInstrumental(body: CreateBody, credentials: ReturnType<typeof loadCredentials>) {
  const text = body.text?.trim() || body.prompt?.trim();
  if (!text) throw new InputError('伴奏需要填写音乐描述');
  validateText(text, '音乐描述');
  return submitGenBGMForTime({ text, duration: body.duration, instruments: body.instruments, callbackUrl: body.callbackUrl }, credentials);
}

async function submitVocal(body: CreateBody, credentials: ReturnType<typeof loadCredentials>) {
  const lyrics = body.lyrics?.trim();
  const prompt = body.prompt?.trim() || body.text?.trim();
  if (!lyrics && !prompt) throw new InputError('人声歌曲需要填写歌词或创作描述');
  validateText(lyrics || prompt!, lyrics ? '歌词' : '创作描述');
  return submitGenSongForTime({ lyrics, prompt, duration: body.duration, genre: body.genre, mood: body.mood, gender: body.gender, timbre: body.timbre, instruments: body.instruments, modelVersion: body.modelVersion, lang: body.lang, vodFormat: body.vodFormat }, credentials);
}

class InputError extends Error {}

function validateText(value: string, label: string) {
  const length = Array.from(value).length;
  if (length < 5) throw new InputError(`${label}至少需要 5 个字符`);
  if (length > 2000) throw new InputError(`${label}不能超过 2000 个字符`);
}

function providerMessage(code: number) {
  if ([300061, 300062].includes(code)) return '歌词可能涉及版权，请换一种表达再试';
  if ([300063, 300064].includes(code)) return '歌词里有不适合的内容，请修改后再试';
  if ([200022, 200023, 400040].includes(code)) return '今天创作的小鸟有点忙，请稍后再试';
  return '小鸟累了，请稍后再试';
}

function runtimeEnv() {
  try {
    const context = getCloudflareContext();
    return { ...process.env, ...(context.env as Record<string, string | undefined>) };
  } catch {
    return process.env;
  }
}

function jsonError(error: string, message: string, status: number, detail?: Record<string, unknown>) {
  return NextResponse.json({ error, message, ...(detail ? { detail } : {}) }, { status });
}
