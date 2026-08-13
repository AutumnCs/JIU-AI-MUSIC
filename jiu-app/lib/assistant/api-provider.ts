import type { MusicTutorProvider, SuggestedAction, TutorRequest } from './types.ts';

interface ApiOptions { apiKey: string; baseUrl: string; model: string; fetcher?: typeof fetch; timeoutMs?: number }

export function createOpenAICompatibleProvider(options: ApiOptions): MusicTutorProvider {
  const fetcher = options.fetcher ?? globalThis.fetch;
  const requestBody = (request: TutorRequest, stream: boolean) => ({
    model: options.model, temperature: 0.5, max_tokens: 400, stream,
    messages: [
      { role: 'system', content: systemPrompt(request) },
      ...(request.recentMessages ?? request.history).slice(-8).map((message) => ({ role: message.role, content: message.content })),
      { role: 'user', content: request.message },
    ],
    ...(stream ? {} : { response_format: { type: 'json_object' } }),
  });
  const headers = { 'content-type': 'application/json', Authorization: `Bearer ${options.apiKey}` };
  return {
    async chat(request) {
      const response = await fetcher(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(requestBody(request, false)) });
      if (!response.ok) throw new Error(`assistant_provider_${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('assistant_empty_response');
      const parsed = JSON.parse(content) as { text?: unknown; suggestions?: unknown };
      if (typeof parsed.text !== 'string' || !parsed.text.trim()) throw new Error('assistant_invalid_response');
      return { provider: 'api', text: parsed.text.trim(), suggestions: normalizeSuggestions(parsed.suggestions), topic: request.promptMeta?.topic };
    },
    async *stream(request) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);
      try {
        const response = await fetcher(`${options.baseUrl.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers, signal: controller.signal, body: JSON.stringify(requestBody(request, true)) });
        if (!response.ok || !response.body) throw new Error(`assistant_provider_${response.status}`);
        yield* parseSse(response.body);
      } finally { clearTimeout(timeout); }
    },
  };
}

function systemPrompt(request: TutorRequest) {
  const knowledge = (request.knowledge ?? []).slice(0, 3).map((item) => `${item.title}: ${item.content}`).join('\n');
  const memory = (request.learningSummary ?? request.memory ?? []).map((item) => `${item.topic}: ${item.summary}`).join('\n');
  const intent = request.promptMeta?.intent ? `这是一次${request.promptMeta.intent}练习。` : '';
  return `你是正在陪孩子学音乐的启发式老师，不是通用聊天助手。面向6-12岁儿童，只回答音乐学习、创作和App使用问题。${intent}承接上一轮，不重复自我介绍；一次只讲一个重点，用一个生活例子，最后给一个简单互动问题。回答2到4个短句，耐心、鼓励、具体。不要询问用户名或身份，不执行修改、发布或生成动作；不适合儿童的内容直接拒绝，未知就说不确定。直接输出纯文本。当前上下文：${JSON.stringify(request.context)}\n学习摘要：${memory}\n可用知识：${knowledge}`;
}

async function* parseSse(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader(); const decoder = new TextDecoder(); let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const events = buffer.split('\n\n'); buffer = events.pop() ?? '';
    for (const event of events) {
      const line = event.split('\n').find((item) => item.startsWith('data:'));
      if (!line) continue;
      const data = line.slice(5).trim(); if (data === '[DONE]') return;
      try { const content = (JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content; if (content) yield content; } catch { /* ignore malformed provider events */ }
    }
    if (done) break;
  }
}

function normalizeSuggestions(value: unknown): SuggestedAction[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: SuggestedAction[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if ((record.kind === 'question' || record.kind === undefined) && typeof record.label === 'string' && typeof record.prompt === 'string') result.push({ kind: 'question', label: record.label.slice(0, 30), prompt: record.prompt.slice(0, 120) });
    if (record.kind === 'navigate' && record.label === '去工坊创作') result.push({ kind: 'navigate', label: record.label, href: '/workshop' });
    if (result.length >= 3) break;
  }
  return result.length ? result : undefined;
}
