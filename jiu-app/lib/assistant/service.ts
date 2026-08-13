import { createOpenAICompatibleProvider } from './api-provider.ts';
import { retrieveKnowledge, shouldAnswerWithMock } from './knowledge.ts';
import { createMockTutorProvider } from './mock-provider.ts';
import { getSafetyReply, isUnsafeForChildren } from './safety.ts';
import { buildTutorHistory, pruneMemory } from './memory.ts';
import type { AgentReply, MemoryItem, TutorRequest } from './types.ts';

export interface AssistantEnvironment { ASSISTANT_API_KEY?: string; ASSISTANT_BASE_URL?: string; ASSISTANT_MODEL?: string; ASSISTANT_PROVIDER?: string }

export async function answerWithTutor(request: TutorRequest, environment: AssistantEnvironment = process.env as AssistantEnvironment): Promise<AgentReply> {
  if (isUnsafeForChildren(request.message)) return getSafetyReply();
  const selected = getTutorProvider(request, environment);
  try { return await selected.provider.chat(selected.request); } catch { return createMockTutorProvider().chat(selected.request); }
}

export function getTutorProvider(request: TutorRequest, environment: AssistantEnvironment = process.env as AssistantEnvironment) {
  const groundedRequest = prepareRequest(request);
  if (isUnsafeForChildren(request.message) || shouldAnswerWithMock(request.message, request.context)) return { provider: createMockTutorProvider(), request: groundedRequest };
  if (environment.ASSISTANT_API_KEY && environment.ASSISTANT_BASE_URL && environment.ASSISTANT_PROVIDER !== 'mock') return { provider: createOpenAICompatibleProvider({ apiKey: environment.ASSISTANT_API_KEY, baseUrl: environment.ASSISTANT_BASE_URL, model: environment.ASSISTANT_MODEL || 'qwen-plus', timeoutMs: 25000 }), request: groundedRequest };
  return { provider: createMockTutorProvider(), request: groundedRequest };
}

function prepareRequest(request: TutorRequest): TutorRequest {
  const recentMessages = buildTutorHistory(request.recentMessages ?? request.history);
  const learningSummary = pruneMemory(request.learningSummary ?? request.memory ?? []);
  return { ...request, history: recentMessages, recentMessages, learningSummary, memory: learningSummary, knowledge: retrieveKnowledge(request.message, request.context, 3) };
}

export function validateTutorRequest(value: unknown): { ok: true; request: TutorRequest } | { ok: false; message: string } {
  if (!value || typeof value !== 'object') return { ok: false, message: '请求格式不正确' };
  const body = value as Record<string, unknown>;
  if (typeof body.message !== 'string' || !body.message.trim()) return { ok: false, message: '请先写下你的音乐问题' };
  if (body.message.length > 500) return { ok: false, message: '问题有点长，我们分成小问题来学吧' };
  const history = Array.isArray(body.history) ? body.history : [];
  const safeHistory = history.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    return (record.role === 'user' || record.role === 'assistant') && typeof record.content === 'string' ? [{ role: record.role, content: record.content.slice(0, 1000) } as const] : [];
  });
  const context = body.context && typeof body.context === 'object' ? body.context : { page: 'home' };
  const page = (context as Record<string, unknown>).page;
  const safePage = page === 'academy' || page === 'workshop' || page === 'collection' || page === 'community' ? page : 'home';
  const memory = Array.isArray(body.memory) ? body.memory.filter(isMemoryItem) : [];
  const promptMeta = isPromptMeta(body.promptMeta) ? body.promptMeta : undefined;
  return { ok: true, request: { message: body.message.trim(), history: buildTutorHistory(safeHistory), recentMessages: buildTutorHistory(safeHistory), learningSummary: pruneMemory(memory), memory: pruneMemory(memory), promptMeta, context: { ...(context as TutorRequest['context']), page: safePage } } };
}

function isMemoryItem(item: unknown): item is MemoryItem { return Boolean(item && typeof item === 'object' && typeof (item as MemoryItem).topic === 'string' && typeof (item as MemoryItem).summary === 'string' && typeof (item as MemoryItem).confidence === 'number' && typeof (item as MemoryItem).importance === 'number' && typeof (item as MemoryItem).lastUsedAt === 'number' && typeof (item as MemoryItem).createdAt === 'number'); }
function isPromptMeta(item: unknown): item is NonNullable<TutorRequest['promptMeta']> {
  if (!item || typeof item !== 'object') return false;
  const record = item as Record<string, unknown>;
  return (record.topic === undefined || typeof record.topic === 'string') && (record.intent === undefined || ['explain', 'example', 'practice', 'hint', 'review'].includes(String(record.intent)));
}
