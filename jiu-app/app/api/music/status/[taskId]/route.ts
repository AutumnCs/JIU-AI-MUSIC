import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { findMusicTaskRecord, updateMusicTaskRecord } from '@/lib/server/db';
import { querySong, STATUS_FAILED, STATUS_RUNNING, STATUS_SUCCESS, VolcApiError } from '@/lib/volcengine/gensong';
import { loadCredentials } from '@/lib/volcengine/sign';
import { isR2Binding, persistAudioToR2 } from '@/lib/volcengine/r2';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const auth = await getCurrentUserFromRequest(request);
  if (!auth.user) return error('unauthorized', '请先创建游客身份', 401);
  const { taskId } = await params;
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(taskId)) return error('bad_request', '任务编号无效', 400);

  const task = await findMusicTaskRecord(taskId, auth.user.id);
  if (!task) return error('not_found', '找不到这个音乐任务', 404);
  if (task.status === 'success' || task.status === 'failed') return NextResponse.json(toResponse(task));

  let credentials;
  try {
    credentials = loadCredentials(runtimeEnv());
  } catch {
    return error('missing_credentials', '音乐服务尚未配置', 503);
  }

  try {
    const result = await querySong(taskId, credentials);
    let audioUrl = result.audioUrl ?? task.audioUrl;
    if (result.status === STATUS_SUCCESS && result.audioUrl) {
      const bucket = getR2Bucket();
      const persisted = await persistAudioToR2(bucket, result.audioUrl, taskId);
      audioUrl = persisted.url;
    }
    const updated = await updateMusicTaskRecord(taskId, auth.user.id, {
      status: statusName(result.status),
      progress: result.progress,
      audioUrl,
      lyrics: result.lyrics,
      failureCode: result.failureReason?.code ?? null,
      failureMessage: result.failureReason?.msg ?? null,
    });
    return NextResponse.json(updated ? toResponse(updated) : { taskId, status: statusName(result.status), progress: result.progress, audioUrl });
  } catch (err) {
    if (err instanceof VolcApiError) return error('provider_error', '小鸟累了，请稍后再试', 502, { code: err.code, requestId: err.requestId });
    return error('internal', '查询音乐任务失败，请稍后再试', 500);
  }
}

function toResponse(task: { providerTaskId: string; status: string; progress: number; audioUrl: string | null; lyrics: string | null; failureCode: number | null; failureMessage: string | null }) {
  return { taskId: task.providerTaskId, status: task.status, progress: task.progress, audioUrl: task.audioUrl ?? undefined, lyrics: task.lyrics ?? undefined, failureReason: task.failureCode === null ? null : { code: task.failureCode, msg: task.failureMessage ?? '' } };
}

function statusName(status: number) {
  if (status === STATUS_SUCCESS) return 'success' as const;
  if (status === STATUS_FAILED) return 'failed' as const;
  if (status === STATUS_RUNNING) return 'running' as const;
  return 'pending' as const;
}

function getR2Bucket() {
  try {
    const env = getCloudflareContext().env as { MUSIC_BUCKET?: unknown };
    return isR2Binding(env.MUSIC_BUCKET) ? env.MUSIC_BUCKET : null;
  } catch {
    return null;
  }
}

function runtimeEnv() {
  try {
    const context = getCloudflareContext();
    return { ...process.env, ...(context.env as Record<string, string | undefined>) };
  } catch {
    return process.env;
  }
}

function error(errorCode: string, message: string, status: number, detail?: Record<string, unknown>) {
  return NextResponse.json({ error: errorCode, message, ...(detail ? { detail } : {}) }, { status });
}
