# 「啾」SOP-SPEC-PLAN — 技术规格与实施计划

> 日期：2026-07-29 | 版本：v1.0

---

## 一、产品规格（SPEC）

### 1.1 产品形态

| 项目 | 规格 |
|------|------|
| 形态 | **Web App**（响应式 PWA，移动端优先） |
| 端口 | 浏览器直接访问，支持添加到主屏幕 |
| 平台 | iOS Safari / Android Chrome / 微信内置浏览器 |
| 最小分辨率 | 375×667 (iPhone SE) |

### 1.2 功能规格（Demo 版）

#### 模块 A：图鉴（P0）

| 功能 | 规格 | 技术实现 |
|------|------|---------|
| 图鉴主页 | 3 分类 × 卡片网格布局 | React 组件 + CSS Grid |
| 鸟类卡片 | 3 种状态（已解锁/碎片中/未获得） | 状态机渲染 |
| 鸟类详情 | 形象图 + 名称 + 介绍 + 选择按钮 | Modal/页面路由 |
| 碎片进度条 | 卡片底部显示 N/M | 进度条组件 |
| 切换助手 | 点击已解锁鸟 → 全局切换 | Context API 全局状态 |
| 4 只鸟 | 北长尾山雀(初始) + 花彩雀莺 + 冠小海雀 + 蛇鹫 | 静态资源 + 状态数据 |

#### 模块 B：学院（P1）

| 功能 | 规格 | 技术实现 |
|------|------|---------|
| 卷轴地图 | 纵向滚动，3 个关卡节点 | Canvas/CSS 动画 |
| 关卡 1：声音电梯 | 播放 2 音 → 判断高低 | Tone.js 播放 + 按钮交互 |
| 关卡 2：心跳鼓手 | 跟节拍点击鼓 | Tone.js Transport + 点击计时 |
| 关卡 3：音符小镇 | 跟唱 + 音高检测 | Tone.js + pitch-detection |
| 伴学小鸟悬浮 | 全局右下角悬浮鸟图标 | 固定定位组件 |
| AI 语音答疑 | 点击小鸟 → 语音输入 → LLM 回答 → TTS 播放 | Web Speech API + LLM API |
| 碎片掉落 | 通关后弹出碎片获得动画 | Lottie/CSS 动画 |

#### 模块 C：工坊（P0，核心亮点）

| 功能 | 规格 | 技术实现 |
|------|------|---------|
| 画布主界面 | 中央画布 + 底部素材库 | React DnD 拖拽 |
| 环境录音 | 麦克风录制 3-10 秒 | MediaRecorder API |
| 哼唱录制 | 麦克风录制 5-30 秒 | MediaRecorder API |
| 预置素材 | 溪水声、风声、鸟叫 (2-3 个) | 静态音频资源 |
| AI 帮帮忙 | 分析素材 → 选择风格 → 合成歌曲 | ACE-Step API / 预生成 |
| 风格选择 | 欢快 / 安静 / 梦幻 (3 选 1) | 按钮选择 → API 参数 |
| 试听播放 | 生成后可播放 | HTML5 Audio |
| 发布到社区 | 一键发布 | POST API |

#### 模块 D：社区（P2，简化版）

| 功能 | 规格 | 技术实现 |
|------|------|---------|
| 作品列表 | 按时间倒序，瀑布流卡片 | API + 列表渲染 |
| 作品播放 | 点击播放 + 作者信息 | HTML5 Audio + 卡片详情 |
| 点亮星星 | 点赞 + 计数 | API + 乐观更新 |

#### 模块 E：通用基础

| 功能 | 规格 | 技术实现 |
|------|------|---------|
| 底部导航 | 4 Tab（学院/工坊/社区/图鉴） | React Router |
| 用户体系 | 设备码自动生成 | localStorage UUID |
| 碎片系统 | 碎片数量、解锁状态持久化 | 数据库 + API |
| 首次引导 | 2-3 页引导 + 监护人同意 | Modal + localStorage |
| AI 伴学小鸟 | 全局悬浮，可语音交互 | 固定组件 + Web Speech API |

---

## 二、技术规格（TECH SPEC）

### 2.1 技术栈

```
┌─ 前端 ──────────────────────────────────────┐
│  框架：React 18 + Next.js 14 (App Router)    │
│  样式：TailwindCSS + Framer Motion           │
│  音频：Tone.js + Web Audio API               │
│  拖拽：@dnd-kit/core                         │
│  音高检测：pitchy (npm) / crepe (TF.js)      │
│  语音：Web Speech API (STT) + Cloud TTS      │
│  状态：Zustand                               │
│  构建：Vercel / 自建                          │
└──────────────────────────────────────────────┘

┌─ 后端 ──────────────────────────────────────┐
│  框架：Python FastAPI                        │
│  数据库：SQLite (Demo) / PostgreSQL           │
│  ORM：SQLAlchemy                              │
│  AI 音乐：ACE-Step 本地部署                    │
│  AI 对话：通义千问 API / OpenAI API            │
│  AI TTS：云端 TTS API                         │
│  音频分析：librosa + aubio                    │
│  文件存储：本地文件系统 / OSS                   │
│  部署：阿里云 ECS / Serverless                 │
└──────────────────────────────────────────────┘
```

