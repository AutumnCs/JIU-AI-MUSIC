export interface Bird {
  id: number;
  name: string;
  englishName: string;
  category: 'cute' | 'abstract' | 'mystery';
  description: string;
  avatar: string;
  avatarGray: string;
  fragmentType: string;
  fragmentNeeded: number;
  birdCall: string;
}

export const BIRDS: Bird[] = [
  { id: 1, name: '北长尾山雀', englishName: 'Long-tailed Tit', category: 'cute', description: '嗨！我是你的第一位音乐伙伴！喜欢在树枝间跳来跳去唱歌。', avatar: '/birds/tit.svg', avatarGray: '/birds/tit-gray.svg', fragmentType: '', fragmentNeeded: 0, birdCall: '/audio/tit-call.mp3' },
  { id: 2, name: '花彩雀莺', englishName: 'White-crowned Penduline Tit', category: 'cute', description: '你已经认真练习了！一起唱歌吧！', avatar: '/birds/penduline.svg', avatarGray: '/birds/penduline-gray.svg', fragmentType: '绒羽', fragmentNeeded: 10, birdCall: '/audio/penduline-call.mp3' },
  { id: 3, name: '冠小海雀', englishName: 'Crested Auklet', category: 'abstract', description: '汪！——对，你没听错，就是汪！', avatar: '/birds/auklet.svg', avatarGray: '/birds/auklet-gray.svg', fragmentType: '怪羽', fragmentNeeded: 8, birdCall: '/audio/auklet-call.mp3' },
  { id: 4, name: '蛇鹫', englishName: 'Secretarybird', category: 'mystery', description: '欢迎来到神秘世界。', avatar: '/birds/secretary.svg', avatarGray: '/birds/secretary-gray.svg', fragmentType: '暗羽', fragmentNeeded: 6, birdCall: '/audio/secretary-call.mp3' },
];

export const FRAGMENT_TYPES = ['绒羽', '怪羽', '暗羽'] as const;
export type FragmentType = (typeof FRAGMENT_TYPES)[number];

export const STYLES = [
  { id: 'happy', label: '😊 欢快', color: '#FF9F43' },
  { id: 'quiet', label: '🌙 安静', color: '#54A0FF' },
  { id: 'dreamy', label: '✨ 梦幻', color: '#A29BFE' },
] as const;

export type AcademyGameKey =
  | 'sound-elevator'
  | 'sound-relay'
  | 'sound-balance'
  | 'heartbeat-drummer'
  | 'note-race'
  | 'rhythm-puzzle'
  | 'note-town'
  | 'pitch-tower'
  | 'note-home';

export interface AcademyLevel {
  id: number;
  order: number;
  stageId: 1 | 2 | 3;
  lesson: 1 | 2 | 3;
  stageName: string;
  name: string;
  icon: string;
  subtitle: string;
  zone: string;
  companionTip: string;
  game: AcademyGameKey;
  rewardType: '绒羽';
  position: { x: number; y: number };
}

export const ACADEMY_STAGES = [
  { id: 1, name: '听的世界', subtitle: '发现声音的高低、长短和强弱', icon: '👂' },
  { id: 2, name: '节奏魔法', subtitle: '用身体感受音乐的心跳', icon: '🥁' },
  { id: 3, name: '旋律星图', subtitle: '唱出音符，找到它们的家', icon: '✨' },
] as const;

