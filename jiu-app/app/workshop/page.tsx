'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalStore } from '@/stores/globalStore';
import { STYLES } from '@/lib/constants';
import { FragmentDrop } from '@/components/shared/FragmentDrop';

type Stage = 'idle' | 'recording-hum' | 'recording-env' | 'generating' | 'done';

export default function WorkshopPage() {
  const { addFragment } = useGlobalStore();
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedStyle, setSelectedStyle] = useState('happy');
  const [hummingBlob, setHummingBlob] = useState<Blob | null>(null);
  const [envBlob, setEnvBlob] = useState<Blob | null>(null);
  const [hummingDuration, setHummingDuration] = useState(0);
  const [envDuration, setEnvDuration] = useState(0);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async (type: 'hum' | 'env') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        stream.getTracks().forEach((t) => t.stop());
        if (type === 'hum') {
          setHummingBlob(blob);
          setHummingDuration(duration);
        } else {
          setEnvBlob(blob);
          setEnvDuration(duration);
        }
        setStage('idle');
      };

      mr.start();
      setStage(type === 'hum' ? 'recording-hum' : 'recording-env');

      // Auto-stop
      const maxDuration = type === 'hum' ? 30000 : 10000;
      setTimeout(() => {
        if (mr.state === 'recording') mr.stop();
      }, maxDuration);
    } catch {
      alert('请允许访问麦克风');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const generateSong = async () => {
    setStage('generating');
    // Simulate AI generation (in real app, this calls the backend)
    await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
    // Use a pre-generated sample audio
    setGeneratedAudio('/audio/sample-song.mp3');
    setStage('done');
  };

  const handlePublish = () => {
    addFragment('怪羽', 3);
    setShowReward(true);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const resetAll = () => {
    setStage('idle');
    setHummingBlob(null);
    setEnvBlob(null);
    setHummingDuration(0);
    setEnvDuration(0);
    setGeneratedAudio(null);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-20">
      <div className="sticky top-0 z-10 bg-[#FFF8F0] px-4 py-3 border-b border-orange-100">
        <h1 className="text-xl font-bold text-gray-800 text-center">🎨 工坊</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Canvas area */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 min-h-[120px] flex flex-col items-center justify-center text-center">
          {stage === 'idle' && !hummingBlob && !envBlob && (
            <div className="text-gray-400">
              <div className="text-4xl mb-2">🎨</div>
              <div>录制素材，让 AI 帮你创作音乐！</div>
            </div>
          )}
          {(hummingBlob || envBlob) && stage !== 'done' && (
            <div className="space-y-2 w-full">
              {hummingBlob && (
                <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-4 py-2">
                  <span className="text-xl">🎤</span>
                  <span className="text-sm text-gray-600">哼唱已录制 ({hummingDuration}秒)</span>
                  <button onClick={() => { setHummingBlob(null); setHummingDuration(0); }} className="ml-auto text-gray-400 text-sm">🔄 重录</button>
                </div>
              )}
              {envBlob && (
                <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-2">
                  <span className="text-xl">🎵</span>
                  <span className="text-sm text-gray-600">环境音已录制 ({envDuration}秒)</span>
                  <button onClick={() => { setEnvBlob(null); setEnvDuration(0); }} className="ml-auto text-gray-400 text-sm">🔄 重录</button>
                </div>
              )}
            </div>
          )}
          {stage === 'generating' && (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="text-5xl">
              ✨
            </motion.div>
          )}
          {stage === 'done' && generatedAudio && (
            <div className="w-full space-y-3">
              <div className="text-center text-lg font-semibold text-gray-700">🎉 创作完成！</div>
              <audio
                ref={audioRef}
                src={generatedAudio}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <button
                onClick={togglePlay}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-300 to-orange-400 text-white text-lg font-semibold active:scale-[0.98] transition-all"
              >
                {isPlaying ? '⏸ 暂停' : '▶️ 播放'}
              </button>
              <div className="flex gap-2">
                <button onClick={resetAll} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium">
                  🔄 再来一次
                </button>
                <button onClick={handlePublish} className="flex-1 py-3 rounded-xl bg-[#FF9F43] text-white font-medium">
                  📤 发布到社区
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recording buttons */}
        <div className="grid grid-cols-2 gap-3">
          {stage === 'recording-hum' || stage === 'recording-env' ? (
            <button
              onClick={stopRecording}
              className="col-span-2 py-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-500 font-semibold text-lg animate-pulse"
            >
              ⏹ 停止录制
            </button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => startRecording('hum')}
                disabled={stage === 'generating' || stage === 'done'}
                className="py-4 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-medium disabled:opacity-40 hover:border-[#FF9F43] transition-all"
              >
                🎤 录制哼唱
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => startRecording('env')}
                disabled={stage === 'generating' || stage === 'done'}
                className="py-4 rounded-2xl bg-white border-2 border-gray-200 text-gray-700 font-medium disabled:opacity-40 hover:border-[#FF9F43] transition-all"
              >
                🎵 录制环境音
              </motion.button>
            </>
          )}
        </div>

        {/* Style selector */}
        <div className="bg-white rounded-2xl p-4">
          <div className="text-sm text-gray-500 mb-2">风格选择</div>
          <div className="grid grid-cols-3 gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={`py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedStyle === s.id
                    ? 'bg-[#FF9F43] text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        {stage !== 'done' && stage !== 'generating' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateSong}
            disabled={!hummingBlob}
            className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
              hummingBlob
                ? 'bg-gradient-to-r from-[#FF9F43] to-[#FF6B6B] text-white shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            ✨ AI 帮帮忙！
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showReward && (
          <FragmentDrop
            show={showReward}
            type="怪羽"
            count={3}
            onClose={() => setShowReward(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