### 2.2 核心数据模型

```sql
-- 用户表
CREATE TABLE users (
    id TEXT PRIMARY KEY,          -- UUID 设备码
    current_bird_id INTEGER DEFAULT 1,  -- 当前伴学小鸟
    created_at TIMESTAMP DEFAULT NOW()
);

-- 碎片表
CREATE TABLE fragments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    fragment_type TEXT NOT NULL,   -- '绒羽' | '怪羽' | '暗羽'
    count INTEGER DEFAULT 0,
    UNIQUE(user_id, fragment_type)
);

-- 鸟类解锁状态
CREATE TABLE bird_unlocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    bird_id INTEGER NOT NULL,
    unlocked_at TIMESTAMP,
    UNIQUE(user_id, bird_id)
);

-- 学院进度
CREATE TABLE academy_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    level_id INTEGER NOT NULL,     -- 关卡 ID (1-3)
    completed BOOLEAN DEFAULT FALSE,
    best_score INTEGER DEFAULT 0,
    UNIQUE(user_id, level_id)
);

-- 作品表
CREATE TABLE works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    title TEXT,
    audio_url TEXT NOT NULL,
    style TEXT,                    -- '欢快' | '安静' | '梦幻'
    description TEXT,
    stars INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 点赞表
CREATE TABLE stars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id),
    work_id INTEGER REFERENCES works(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, work_id)
);
```

### 2.3 API 设计

```
POST   /api/user/register          # 注册/获取用户
GET    /api/user/:id               # 获取用户信息
PUT    /api/user/:id/bird          # 切换伴学小鸟

GET    /api/fragments/:userId      # 获取碎片列表
POST   /api/fragments/add          # 添加碎片

GET    /api/birds                  # 获取鸟类列表
GET    /api/birds/:id              # 获取鸟类详情

GET    /api/academy/progress/:userId  # 获取学院进度
POST   /api/academy/complete       # 完成关卡

POST   /api/workshop/generate      # AI 生成歌曲（核心！）
POST   /api/workshop/record        # 上传录音素材
POST   /api/workshop/publish       # 发布作品到社区

GET    /api/community/works        # 获取社区作品列表
POST   /api/community/star         # 点赞
```

### 2.4 AI 音乐生成流程（核心链路）

```
用户录音（哼唱/环境音）
    ↓
前端上传音频文件
    ↓
后端接收 → librosa 提取旋律特征
    ↓  (音高序列、调式、节拍)
选择伴奏风格（欢快/安静/梦幻）
    ↓
ACE-Step / 预生成模板 合成歌曲
    ↓  (哼唱旋律 + 伴奏 + 环境底纹)
返回音频文件 URL
    ↓
前端播放试听 → 可重新生成 / 发布
```

### 2.5 音高检测方案（学院关卡 3）

```javascript
// 浏览器端实时音高检测
import { PitchDetector } from 'pitchy';

const detector = PitchDetector.forFloat32Array(2048);
const audioContext = new AudioContext();
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);
const analyzer = audioContext.createAnalyser();

source.connect(analyzer);

function detectPitch() {
  const data = new Float32Array(2048);
  analyzer.getFloatTimeDomainData(data);
  const [pitch, clarity] = detector.findPitch(data, audioContext.sampleRate);
  if (clarity > 0.8) {
    const note = hzToNote(pitch); // 如 "C4", "D4"
    return note;
  }
  return null;
}
```

---

## 三、实施计划（PLAN）

### 3.1 总览：17 天冲刺（7/29 - 8/15）

```
Phase 1: 骨架搭建     7/29 - 7/31  (3天)
Phase 2: 核心功能     8/01 - 8/07  (7天)
Phase 3: 体验打磨     8/08 - 8/12  (5天)
Phase 4: 演示准备     8/13 - 8/15  (3天)
```

### 3.2 详细排期

#### Phase 1：骨架搭建（7/29 - 7/31）

| 日期 | 前端 (2人) | AI 全栈 (1人) | UI/UX (2人) | 队长 |
|------|-----------|--------------|-------------|------|
| 7/29 | Next.js 项目初始化 + 底部导航 + 路由 | 后端 FastAPI 初始化 + 数据库建表 | 首页/图鉴/学院 UI 设计稿 | 技术选型确认 + 环境搭建 |
| 7/30 | 图鉴页面骨架 + 碎片系统 API 联调 | 碎片系统 API + 用户体系 API | 工坊/社区 UI 设计稿 | 音频素材收集 |
| 7/31 | 学院地图页面 + 关卡 1 骨架 | AI 语音对话链路打通 | 鸟类插画开始制作 | 演示流程脚本草稿 |

