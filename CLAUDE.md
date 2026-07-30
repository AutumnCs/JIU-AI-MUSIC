# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"啾" (Jiu) — a mobile-first Web App for children's music education and AI-assisted music creation. The app has four modules:

- **图鉴 (Collection)** `/collection` — Bird encyclopedia with unlock/fragment progression system
- **学院 (Academy)** `/academy` — **9 levels** in 3 stages (Listening → Rhythm → Melody) with SVG countryside map
- **工坊 (Workshop)** `/workshop` — AI music generation from humming (Web Audio API synthesis)
- **社区 (Community)** `/community` — Shared works list with likes

## Repo Structure

```
jiu-complete-package/          # Git repo root
├── jiu-app/                   # Next.js app (all source)
│   ├── app/                   # App Router pages
│   │   ├── academy/           # Academy map page + level/[id] route
│   │   └── academy.module.css # 868-line CSS Module (SVG map, animations)
│   ├── components/
│   │   ├── academy/           # 6 map components + games/ (12 game files)
│   │   ├── collection/        # BirdCard, BirdDetail
│   │   ├── layout/            # BottomNav, BirdCompanion
│   │   └── shared/            # FragmentDrop, Onboarding
│   ├── stores/globalStore.ts  # Zustand single store
│   └── lib/constants.ts       # Birds, levels, strings
├── jiu-project/               # Planning docs (feasibility, specs, architecture)
└── CLAUDE.md                  # This file
```

## Commands

```bash
# All commands run from jiu-app/
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm run start     # serve production build
npm run lint      # ESLint
```

No test runner is configured.

## Architecture

**Single-store Zustand app** — all state lives in `stores/globalStore.ts` and is persisted to `localStorage` (`jiu_state` key). The store is the single source of truth for: user ID (device UUID), fragments (绒羽/怪羽/暗羽), unlocked birds, academy progress, and current bird companion.

**App Router layout** — `app/layout.tsx` wraps every page with `BottomNav`, `BirdCompanion` (floating chat with speech synthesis/recognition), and `Onboarding`. Pages are `'use client'` components. `/` immediately redirects to `/collection`.

**Academy level routing** — dynamic route `app/academy/level/[id]/page.tsx` dispatches to level components by ID (1=SoundElevator through 9=NoteHome). Levels follow a 3-phase lifecycle: **Preparation** → **Game** → **Result** (with 3-star scoring). Every game component implements the `AcademyGameProps` interface (`onComplete(score)`, `onMistake()`, `simpleMode`).

**Key libraries and why:**
- Web Audio API (native) — all audio (no Tone.js dependency needed; `tone` in package.json is unused)
- `@dnd-kit/core` — drag-and-drop for rhythm puzzle (2-3) and note placement (3-3) games
- `framer-motion` — all animations (AnimatePresence for modals/transitions)
- `zustand` — state (no Redux, no context providers)

**Bird/fragment system** — `lib/constants.ts` defines the `BIRDS` array (4 birds) and `LEVELS` (9 academy levels with `AcademyGameKey`, `order`, stage). Birds unlock via fragment thresholds. Fragment types are: `'绒羽' | '怪羽' | '暗羽'`.

**9 Academy levels:**

| Stage | Levels | Game Component |
|-------|--------|---------------|
| 1. Listening (听) | 1-1 SoundElevator / 1-2 SoundRelay / 1-3 SoundBalance | 声音电梯/接力/天平 |
| 2. Rhythm (节奏) | 2-1 HeartbeatDrummer / 2-2 NoteRace / 2-3 RhythmPuzzle | 心跳鼓手/赛跑/拼图 |
| 3. Melody (旋律) | 3-1 NoteTown / 3-2 PitchTower / 3-3 NoteHome | 音符小镇/爬塔/找家 |

**Adaptive difficulty** — after 3 consecutive mistakes, `simpleMode` is triggered automatically (simplified game parameters).

**Audio engine** — `components/academy/games/audio.ts` provides pitch detection (optimized autocorrelation), oscillator utilities, and microphone access via pure Web Audio API.

## Design Constraints

- Mobile-only at 375px, `max-w-lg mx-auto` in layout
- No backend yet — the spec (`jiu-project/03-技术架构文档.md`) describes a planned FastAPI backend; currently everything is client-side
- Chinese UI throughout; all string constants in `lib/constants.ts`
- Tailwind CSS 4 with `@tailwindcss/postcss`; theme colors: `#FF9F43` (primary orange), `#FFF8F0` (bg), `#54A0FF` (secondary blue)

## Project Docs

`jiu-project/` contains planning docs in Chinese (feasibility report, SOP/tech spec, architecture doc, MVP scope). Read `04-核心模块细化与MVP范围.md` for the definitive MVP scope and what was explicitly cut.
