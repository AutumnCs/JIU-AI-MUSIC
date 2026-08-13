import { LEVELS } from '../constants.ts';
import type { KnowledgeItem, TutorContext } from './types.ts';

const MUSIC_KNOWLEDGE: KnowledgeItem[] = [
  { id: 'music-pitch', title: '音高', content: '音高就是声音的高低。小鸟的歌声通常比较高，大象的声音通常比较低。', tags: ['音高', '高低', '声音'] },
  { id: 'music-timbre', title: '音色', content: '音色是声音独特的样子。钢琴、小提琴和人的声音，即使唱同一个音，也能听出不同。', tags: ['音色', '乐器', '声音'] },
  { id: 'music-volume', title: '音量', content: '音量是声音的强弱。轻轻敲鼓声音小，用力敲鼓声音大。', tags: ['音量', '强弱', '声音'] },
  { id: 'music-duration', title: '时值', content: '时值是声音持续的长短。有的声音像小水滴，很短；有的声音像小河，持续很久。', tags: ['时值', '长短', '声音'] },
  { id: 'music-beat', title: '节拍', content: '节拍像音乐的心跳，让音乐有稳定的步子。你可以一边听歌一边轻轻拍手：哒、哒、哒。', tags: ['节拍', '节奏', '心跳', '拍手'] },
  { id: 'music-quarter-eighth', title: '四分音符和八分音符', content: '在相同的一拍里，四分音符像走一步，八分音符像把这一步分成两个小跑步。', tags: ['四分音符', '八分音符', '节奏'] },
  { id: 'music-solfege', title: 'Do Re Mi', content: 'Do、Re、Mi 是唱名，就像音乐里的小名字。它们帮助我们唱准旋律和记住音符。', tags: ['Do', 'Re', 'Mi', '唱名', '旋律'] },
  { id: 'music-staff', title: '五线谱', content: '五线谱像五层楼，音符住在不同的线和间里。位置越高，通常唱得越高。', tags: ['五线谱', '音符', '位置'] },
  { id: 'music-melody', title: '旋律', content: '旋律是一串有顺序的音，像小鸟用声音讲故事。歌词可以跟着旋律唱出来。', tags: ['旋律', '歌词', '歌曲'] },
  { id: 'music-creation', title: '音乐创作', content: '创作可以从一个故事或心情开始，再选择旋律、节拍、曲风和乐器，把想法变成一首歌。', tags: ['创作', '曲风', '情绪', '乐器'] },
];

export const getKnowledgeBase = (): KnowledgeItem[] => [
  ...MUSIC_KNOWLEDGE,
  ...LEVELS.map((level) => ({
    id: `academy-level-${level.id}`,
    title: level.name,
    content: `${level.name}要学习：${level.subtitle}。小鸟提示：${level.companionTip}`,
    tags: [level.name, level.subtitle, level.companionTip, level.stageName],
    levelId: level.id,
  })),
];

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[\s，。！？、,.!?]/g, '');
}

export function retrieveKnowledge(query: string, context: Pick<TutorContext, 'page' | 'levelId'>, limit = 4) {
  const normalized = normalize(query);
  return getKnowledgeBase()
    .map((item) => {
      let score = item.levelId === context.levelId ? 5 : 0;
      for (const tag of item.tags) if (normalized.includes(normalize(tag))) score += 3;
      if (context.page === 'academy' && item.levelId) score += item.levelId === context.levelId ? 2 : 0;
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}

export function shouldAnswerWithMock(query: string, context: Pick<TutorContext, 'page' | 'levelId'>) {
  return retrieveKnowledge(query, context, 1).length > 0 && context.page !== 'workshop';
}
