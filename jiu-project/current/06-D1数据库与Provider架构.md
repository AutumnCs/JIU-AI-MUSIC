# D1 数据库迁移与 Provider 架构

日期：2026-08-09

## 1. 目标

将当前 Cloudflare Workers + Hyperdrive + Neon PostgreSQL 运行架构迁移为 Cloudflare Workers + D1 + R2，同时保留现有业务能力，并吸收协作分支中可复用的音乐 Provider 抽象和方舟歌词生成能力。

本次迁移只迁移数据库结构和应用代码，不导入 Neon 中的历史业务数据。Neon 和 Hyperdrive 线上资源暂时保留作为回退，不在本次工作中删除。

## 2. 范围

本次包含：

- 使用 D1 作为用户、Session、音乐任务和社区数据的唯一运行时数据库。
- 将 PostgreSQL schema 转换为可重复执行的 D1 migration。
- 保留游客身份、签名 Cookie、音乐任务归属和社区完整接口。
- 为音乐生成建立 `MusicProvider` 接口，提供 Volcengine 和本地 Mock 实现。
- 为歌词生成建立 `LyricsProvider` 接口，提供 Ark 和本地模板实现。
- 保留 R2 音频持久化，并统一使用 `MUSIC_BUCKET` binding。
- 保持现有 Worker 名称和公开 API 路径不变。

本次不包含：

- Neon 历史数据导入。
- 删除 Neon 或 Hyperdrive 云资源。
- 邮箱、手机号或第三方账号登录。
- 完整内容审核平台、举报后台和人工审核队列。
- 将 Mock Provider 用作生产音乐服务。

## 3. 总体架构

```text
Browser
  |
  v
Next.js on Cloudflare Workers
  |-- Auth / Music / Community API routes
  |-- D1 binding: DB
  |-- R2 binding: MUSIC_BUCKET
  |-- MusicProvider: Volcengine or local Mock
  `-- LyricsProvider: Ark or local template
