import { retrieveKnowledge } from './knowledge.ts';
import type { AgentReply, KnowledgeItem, MusicTutorProvider, TutorIntent, TutorRequest } from './types.ts';

export function createMockTutorProvider(): MusicTutorProvider { return { chat: async (request) => answer(request) }; }

function answer(request: TutorRequest): AgentReply {
  const topic = request.promptMeta?.topic ?? request.knowledge?.[0]?.id ?? retrieveKnowledge(request.message, request.context, 1)[0]?.id;
  const item = request.knowledge?.find((entry) => entry.id === topic) ?? request.knowledge?.[0] ?? retrieveKnowledge(request.message, request.context, 1)[0];
  const intent = request.promptMeta?.intent ?? inferIntent(request.message);
  if (request.context.page === 'academy' && (request.context.wrongStreak ?? 0) >= 2 && /答错|不会|怎么练|提示/.test(request.message)) return { provider: 'mock', topic, text: `别着急，我们先练“${request.context.levelGoal ?? item?.title ?? '这一关'}”。先听一遍，再只注意一个变化。你想先听目标声音，还是先试一次？`, suggestions: practiceSuggestions(topic), sourceIds: item ? [item.id] : undefined };
  if (item) return { provider: 'mock', topic, text: teach(item, intent, request), suggestions: practiceSuggestions(topic), sourceIds: [item.id] };
  if (request.context.workshop?.idea) return { provider: 'mock', topic: 'music-creation', text: `“${request.context.workshop.idea}”很适合变成一首歌。我们先选一个画面，再决定情绪和乐器。你想让它听起来开心，还是安静？`, suggestions: [{ kind: 'question', label: '推荐一种乐器', prompt: '根据这个想法推荐一种乐器' }, { kind: 'navigate', label: '去工坊创作', href: '/workshop' }] };
  return { provider: 'mock', topic: 'music-pitch', text: '我们先学一个小知识：音高是声音的高低。你可以比较小鸟叫和大鼓声，哪个听起来更高？', suggestions: practiceSuggestions('music-pitch') };
}

function teach(item: KnowledgeItem, intent: TutorIntent, request: TutorRequest): string {
  if (intent === 'practice') return `小测验：${item.title}说的是声音的哪个特点？你可以先用自己的话回答，我再帮你检查。`;
  if (intent === 'hint') return `给你一个小提示：想想小鸟叫、走楼梯或拍手的感觉。${item.content} 你觉得生活里哪里能听到它？`;
  if (intent === 'example') return `${item.content} 比如，${exampleFor(item.id)}。你愿意再找一个自己的例子吗？`;
  if (request.history.length > 0) return `接着刚才的内容：${item.content} 我们只抓住“${item.title}”这一个重点。你能用一句话说说它吗？`;
  return `${item.content} 比如，${exampleFor(item.id)}。你愿意用自己的话说一遍吗？`;
}

function exampleFor(topic: string) { if (topic === 'music-pitch') return '小鸟叫通常比较高，大鼓声通常比较低'; if (topic === 'music-duration') return '水滴声很短，小河流水声可以持续很久'; if (topic === 'music-beat') return '跟着心跳一下一下拍手，就能感受到节拍'; if (topic === 'music-volume') return '轻轻敲鼓声小，用力敲鼓声大'; if (topic === 'music-timbre') return '钢琴和小提琴弹同一个音，听起来也不一样'; if (topic.startsWith('academy-level-')) return '像玩声音接力一样，先听目标声音，再让自己的声音保持一样长'; return '像给声音排队讲故事一样，一个音接着一个音'; }
function practiceSuggestions(topic?: string): AgentReply['suggestions'] { return [{ kind: 'question', label: '换一个生活例子', prompt: `请围绕${topic ?? '刚才'}这个知识点换一个生活例子` }, { kind: 'question', label: '考考我', prompt: `请考考我${topic ?? '刚才'}这个知识点` }]; }
function inferIntent(message: string): TutorIntent { if (/例子|比如|生活/.test(message)) return 'example'; if (/考考|测验|回答/.test(message)) return 'practice'; if (/提示|不会|怎么练/.test(message)) return 'hint'; return 'explain'; }
