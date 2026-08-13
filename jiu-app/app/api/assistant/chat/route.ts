import { NextResponse } from 'next/server';
import { createMockTutorProvider } from '@/lib/assistant/mock-provider';
import { getTutorProvider, validateTutorRequest } from '@/lib/assistant/service';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'bad_request', message: '请求内容不是有效 JSON' }, { status: 400 }); }
  const validation = validateTutorRequest(body);
  if (!validation.ok) return NextResponse.json({ error: 'bad_request', message: validation.message }, { status: 400 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const selected = getTutorProvider(validation.request);
      try {
        if (selected.provider.stream) {
          for await (const chunk of selected.provider.stream(selected.request)) send('chunk', { text: chunk });
          send('done', { provider: 'api', topic: selected.request.promptMeta?.topic });
        } else {
          const reply = await selected.provider.chat(selected.request);
          send('chunk', { text: reply.text });
          send('done', reply);
        }
      } catch {
        const fallback = await createMockTutorProvider().chat(selected.request);
        send('chunk', { text: fallback.text });
        send('done', fallback);
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' } });
}