```

API route 只负责 HTTP 参数、身份验证和响应映射。业务数据通过 Repository 接口访问，外部 AI 服务通过 Provider 接口访问。路由不得直接拼装 D1 SQL，也不得直接依赖火山引擎响应格式。

## 4. D1 数据模型

`jiu-app/migrations/0001_init.sql` 创建以下表：

- `users`
- `sessions`
- `music_tasks`
- `community_posts`
- `community_post_media`
- `community_post_music`
- `community_post_likes`
- `community_post_favorites`
- `community_comments`
- `community_comment_likes`
- `community_notifications`

D1/SQLite 存储约定：

- 主键和时间戳使用 `text`。
- 布尔值使用 `integer` 的 `0/1`。
- JSON 请求参数序列化为 `text`。
- 计数器使用非负整数。
- 外键删除行为在 migration 中显式声明。
- 所有 Feed、评论、通知和任务归属查询建立对应索引。

数据库 binding 固定命名为 `DB`，数据库名固定为 `jiu-music-db`。D1 database ID 使用 AutumnCs 所属 Cloudflare 账号创建后返回的真实 ID，不能复用其他仓库中的 ID。

## 5. Repository 边界

数据层按职责拆分：

- `AuthRepository`：游客、用户、Session 创建、查询和撤销。
- `MusicTaskRepository`：任务创建、归属查询、状态更新和作品列表。
- `CommunityRepository`：帖子、媒体、音乐附件、互动、评论和通知。

Repository 接口使用领域对象，不暴露 D1 的行字段命名。D1 实现负责：

- ISO 时间和 `0/1` 布尔值转换。
- JSON 字符串解析。
- D1 prepared statement 参数绑定。
- 多步骤写入使用 `DB.batch()`。
- 将唯一约束冲突转换为稳定的业务错误。

API 的路径和主要响应结构保持不变，前端不因数据库迁移而重写。

## 6. Session 与权限

游客登录继续使用随机用户 ID、数据库 Session 和签名 HttpOnly Cookie。所有写操作必须先验证 Session。

权限要求：

- 音乐生成任务必须写入当前用户的 `music_tasks`。
- 音乐状态和私有音频只能由任务所有者访问。
- 社区帖子只能附加当前用户已成功生成的任务。
- 用户只能删除自己的评论，帖子作者可以管理自己帖子下的评论。
- 点赞、收藏和评论通知不能给操作人自己创建通知。

迁移不能采用协作分支中无身份验证的音乐与歌词 API 实现。

## 7. Music Provider

`MusicProvider` 提供稳定的领域接口：

```ts
interface MusicProvider {
  readonly name: string;
  createTask(input: CreateMusicTaskInput): Promise<CreateMusicTaskResult>;
  getTask(taskId: string): Promise<MusicTaskState>;
}
```

实现包括：

- `VolcengineMusicProvider`：封装 V4 签名、提交动作、状态码和 PascalCase 响应。
- `MockMusicProvider`：仅用于本地开发和单元测试，返回样例音频。

选择规则：

- 显式 `MUSIC_PROVIDER=volcengine` 使用火山引擎，缺少密钥时直接报错。
- 显式 `MUSIC_PROVIDER=mock` 只允许非生产环境。
- 未配置时，存在完整火山引擎密钥则使用 Volcengine；非生产环境可回退 Mock。
- 生产环境不得因密钥缺失而静默返回样例音乐。

Mock 的任务状态不能作为生产持久状态；生产任务状态始终以 D1 和真实 Provider 为准。

## 8. Lyrics Provider

`LyricsProvider` 隔离歌词生成供应商：

```ts
interface LyricsProvider {
  readonly name: string;
  generate(input: GenerateLyricsInput): Promise<string>;
}
```

实现包括：

- `ArkLyricsProvider`：通过 Worker Secret 中的 `ARK_API_KEY` 调用方舟 Chat Completions。
- `LocalTemplateLyricsProvider`：本地开发和上游故障时生成儿童友好的模板歌词。

歌词 API 必须验证 Session、限制输入长度并返回稳定错误。供应商密钥不能进入浏览器、日志或普通 Wrangler vars。

## 9. 社区功能保持

D1 迁移后必须保留：

- 最新 Feed cursor 分页。
- 热门 Feed 按 `like_count + favorite_count + comment_count` 综合热度排序。
- 帖子详情。
- 最多 9 个媒体地址。
- 关联本人成功音乐作品。
- 帖子点赞和收藏。
- 多层评论、回复、评论点赞和权限删除。
- 互动消息通知。

PostgreSQL 专用 SQL 必须改写为 D1/SQLite 兼容形式，包括行元组 cursor 比较、`greatest()`、布尔返回值和 JSON 类型。

内容仍采用现有 MVP 策略发布，但保留 `moderation_status` 字段，后续敏感词和图片审核接入时无需再次迁表。

## 10. Cloudflare 配置

`wrangler.jsonc` 调整为：

- 保留 Worker 名称 `jiu-bird-collection`。
- 删除 `HYPERDRIVE` binding。
- 添加 `DB` D1 binding 和 `migrations_dir`。
- R2 只保留 `MUSIC_BUCKET`，删除重复 binding。
- 保留 `ASSETS` 和 `WORKER_SELF_REFERENCE`。
- 启用 Workers observability，使用受控采样率。

生产 Secret 至少包括：

- `AUTH_COOKIE_SECRET`
- `VOLC_ACCESS_KEY`
- `VOLC_SECRET_KEY`
- `VOLC_SESSION_TOKEN`，仅使用临时凭证时配置
- `ARK_API_KEY`，启用方舟歌词生成时配置
- `ARK_MODEL` 可以作为非敏感配置或 Secret 覆盖默认模型

## 11. 测试与验收

实现采用测试先行：先写期望行为并确认失败，再补最小实现。

必须通过：

- D1 binding 和行数据映射单元测试。
- Session 创建、过期、撤销和签名 Cookie 测试。
- 音乐任务归属、状态更新和越权拒绝测试。
- 社区帖子、分页、收藏、评论、通知和权限测试。
- Music Provider 选择、Volcengine 映射和 Mock 行为测试。
- Lyrics Provider 选择、输入限制和回退测试。
- 本地 D1 migration apply 和 schema 查询 smoke test。
- `npx tsc --noEmit`。
- `npm run lint`。
- 全部 Node 单元测试。
- `npm run cf-build`。
- `npx wrangler deploy --dry-run`。

## 12. 发布和回退

发布顺序：

1. 在 AutumnCs Cloudflare 账号创建 `jiu-music-db`。
2. 写入真实 D1 database ID。
3. 本地应用 migration 并运行测试。
4. 远程应用 migration。
5. 配置生产 Secrets。
6. 构建并执行 Wrangler dry-run。
7. 部署 Worker。
8. 验收游客登录、音乐任务、R2 音频和社区完整流程。

如果 D1 版本出现阻断问题，使用 Cloudflare Worker version rollback 回到 Hyperdrive 版本。Neon 和 Hyperdrive 在 D1 稳定验收前保持不变，确保回退版本仍可连接原数据库。

## 13. 完成标准

满足以下条件才视为迁移完成：

- 运行时代码不再依赖 `postgres` 或 `HYPERDRIVE`。
- 所有现有 API 路径在 D1 上正常工作。
- 社区功能不低于迁移前版本。
- 音乐任务、音频和帖子附件均有用户归属保护。
- 外部音乐和歌词能力通过 Provider 接口调用。
- 本地和 Cloudflare 构建验证全部通过。
- Neon/Hyperdrive 仅作为未删除的回退资源，不再被新版本 Worker 使用。
