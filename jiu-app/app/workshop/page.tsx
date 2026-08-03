'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { BirdPortrait } from '@/components/collection/BirdPortrait';
import { BIRDS } from '@/lib/constants';
import { useGlobalStore } from '@/stores/globalStore';

type LyricsMode = 'ai' | 'write' | 'continue';
type WorkshopView = 'create' | 'generating' | 'result';
type Voice = 'female' | 'male';

interface Draft {
  title: string;
  idea: string;
  lyrics: string;
  lyricsMode: LyricsMode;
  instrumental: boolean;
  genre: string;
  mood: string;
  voice: Voice;
  instruments: string[];
}

const GENRES = [
  { id: 'pop', label: '流行', icon: '🎤' },
  { id: 'rnb', label: '节奏蓝调', icon: '🎶' },
  { id: 'hiphop', label: '嘻哈', icon: '🎧' },
  { id: 'rap', label: '说唱', icon: '🧢' },
  { id: 'rock', label: '摇滚', icon: '🎸' },
  { id: 'jazz', label: '爵士', icon: '🎷' },
  { id: 'country', label: '乡村', icon: '🌾' },
  { id: 'classic', label: '古典', icon: '🎼' },
] as const;

const MOODS = [
  { id: 'happy', label: '开心', icon: '😊' },
  { id: 'sad', label: '难过', icon: '🌧️' },
  { id: 'excited', label: '兴奋', icon: '⚡' },
  { id: 'relaxed', label: '放松', icon: '🌿' },
  { id: 'romantic', label: '浪漫', icon: '🌹' },
  { id: 'powerful', label: '有力量', icon: '💪' },
  { id: 'mysterious', label: '神秘', icon: '🔮' },
  { id: 'nostalgic', label: '怀念', icon: '🍂' },
  { id: 'playful', label: '俏皮', icon: '🫧' },
  { id: 'dreamy', label: '梦幻', icon: '🌙' },
] as const;

const INSTRUMENTS = [
  { id: 'piano', label: '钢琴', icon: '🎹' },
  { id: 'guitar', label: '吉他', icon: '🎸' },
  { id: 'drums', label: '鼓', icon: '🥁' },
  { id: 'violin', label: '小提琴', icon: '🎻' },
  { id: 'cello', label: '大提琴', icon: '🎻' },
  { id: 'flute', label: '长笛', icon: '🪈' },
  { id: 'synth', label: '合成器', icon: '🎛️' },
] as const;

const IDEAS = ['我的小猫', '快乐暑假', '梦里的星球', '送给妈妈'];
const GENERATION_STEPS = ['正在读懂你的故事', '正在邀请乐器朋友', '小鸟正在最后排练'];
const DRAFT_KEY = 'jiu_workshop_draft';
const WORKS_KEY = 'jiu_workshop_works';

const DEFAULT_DRAFT: Draft = {
  title: '',
  idea: '',
  lyrics: '',
  lyricsMode: 'ai',
  instrumental: false,
  genre: 'pop',
  mood: 'happy',
  voice: 'female',
  instruments: ['piano'],
};