#### Phase 2：核心功能（8/01 - 8/07）

| 日期 | 前端 (2人) | AI 全栈 (1人) | UI/UX (2人) | 队长 |
|------|-----------|--------------|-------------|------|
| 8/01 | 关卡 1 声音电梯完整实现 | ACE-Step 部署 + 音乐生成 API | 鸟类插画续 + 图鉴切图 | 伴奏模板制作 |
| 8/02 | 关卡 2 心跳鼓手完整实现 | 哼唱旋律分析 librosa | 学院地图背景 + 关卡 UI | 鸟叫音效录制 |
| 8/03 | 关卡 3 音符小镇 + 音高检测 | 歌曲合成引擎混音 | 工坊画布 UI 切图 | 关卡讲解文案 |
| 8/04 | 工坊画布 + 拖拽 + 录音 | 工坊 AI 生成流程联调 | 社区页面 UI 切图 | 演示流程预演 |
| 8/05 | 工坊风格选择 + 试听播放 | 社区 API 列表/点赞 | 碎片掉落动画 + 解锁弹窗 | 预置 Demo 作品 |
| 8/06 | 社区页面 + 点赞功能 | 碎片掉落逻辑串联 | 全局动画打磨 | 全链路测试 |
| 8/07 | P0 功能全链路跑通 | P0 API 全部就绪 | P0 UI 全部切图完成 | 里程碑检查 |

#### Phase 3：体验打磨（8/08 - 8/12）

| 日期 | 前端 (2人) | AI 全栈 (1人) | UI/UX (2人) | 队长 |
|------|-----------|--------------|-------------|------|
| 8/08 | 伴学小鸟悬浮 + AI 语音交互 | TTS 集成 + 鸟类角色音色 | 全局视觉统一 + 图标 | 演示路径验证 |
| 8/09 | 碎片掉落动画 + 首次引导 | 情感判断基础版 | 动效打磨 + 加载动画 | Bug 修复 |
| 8/10 | 全局交互优化 + 响应式适配 | 性能优化 + 错误处理 | 最终视觉调整 | 全链路回归测试 |
| 8/11 | Bug 修复 + 边界情况处理 | API 稳定性加固 | 音效/UI 最终确认 | 演示流程彩排 |
| 8/12 | 体验冻结 | 功能冻结 | 设计冻结 | Demo 可演示 |

#### Phase 4：演示准备（8/13 - 8/15）

| 日期 | 全员 |
|------|------|
| 8/13 | 演示流程完整走通 + 录制演示视频 + 项目说明文档撰写 |
| 8/14 | 项目说明文档完成 + 最终 Bug 修复 + 部署上线 |
| 8/15 | 提交全部物料 |

### 3.3 人员分工矩阵

| 角色 | 人员 | 核心职责 |
|------|------|---------|
| 队长/PM | 1人 | 进度管控、需求决策、演示脚本、项目文档 |
| 前端 A | 1人 | 学院模块 + 图鉴模块 + 全局导航 |
| 前端 B | 1人 | 工坊模块 + 社区模块 + 音频交互 |
| AI 工程师 | 1人 | ACE-Step 部署 + 音乐生成 API + 音高检测 |
| UI/UX 设计 A | 1人 | 视觉设计 + 鸟类插画 + 切图 |
| UI/UX 设计 B | 1人 | 动效设计 + 文案 + 音频素材协调 |

---

## 四、关键里程碑

| 日期 | 里程碑 | 验收标准 |
|------|--------|---------|
| 7/31 | M1: 骨架跑通 | 4 个 Tab 可切换，API 基础链路通 |
| 8/07 | M2: P0 完成 | 学院 3 关可玩 + 工坊可生成 + 图鉴 4 鸟 + 社区列表 |
| 8/12 | M3: 体验就绪 | 全链路演示可通，动画/音效就位 |
| 8/15 | M4: 提交 | 所有物料提交完毕 |

---

## 五、风险管理

| 风险 | 概率 | 影响 | 应对方案 |
|------|:---:|:---:|---------|
| ACE-Step 生成质量不稳 | 高 | 高 | 双轨方案：优先用预生成高质量音频 + 实时生成作为增强 |
| 音高检测不准 | 中 | 中 | 宽松判定 + 检测失败默认通过 |
| 前端工作量超预期 | 高 | 高 | P2 全砍，UI 用组件库加速，动画用 CSS 替代 Lottie |
| 鸟类插画来不及 | 中 | 中 | AI 生成初稿 + 设计师微调，4 只鸟即可 |
| LLM 响应延迟 | 中 | 低 | 预置常见问题回答缓存 |
> [旧版/归档]
> 这份文档是早期规格与实施计划草稿，内容保留作历史参考，不再作为当前实现依据。
