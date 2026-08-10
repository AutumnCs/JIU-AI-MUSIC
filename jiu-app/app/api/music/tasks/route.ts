import { NextResponse } from 'next/server';

import { getCurrentUserFromRequest } from '@/lib/server/auth';
import { listMusicTasks } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { user } = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = await listMusicTasks(user.id);
  return NextResponse.json({
    works: tasks
      .filter((task) => task.status === 'success' && task.audioUrl)
      .map((task) => ({
        id: task.id,
        taskId: task.providerTaskId,
        title: titleFromRequest(task.requestPayload),
        status: 'saved' as const,
        audio: task.audioUrl,
        genre: stringValue(task.requestPayload.genre) ?? 'pop',
        mood: stringValue(task.requestPayload.mood) ?? 'happy',
        lyrics: task.lyrics ?? '',
        createdAt: task.createdAt,
        sourceProvider: 'upstream' as const,
      })),
  });
}

function titleFromRequest(payload: Record<string, unknown>): string {
  return stringValue(payload.title) ?? stringValue(payload.prompt) ?? stringValue(payload.text) ?? '我的 AI 音乐';
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
