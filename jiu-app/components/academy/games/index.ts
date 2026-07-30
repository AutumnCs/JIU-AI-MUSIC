import { AcademyGameKey } from '@/lib/constants';
import { AcademyGameComponent } from './types';
import { SoundElevator } from './SoundElevator';
import { SoundRelay } from './SoundRelay';
import { SoundBalance } from './SoundBalance';
import { HeartbeatDrummer } from './HeartbeatDrummer';
import { NoteRace } from './NoteRace';
import { RhythmPuzzle } from './RhythmPuzzle';
import { NoteTown } from './NoteTown';
import { PitchTower } from './PitchTower';
import { NoteHome } from './NoteHome';

export const ACADEMY_GAMES: Record<AcademyGameKey, AcademyGameComponent> = {
  'sound-elevator': SoundElevator,
  'sound-relay': SoundRelay,
  'sound-balance': SoundBalance,
  'heartbeat-drummer': HeartbeatDrummer,
  'note-race': NoteRace,
  'rhythm-puzzle': RhythmPuzzle,
  'note-town': NoteTown,
  'pitch-tower': PitchTower,
  'note-home': NoteHome,
};