// Existing level IDs 1/2/3 are intentionally preserved so saved progress
// continues to point at the same games. `order` controls the learning path.
export const LEVELS: AcademyLevel[] = [
  {
    id: 1,
    order: 1,
    stageId: 1,
    lesson: 1,
    stageName: '听的世界',
    name: '声音电梯',
    icon: '🎶',
    subtitle: '听见声音的高与低',
    zone: '田野启程',
    companionTip: '听，声音也是会坐电梯的哦！有的往上走，有的往下走。',
    game: 'sound-elevator',
    rewardType: '绒羽',
    position: { x: 30, y: 90 },
  },
  {
    id: 4,
    order: 2,
    stageId: 1,
    lesson: 2,
    stageName: '听的世界',
    name: '声音接力',
    icon: '💧',
    subtitle: '感受声音的长与短',
    zone: '溪流小径',
    companionTip: '有的声音像小溪一样长长的，有的像水滴一样短短的。',
    game: 'sound-relay',
    rewardType: '绒羽',
    position: { x: 68, y: 81 },
  },
  {
    id: 5,
    order: 3,
    stageId: 1,
    lesson: 3,
    stageName: '听的世界',
    name: '声音天平',
    icon: '⚖️',
    subtitle: '分辨声音的强与弱',
    zone: '向日葵田',
    companionTip: '声音有时像大象踩地一样重，有时像小猫走路一样轻。',
    game: 'sound-balance',
    rewardType: '绒羽',
    position: { x: 31, y: 72 },
  },
  {
    id: 2,
    order: 4,
    stageId: 2,
    lesson: 1,
    stageName: '节奏魔法',
    name: '心跳鼓手',
    icon: '🥁',
    subtitle: '跟着节拍翻过山坡',
    zone: '风车山坡',
    companionTip: '把手放在胸口，音乐也有像心跳一样稳定的拍子。',
    game: 'heartbeat-drummer',
    rewardType: '绒羽',
    position: { x: 69, y: 61 },
  },
  {
    id: 6,
    order: 5,
    stageId: 2,
    lesson: 2,
    stageName: '节奏魔法',
    name: '音符赛跑',
    icon: '🏃',
    subtitle: '认识走路拍和跑步拍',
    zone: '节拍跑道',
    companionTip: '四分音符像走路，八分音符像小跑，两步当一步。',
    game: 'note-race',
    rewardType: '绒羽',
    position: { x: 31, y: 52 },
  },
  {
    id: 7,
    order: 6,
    stageId: 2,
    lesson: 3,
    stageName: '节奏魔法',
    name: '节奏拼图',
    icon: '🧩',
    subtitle: '把音符拼成完整节奏',
    zone: '木桥工坊',
    companionTip: '把不同长度的木板拼在一起，就能搭出一座节奏桥啦！',
    game: 'rhythm-puzzle',
    rewardType: '绒羽',
    position: { x: 69, y: 43 },
  },
  {
    id: 3,
    order: 7,
    stageId: 3,
    lesson: 1,
    stageName: '旋律星图',
    name: '音符小镇',
    icon: '🎵',
    subtitle: '在森林里唱出 Do Re Mi',
    zone: '山林乐园',
    companionTip: '每一个音符都有自己的颜色和性格，我们来认识它们吧。',
    game: 'note-town',
    rewardType: '绒羽',
    position: { x: 31, y: 32 },
  },
  {
    id: 8,
    order: 8,
    stageId: 3,
    lesson: 2,
    stageName: '旋律星图',
    name: '音准爬塔',
    icon: '🗼',
    subtitle: '唱准音符向上攀登',
    zone: '云端高塔',
    companionTip: '只要唱得准，小人就能爬得高！慢慢唱，不着急。',
    game: 'pitch-tower',
    rewardType: '绒羽',
    position: { x: 69, y: 23 },
  },
  {
    id: 9,
    order: 9,
    stageId: 3,
    lesson: 3,
    stageName: '旋律星图',
    name: '音符找家',
    icon: '🏠',
    subtitle: '认识音符在五线谱的位置',
    zone: '星光树屋',
    companionTip: '五线谱像一栋五层楼，每个音符都有自己固定的房间。',
    game: 'note-home',
    rewardType: '绒羽',
    position: { x: 31, y: 14 },
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  cute: '小可爱',
  abstract: '抽象大师',
  mystery: '神秘来客',
};
