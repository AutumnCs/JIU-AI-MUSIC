import { describe, expect, test } from 'vitest';
import { createOpenAICompatibleProvider } from './api-provider.ts';

describe('openai-compatible provider', () => {
  test('parses structured reply', async () => {
    const provider = createOpenAICompatibleProvider({ apiKey: 'secret', baseUrl: 'https://model.example/v1', model: 'test', fetcher: async (input, init) => {
      expect(input).toBe('https://model.example/v1/chat/completions');
      expect(init?.method).toBe('POST');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secret');
      return Response.json({ choices: [{ message: { content: '{"text":"这是音高","suggestions":[{"label":"考考我","kind":"question","prompt":"考考我"}]}' } }] });
    } });
    const reply = await provider.chat({ message: '什么是音高？', history: [], context: { page: 'academy' }, knowledge: [{ id: 'pitch', title: '音高', content: '声音的高低', tags: ['音高'] }] });
    expect(reply.provider).toBe('api');
    expect(reply.text).toBe('这是音高');
    expect(reply.suggestions?.[0].label).toBe('考考我');
  });

  test('parses streamed text chunks and enables stream mode', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"你好"}}]}\n\n')); controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"，小鸟"}}]}\n\n')); controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); } });
    const provider = createOpenAICompatibleProvider({ apiKey: 'secret', baseUrl: 'https://model.example/v1', model: 'test', fetcher: async (_input, init) => { expect((JSON.parse(String(init?.body)) as { stream?: boolean }).stream).toBe(true); return new Response(body); } });
    const chunks: string[] = [];
    for await (const chunk of provider.stream!({ message: '你好', history: [], context: { page: 'home' } })) chunks.push(chunk);
    expect(chunks).toEqual(['你好', '，小鸟']);
  });
});
