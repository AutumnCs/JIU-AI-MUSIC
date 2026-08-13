import type { AgentReply } from './types.ts';

const UNSAFE_PATTERNS = [
  /色情|淫秽|裸体| porn|sex/i,
  /自杀|自残|伤害自己|割腕/,
  /杀人|虐待|血腥|暴力教程/,
  /毒品|吸毒|制毒|赌博|博彩/,
  /怎么入侵|制作炸弹|制造武器|黑客攻击/,
];

export function isUnsafeForChildren(message: string): boolean {
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(message));
}

export function getSafetyReply(): AgentReply {
  return {
    provider: 'mock',
    text: '这个问题我们先不聊啦。我可以陪你学习音乐、创作歌曲，或者一起探索节拍、旋律和乐器。',
    suggestions: [
      { kind: 'question', label: '什么是音高？', prompt: '什么是音高？' },
      { kind: 'question', label: '考考我', prompt: '考考我一个音乐问题' },
    ],
  };
}
