export const NOTES = [
  { name: 'Do', shortName: 'C', freq: 261.63, color: '#ff8b5c' },
  { name: 'Re', shortName: 'D', freq: 293.66, color: '#ffcb57' },
  { name: 'Mi', shortName: 'E', freq: 329.63, color: '#60c98b' },
] as const;

export function playTone(freq: number, duration = 0.5, volume = 0.28) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = freq;
    gain.gain.value = volume;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener('ended', () => void context.close());
  } catch {
    // Audio is an enhancement; the visual game remains usable.
  }
}

export async function playRhythm(beats: number[]) {
  let cursor = 0;
  for (const beat of beats) {
    window.setTimeout(() => playTone(520, 0.09, 0.22), cursor);
    cursor += beat * 420;
  }
  return cursor;
}

export function hzToNote(hz: number) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const semitones = 12 * Math.log2(hz / 440);
  const index = Math.round(semitones) + 9;
  const octave = Math.floor(index / 12) + 4;
  return `${notes[((index % 12) + 12) % 12]}${octave}`;
}

export async function detectPitch(durationMs = 1300): Promise<number | null> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext();
  const source = context.createMediaStreamSource(stream);
  const analyzer = context.createAnalyser();
  analyzer.fftSize = 2048;
  source.connect(analyzer);

  const data = new Float32Array(analyzer.fftSize);
  const readings: number[] = [];
  const startedAt = performance.now();

  return new Promise((resolve) => {
    const finish = () => {
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
      if (!readings.length) {
        resolve(null);
        return;
      }
      readings.sort((a, b) => a - b);
      resolve(readings[Math.floor(readings.length / 2)]);
    };

    const sample = () => {
      analyzer.getFloatTimeDomainData(data);
      let bestOffset = -1;
      let bestCorrelation = 0;

      for (let offset = 40; offset < 700; offset += 1) {
        let correlation = 0;
        for (let index = 0; index < 900; index += 1) {
          correlation += data[index] * data[index + offset];
        }
        if (correlation > bestCorrelation) {
          bestCorrelation = correlation;
          bestOffset = offset;
        }
      }

      if (bestCorrelation > 0.012 && bestOffset > 0) {
        const hz = context.sampleRate / bestOffset;
        if (hz > 120 && hz < 700) readings.push(hz);
      }

      if (performance.now() - startedAt < durationMs) {
        requestAnimationFrame(sample);
      } else {
        finish();
      }
    };

    sample();
  });
}

export function scoreFromCorrect(correct: number, total: number) {
  if (correct >= total) return 3;
  if (correct >= Math.ceil(total / 2)) return 2;
  return 1;
}