function buildLyrics(theme: string) {
  const subject = theme.trim() || '一场闪闪发光的旅行';
  return `【主歌】\n今天我要唱一唱，${subject}\n风从窗边轻轻走，带着愿望去远方\n\n【副歌】\n飞呀飞呀，跟着旋律出发\n每一个小小梦想，都会慢慢地长大`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function labelFor<T extends readonly { id: string; label: string }[]>(items: T, id: string) {
  return items.find((item) => item.id === id)?.label ?? '';
}

export default function WorkshopPage() {
  const { addFragment, currentBirdId } = useGlobalStore();
  const bird = BIRDS.find((item) => item.id === currentBirdId) ?? BIRDS[0];
  const birdPortraitIndex = bird.atlasPosition.row * 3 + bird.atlasPosition.column + 1;
  const selectedBirdPortrait = `/images/birds/${birdPortraitIndex}.png`;
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [view, setView] = useState<WorkshopView>('create');
  const [draftReady, setDraftReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [generateStep, setGenerateStep] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [resultTitle, setResultTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPublish, setShowPublish] = useState(false);
  const [publishText, setPublishText] = useState('我的新歌完成啦！');
  const [publishEmoji, setPublishEmoji] = useState('🎵');
  const [published, setPublished] = useState(false);
  const [toast, setToast] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) setDraft({ ...DEFAULT_DRAFT, ...JSON.parse(savedDraft) });
    } catch {
      // A fresh draft is safe if local storage is unavailable or malformed.
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    setSaved(false);
    const timer = window.setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSaved(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, draftReady]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const isReady = useMemo(() => {
    if (draft.instrumental) return true;
    if (draft.lyricsMode === 'ai') return Boolean(draft.idea.trim() || draft.lyrics.trim());
    return Boolean(draft.lyrics.trim());
  }, [draft]);

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const selectIdea = (idea: string) => {
    setDraft((current) => ({ ...current, idea, lyrics: '' }));
  };

  const createLyrics = () => {
    if (!draft.idea.trim()) {
      setToast('先告诉小鸟你想唱什么吧');
      return;
    }
    updateDraft('lyrics', buildLyrics(draft.idea));
    setToast('歌词写好啦，你还可以继续修改');
  };

  const continueLyrics = () => {
    if (!draft.lyrics.trim()) {
      setToast('先写下一两句，小鸟才能接着写');
      return;
    }
    updateDraft(
      'lyrics',
      `${draft.lyrics.trim()}\n\n【新的段落】\n云朵把歌声轻轻收藏\n明天醒来又是晴朗`,
    );
    setToast('小鸟接着写了四句');
  };

  const toggleInstrument = (id: string) => {
    setDraft((current) => {
      if (current.instruments.includes(id)) {
        return { ...current, instruments: current.instruments.filter((item) => item !== id) };
      }
      if (current.instruments.length >= 2) {
        setToast('最多邀请两种主乐器哦');
        return current;
      }
      return { ...current, instruments: [...current.instruments, id] };
    });
  };

  const handleGenerate = async () => {
    if (!isReady) {
      setToast('先写下你的歌曲故事吧');
      return;
    }

    const generationId = ++generationRef.current;
    const finalLyrics = draft.instrumental
      ? ''
      : draft.lyrics.trim() || buildLyrics(draft.idea);
    if (finalLyrics !== draft.lyrics) updateDraft('lyrics', finalLyrics);

    setGenerateStep(0);
    setView('generating');
    setIsPlaying(false);

    for (let step = 0; step < GENERATION_STEPS.length; step += 1) {
      if (generationRef.current !== generationId) return;
      setGenerateStep(step);
      await new Promise((resolve) => window.setTimeout(resolve, 1050));
    }
    if (generationRef.current !== generationId) return;

    setResultTitle(draft.title.trim() || (draft.instrumental ? '会飞的旋律' : '星光小旅行'));
    setGenerated(true);
    setView('result');
    setCurrentTime(0);
  };

  const cancelGeneration = () => {
    generationRef.current += 1;
    setView('create');
    setToast('创作已暂停，灵感都还在');
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setToast('暂时无法播放，请再试一次');
    }
  };

  const seekAudio = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const persistWork = (status: 'saved' | 'published') => {
    const work = {
      id: Date.now(),
      title: resultTitle,
      lyrics: draft.lyrics,
      genre: draft.genre,
      mood: draft.mood,
      instruments: draft.instruments,
      status,
      audio: '/audio/sample-song.mp3',
      caption: status === 'published' ? publishText.trim() : '',
      emoji: status === 'published' ? publishEmoji : '🎵',
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem(WORKS_KEY) || '[]');
    localStorage.setItem(WORKS_KEY, JSON.stringify([work, ...existing]));
  };

  const saveWork = () => {
    persistWork('saved');
    setToast('已经保存到作品集');
  };

  const publishWork = () => {
    persistWork('published');
    if (!published) {
      addFragment('怪羽', 3);
      setPublished(true);
    }
    setShowPublish(false);
    setToast(`${publishEmoji} 发布成功，获得怪羽碎片 ×3`);
  };

  const selectedInstrumentNames = draft.instruments
    .map((id) => labelFor(INSTRUMENTS, id))
    .filter(Boolean)
    .join('、');

  return (
    <main className="min-h-screen bg-[#FFF8F0] text-[#2C3E50]">
      {view !== 'generating' && (
        <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-[#FFF8F0]/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">音乐工坊</h1>
              <p className="mt-0.5 text-xs text-[#7F8C8D]">把你的故事变成一首歌</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#6B7280] shadow-sm ring-1 ring-orange-100">
              <span className={`h-2 w-2 rounded-full ${saved ? 'bg-[#2ED573]' : 'animate-pulse bg-[#FF9F43]'}`} />
              {saved ? '已保存' : '保存中'}
            </div>
          </div>

          {generated && (
            <div className="mt-3 grid grid-cols-2 rounded-xl bg-[#F3EADF] p-1" role="tablist" aria-label="工坊页面">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'create'}
                onClick={() => setView('create')}
                className={`min-h-10 rounded-lg text-sm font-bold transition ${view === 'create' ? 'bg-white text-[#E87824] shadow-sm' : 'text-[#8A7666]'}`}
              >
                继续创作
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'result'}
                onClick={() => setView('result')}
                className={`min-h-10 rounded-lg text-sm font-bold transition ${view === 'result' ? 'bg-white text-[#E87824] shadow-sm' : 'text-[#8A7666]'}`}
              >
                试听作品
              </button>
            </div>
          )}
        </header>
      )}

      <AnimatePresence mode="wait">
        {view === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4 px-4 pb-40 pt-4"
          >
            <section className="overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-[#F2E5D9]">
              <div className="flex items-start justify-between gap-4 border-b border-[#F5ECE4] bg-gradient-to-r from-[#FFF5E9] to-white p-4">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF9F43] text-sm font-black text-white">1</span>
                  <div>
                    <h2 className="font-extrabold">写下你的故事</h2>
                    <p className="mt-0.5 text-xs text-[#8A7666]">一句话也可以，小鸟会帮你写完整</p>
                  </div>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-bold text-[#6B7280]">
                  纯音乐
                  <input
                    type="checkbox"
                    checked={draft.instrumental}
                    onChange={(event) => updateDraft('instrumental', event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="relative h-7 w-12 rounded-full bg-[#D8D8D8] transition peer-checked:bg-[#54A0FF] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#54A0FF] after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5" />
                </label>
              </div>

              <div className="space-y-4 p-4">
                {!draft.instrumental ? (
                  <>
                    <div className="grid grid-cols-3 rounded-xl bg-[#F8F4EF] p-1" role="tablist" aria-label="歌词创作方式">
                      {([
                        ['ai', 'AI 帮我写'],
                        ['write', '自己写'],
                        ['continue', 'AI 续写'],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={draft.lyricsMode === id}
                          onClick={() => updateDraft('lyricsMode', id)}
                          className={`min-h-10 rounded-lg px-1 text-sm font-bold transition ${draft.lyricsMode === id ? 'bg-white text-[#E87824] shadow-sm' : 'text-[#8A7666]'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {draft.lyricsMode === 'ai' ? (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="sr-only">歌曲主题或故事</span>
                          <textarea
                            value={draft.idea}
                            maxLength={160}
                            onChange={(event) => setDraft((current) => ({ ...current, idea: event.target.value, lyrics: '' }))}
                            placeholder="例如：写一首关于暑假和好朋友的开心歌曲……"
                            className="min-h-32 w-full resize-none rounded-2xl border-2 border-[#F0E5DA] bg-[#FFFCF8] p-4 text-base leading-7 outline-none transition placeholder:text-[#B7AAA0] focus:border-[#FFB56F]"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2" aria-label="歌曲灵感">
                          {IDEAS.map((idea) => (
                            <button
                              key={idea}
                              type="button"
                              onClick={() => selectIdea(idea)}
                              className="min-h-10 rounded-full bg-[#FFF1DE] px-3 text-sm font-semibold text-[#A55A1F] active:scale-95"
                            >
                              {idea}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={createLyrics}
                          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#FFC78F] bg-[#FFF8EF] text-sm font-bold text-[#D96D1C] active:scale-[0.98]"
                        >
                          <span aria-hidden="true">✨</span> 先看看 AI 写的歌词
                        </button>
                        {draft.lyrics && (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#FFF8E7] p-4 ring-1 ring-[#F4DEB6]">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-extrabold text-[#A66B16]">小鸟写好的歌词</span>
                              <button type="button" onClick={() => updateDraft('lyricsMode', 'write')} className="min-h-9 px-2 text-xs font-bold text-[#E87824]">
                                修改歌词
                              </button>
                            </div>
                            <p className="whitespace-pre-line text-sm leading-6 text-[#665548]">{draft.lyrics}</p>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="block">
                          <span className="sr-only">歌曲歌词</span>
                          <textarea
                            value={draft.lyrics}
                            maxLength={600}
                            onChange={(event) => updateDraft('lyrics', event.target.value)}
                            placeholder={draft.lyricsMode === 'continue' ? '先写下一两句，小鸟会接着你的故事写……' : '在这里写下你的歌词……'}
                            className="min-h-44 w-full resize-none rounded-2xl border-2 border-[#F0E5DA] bg-[#FFFCF8] p-4 text-base leading-7 outline-none transition placeholder:text-[#B7AAA0] focus:border-[#FFB56F]"
                          />
                          <span className="mt-1 block text-right text-xs text-[#A89B90]">{draft.lyrics.length}/600</span>
                        </label>
                        {draft.lyricsMode === 'continue' && (
                          <button
                            type="button"
                            onClick={continueLyrics}
                            className="min-h-11 w-full rounded-xl bg-[#FFF1DE] text-sm font-bold text-[#D96D1C] active:scale-[0.98]"
                          >
                            ✨ 接着这一段写
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-[#665548]">描述你想听到的画面（选填）</span>
                    <textarea
                      value={draft.idea}
                      maxLength={160}
                      onChange={(event) => updateDraft('idea', event.target.value)}
                      placeholder="例如：在森林里散步时，轻松又梦幻的音乐……"
                      className="min-h-28 w-full resize-none rounded-2xl border-2 border-[#DCEBFA] bg-[#F7FBFF] p-4 text-base leading-7 outline-none placeholder:text-[#9AAFC2] focus:border-[#79B7F5]"
                    />
                  </label>
                )}

                <label className="block border-t border-[#F5ECE4] pt-4">
                  <span className="mb-2 flex items-center gap-2 text-sm font-bold text-[#665548]">
                    歌名 <span className="text-xs font-medium text-[#A89B90]">选填，小鸟也可以帮你取</span>
                  </span>
                  <input
                    type="text"
                    value={draft.title}
                    maxLength={50}
                    onChange={(event) => updateDraft('title', event.target.value)}
                    placeholder="给歌曲起一个名字"
                    className="min-h-12 w-full rounded-xl border-2 border-[#F0E5DA] bg-[#FFFCF8] px-4 text-base outline-none placeholder:text-[#B7AAA0] focus:border-[#FFB56F]"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-[#F2E5D9]">
              <div className="mb-4 flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#54A0FF] text-sm font-black text-white">2</span>
                <div>
                  <h2 className="font-extrabold">歌曲是什么感觉</h2>
                  <p className="mt-0.5 text-xs text-[#8A7666]">每一组选择都会带来不同的声音</p>
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-extrabold text-[#665548]">曲风</legend>
                <div className="grid grid-cols-3 gap-2">
                  {GENRES.map((item) => {
                    const active = draft.genre === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateDraft('genre', item.id)}
                        className={`relative min-h-[58px] rounded-xl border-2 px-1 text-sm font-bold transition active:scale-95 ${active ? 'border-[#FF9F43] bg-[#FFF1DE] text-[#A45116]' : 'border-[#EEE6DF] bg-[#FCFAF8] text-[#6B625C]'}`}
                      >
                        <span className="mr-1" aria-hidden="true">{item.icon}</span>{item.label}
                        {active && <span className="absolute right-1.5 top-1 text-[10px] text-[#E87824]">●</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="mb-2 text-sm font-extrabold text-[#665548]">情绪</legend>
                <div className="grid grid-cols-3 gap-2">
                  {MOODS.map((item) => {
                    const active = draft.mood === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => updateDraft('mood', item.id)}
                        className={`relative min-h-[58px] rounded-xl border-2 px-1 text-sm font-bold transition active:scale-95 ${active ? 'border-[#54A0FF] bg-[#EAF5FF] text-[#276AAB]' : 'border-[#EEE6DF] bg-[#FCFAF8] text-[#6B625C]'}`}
                      >
                        <span className="mr-1" aria-hidden="true">{item.icon}</span>{item.label}
                        {active && <span className="absolute right-1.5 top-1 text-[10px] text-[#438FD8]">●</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>

            <section className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-[#F2E5D9]">
              <div className="mb-4 flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#A785E5] text-sm font-black text-white">3</span>
                <div>
                  <h2 className="font-extrabold">挑选声音</h2>
                  <p className="mt-0.5 text-xs text-[#8A7666]">邀请喜欢的歌手和乐器朋友</p>
                </div>
              </div>

              {!draft.instrumental && (
                <fieldset>
                  <legend className="mb-2 text-sm font-extrabold text-[#665548]">人声</legend>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F8F4EF] p-1.5">
                    {([
                      ['female', '清亮女声', '🐦'],
                      ['male', '温柔男声', '🐤'],
                    ] as const).map(([id, label, icon]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={draft.voice === id}
                        onClick={() => updateDraft('voice', id)}
                        className={`min-h-12 rounded-xl text-sm font-extrabold transition active:scale-95 ${draft.voice === id ? 'bg-white text-[#7A54B3] shadow-sm ring-1 ring-[#D9C8F2]' : 'text-[#786C64]'}`}
                      >
                        <span className="mr-1" aria-hidden="true">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <fieldset className={draft.instrumental ? '' : 'mt-5'}>
                <legend className="mb-2 flex w-full items-center justify-between text-sm font-extrabold text-[#665548]">
                  <span>主乐器</span>
                  <span className={`text-xs ${draft.instruments.length === 2 ? 'text-[#E87824]' : 'text-[#A89B90]'}`}>已选 {draft.instruments.length}/2</span>
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {INSTRUMENTS.map((item) => {
                    const active = draft.instruments.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleInstrument(item.id)}
                        className={`relative min-h-[62px] rounded-xl border-2 text-sm font-bold transition active:scale-95 ${active ? 'border-[#A785E5] bg-[#F4EEFF] text-[#6D4AA1]' : 'border-[#EEE6DF] bg-[#FCFAF8] text-[#6B625C]'}`}
                      >
                        <span className="mb-0.5 block text-xl" aria-hidden="true">{item.icon}</span>
                        {item.label}
                        {active && <span className="absolute right-1.5 top-1 text-xs text-[#8F67C8]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </section>
          </motion.div>
        )}

        {view === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            className="px-4 pb-40 pt-5"
          >
            <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_12px_36px_rgba(126,88,54,0.12)] ring-1 ring-[#F2E5D9]">
              <div className="relative mx-auto mt-5 aspect-square w-[76%] max-w-[290px] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,#FFF3C4_0%,#F8B56B_35%,#D77EAE_100%)] shadow-[0_16px_30px_rgba(174,106,89,0.22)]">
                <div className="absolute -left-4 top-8 h-24 w-24 rounded-full bg-white/20" />
                <div className="absolute -right-8 bottom-10 h-32 w-32 rounded-full bg-[#7BD7D0]/35" />
                <div className="absolute left-5 top-4 rotate-[-12deg] text-3xl text-white/90">♪</div>
                <div className="absolute right-6 top-8 rotate-12 text-4xl text-white/90">♫</div>
                <BirdPortrait bird={bird} className="absolute inset-x-6 bottom-2 top-10" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#7F4265]/65 to-transparent px-5 pb-4 pt-12 text-center text-xs font-bold tracking-[0.22em] text-white/90">JIU ORIGINAL</div>
              </div>

              <div className="px-5 pb-5 pt-5 text-center">
                <h2 className="text-2xl font-black tracking-tight text-[#352B25]">《{resultTitle}》</h2>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs font-bold text-[#7A6B61]">
                  <span className="rounded-full bg-[#FFF1DE] px-2.5 py-1">{labelFor(GENRES, draft.genre)}</span>
                  <span className="rounded-full bg-[#EAF5FF] px-2.5 py-1">{labelFor(MOODS, draft.mood)}</span>
                  {selectedInstrumentNames && <span className="rounded-full bg-[#F4EEFF] px-2.5 py-1">{selectedInstrumentNames}</span>}
                </div>

                <audio
                  ref={audioRef}
                  src="/audio/sample-song.mp3"
                  preload="metadata"
                  onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="mt-6 rounded-2xl bg-[#FFF9F2] p-4">
                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={Math.min(currentTime, duration || 1)}
                    onChange={(event) => seekAudio(Number(event.target.value))}
                    aria-label="歌曲播放进度"
                    className="h-2 w-full cursor-pointer accent-[#FF9F43]"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="w-12 text-left text-xs font-semibold text-[#8A7B70]">{formatTime(currentTime)}</span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={togglePlay}
                      aria-label={isPlaying ? '暂停歌曲' : '播放歌曲'}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FFAD57] to-[#F47B43] text-2xl text-white shadow-[0_8px_20px_rgba(244,123,67,0.35)]"
                    >
                      {isPlaying ? 'Ⅱ' : '▶'}
                    </motion.button>
                    <span className="w-12 text-right text-xs font-semibold text-[#8A7B70]">{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </section>

            {!draft.instrumental && (
              <section className="mt-4 rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#F2E5D9]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-extrabold">同步歌词</h3>
                  <span className="rounded-full bg-[#FFF1DE] px-2.5 py-1 text-xs font-bold text-[#C7631A]">正在演唱</span>
                </div>
                <div className="max-h-52 overflow-y-auto rounded-2xl bg-[#FFFCF8] p-4 text-center text-sm leading-8 text-[#8A7B70]">
                  {draft.lyrics.split('\n').map((line, index) => (
                    <p key={`${line}-${index}`} className={index === 1 && isPlaying ? 'font-extrabold text-[#E87824]' : ''}>
                      {line || '\u00A0'}
                    </p>
                  ))}
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={() => setView('create')}
              className="mt-4 min-h-12 w-full rounded-2xl text-sm font-extrabold text-[#8A6B55] active:bg-white/70"
            >
              ↻ 调整后重新生成
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'create' && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-30 w-full max-w-lg -translate-x-1/2 border-t border-orange-100/80 bg-[#FFF8F0]/95 p-3 backdrop-blur-md">
          <button
            type="button"
            onClick={handleGenerate}
            aria-disabled={!isReady}
            className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black shadow-lg transition active:scale-[0.98] ${isReady ? 'bg-gradient-to-r from-[#FF9F43] to-[#F47B43] text-white shadow-orange-200' : 'bg-[#E5DED7] text-[#A99E95] shadow-none'}`}
          >
            <span aria-hidden="true">✨</span> 让小鸟开始创作
          </button>
        </div>
      )}

      {view === 'result' && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-30 grid w-full max-w-lg -translate-x-1/2 grid-cols-[0.9fr_1.4fr] gap-2 border-t border-orange-100/80 bg-[#FFF8F0]/95 p-3 backdrop-blur-md">
          <button type="button" onClick={saveWork} className="min-h-14 rounded-2xl border-2 border-[#FFC98F] bg-white text-sm font-black text-[#B96221] active:scale-[0.98]">
            保存作品
          </button>
          <button type="button" onClick={() => setShowPublish(true)} className="min-h-14 rounded-2xl bg-gradient-to-r from-[#FF9F43] to-[#F47B43] text-sm font-black text-white shadow-lg shadow-orange-200 active:scale-[0.98]">
            发布到社区
          </button>
        </div>
      )}

      <AnimatePresence>
        {view === 'generating' && (
          <motion.section
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_32%,#FFF8D7_0%,#FFF1DE_38%,#EAF5FF_100%)] px-8 text-center"
            aria-live="polite"
          >
            <div className="absolute left-8 top-24 text-3xl text-[#F5A04F]/60">♪</div>
            <div className="absolute right-10 top-36 text-4xl text-[#6AAFEF]/55">♫</div>
            <div className="absolute bottom-28 left-14 text-2xl text-[#A785E5]/55">♩</div>
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [-2, 3, -2] }}
              transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
              className="relative h-52 w-52"
            >
              <div className="absolute inset-0 rounded-full bg-white/65 shadow-[0_16px_44px_rgba(210,139,78,0.2)] ring-8 ring-white/35" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/80 via-[#FFF7D6]/75 to-[#DDF4FF]/75" />
              <motion.div
                animate={{ scale: [1, 1.04, 1], rotate: [-1, 1, -1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-7 flex items-center justify-center"
              >
                <Image
                  key={currentBirdId}
                  src={selectedBirdPortrait}
                  alt={bird.name}
                  fill
                  sizes="176px"
                  priority
                  unoptimized
                  className="h-full w-full object-contain drop-shadow-[0_12px_12px_rgba(103,78,58,0.22)]"
                />
              </motion.div>
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-6 top-2 rounded-2xl rounded-bl-md bg-white px-3 py-2 text-xs font-extrabold text-[#6B5548] shadow-md ring-1 ring-[#F2E5D9]"
              >
                我来帮你排练！
              </motion.div>
            </motion.div>
            <p className="mt-6 text-xl font-black text-[#3F352E]">{GENERATION_STEPS[generateStep]}…</p>
            <p className="mt-2 text-sm font-semibold text-[#8A7666]">通常需要一点时间，请听听小鸟的排练声</p>
            <div className="mt-8 w-full max-w-xs space-y-3 text-left">
              {GENERATION_STEPS.map((step, index) => (
                <div key={step} className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${index === generateStep ? 'bg-white shadow-sm' : ''}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${index < generateStep ? 'bg-[#2ED573] text-white' : index === generateStep ? 'animate-pulse bg-[#FF9F43] text-white' : 'bg-white/70 text-[#B6A89D]'}`}>
                    {index < generateStep ? '✓' : index + 1}
                  </span>
                  <span className={`text-sm font-bold ${index <= generateStep ? 'text-[#5C4D42]' : 'text-[#A99B91]'}`}>{step}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={cancelGeneration} className="mt-8 min-h-12 px-6 text-sm font-bold text-[#8A7666] underline decoration-[#CBB8A9] underline-offset-4">
              暂停创作
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPublish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-0"
            onClick={() => setShowPublish(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="publish-title"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-lg rounded-t-[28px] bg-[#FFF8F0] px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#D8CCC2]" />
              <h2 id="publish-title" className="text-xl font-black">把作品分享给大家</h2>
              <p className="mt-1 text-sm text-[#8A7666]">加一句话和一个心情，让朋友发现你的音乐。</p>
              <div className="mt-4 flex gap-2" aria-label="发布心情">
                {['🎵', '🌟', '😊', '🚀', '🌈'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-pressed={publishEmoji === emoji}
                    onClick={() => setPublishEmoji(emoji)}
                    className={`h-12 flex-1 rounded-xl text-xl ${publishEmoji === emoji ? 'bg-[#FFF1DE] ring-2 ring-[#FF9F43]' : 'bg-white ring-1 ring-[#EDE3DA]'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <textarea
                value={publishText}
                maxLength={100}
                onChange={(event) => setPublishText(event.target.value)}
                className="mt-4 min-h-24 w-full resize-none rounded-2xl border-2 border-[#F0E5DA] bg-white p-4 text-base outline-none focus:border-[#FFB56F]"
                aria-label="发布配文"
              />
              <div className="mt-4 grid grid-cols-[0.8fr_1.2fr] gap-2">
                <button type="button" onClick={() => setShowPublish(false)} className="min-h-13 rounded-2xl bg-white font-bold text-[#77685D] ring-1 ring-[#E8DDD4]">再想想</button>
                <button type="button" onClick={publishWork} className="min-h-13 rounded-2xl bg-[#FF9F43] font-black text-white shadow-lg shadow-orange-200">确认发布</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="status"
            className="fixed left-1/2 top-[calc(1rem+env(safe-area-inset-top,0px))] z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-[#2C3E50] px-4 py-3 text-center text-sm font-bold text-white shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
