# 啾 (Jiu) — AI 音乐创编 Web App

移动端优先的儿童音乐教育与 AI 辅助创编 Web 应用。基于 Next.js 15 App Router，纯前端运行。

## 四大模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 🐦 **图鉴** | `/collection` | 鸟类图鉴，绒羽/怪羽/暗羽收集与解锁系统 |
| 🎓 **学院** | `/academy` | **9 关**音乐闯关（听→节奏→旋律，3 阶段） |
| 🎨 **工坊** | `/workshop` | AI 音乐生成（哼唱转谱，Tone.js 合成） |
| 🌟 **社区** | `/community` | 作品列表分享与点赞 |

## 学院关卡结构

| 阶段 | 关卡 | 玩法 |
|------|------|------|
| 👂 第一阶段 · 听的世界 | 1-1 声音电梯 / 1-2 声音接力 / 1-3 声音天平 | 听音辨高、声音传递、音量平衡 |
| 🥁 第二阶段 · 节奏魔法 | 2-1 心跳鼓手 / 2-2 音符赛跑 / 2-3 节奏拼图 | 节拍跟打、节奏记忆、旋律拼图 |
| ✨ 第三阶段 · 旋律星图 | 3-1 音符小镇 / 3-2 音准爬塔 / 3-3 音符找家 | 视唱练耳、音准纠正、识谱找音 |

## 快速开始

```bash
cd jiu-app
npm install
npm run dev      # → http://localhost:3000
npm run build    # 生产构建
```

## 技术栈

- **框架**: Next.js 15 (App Router, `'use client'` 页面)
- **状态管理**: Zustand 5 (单 store，localStorage 持久化)
- **音频**: 纯 Web Audio API（OscillatorNode, AnalyserNode, autocorrelation 音高检测）
- **动画**: Framer Motion
- **拖拽**: @dnd-kit/core（节奏拼图、音符找家）
- **样式**: Tailwind CSS 4 + CSS Modules（`academy.module.css`）
- **语音**: Web Speech API（中文 TTS + 语音识别）

## 设计约束

- 移动端优先，375px 宽度，`max-w-lg mx-auto`
- 全中文 UI
- 无后端依赖，纯客户端运行
- 主题色: `#FF9F43`（橙）/ `#FFF8F0`（背景）/ `#54A0FF`（蓝）

## 项目文档

`jiu-project/` 包含详细规划文档（可行性分析、技术规格、架构设计、MVP 范围）。

## 许可证

MIT
