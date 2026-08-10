# Jiu App

Jiu 是一个面向儿童音乐启蒙与 AI 创作的 Next.js 应用。后端运行在 **Cloudflare Workers + D1 + R2**：D1 保存用户、会话、音乐任务和社区数据，R2 保存音乐音频。

## 本地开发

```bash
npm install
npm run dev
```

本地 D1 schema 由 migration 管理：

```bash
npx wrangler d1 migrations apply jiu-music-db --local
```

`AUTH_COOKIE_SECRET` 用于签名 HTTP-only session cookie；生产环境必须通过 Wrangler secret 配置该值。

## Cloudflare 部署

先将 migration 应用到已配置的 D1 数据库：

```bash
npx wrangler d1 migrations apply jiu-music-db --remote
```

然后构建并部署 Worker：

```bash
npm run sites-build
npx wrangler secret put AUTH_COOKIE_SECRET
npx wrangler deploy
```

`wrangler.jsonc` 负责绑定 `DB` D1 数据库和 `MUSIC_BUCKET` R2 bucket。数据库结构的唯一来源是 `migrations/0001_init.sql`。

## 代码结构

- `app/api/*`：HTTP 接口。
- `lib/server/*`：服务端身份、会话、D1 repositories 和数据库 facade。
- `lib/auth/*`：前后端共享的身份类型。
- `stores/globalStore.ts`：前端本地状态。
