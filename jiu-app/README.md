# Jiu App

Jiu 是一个面向儿童音乐启蒙与 AI 创作的 Next.js 应用。当前主线已经切到 **Cloudflare Workers + Hyperdrive + Neon Free Postgres**。

## 现在这套后端做什么

- `POST /api/auth/guest` 创建或恢复游客身份
- `GET /api/me` 读取当前用户
- `POST /api/auth/logout` 退出当前会话

身份和会话数据由 PostgreSQL 负责，前端草稿和临时状态仍然保留在 `localStorage` 里。

## 本地开发

```bash
npm install
npm run dev
```

本地跑开发模式时，推荐把 `DATABASE_URL` 指向 Neon 的开发数据库，便于直接测试数据库链路。

需要的环境变量：

```bash
DATABASE_URL=
AUTH_COOKIE_SECRET=
```

- `DATABASE_URL`：本地开发可直接指向 Neon 的 PostgreSQL 连接串
- `AUTH_COOKIE_SECRET`：用于签名 HTTP-only session cookie 的长随机字符串

## Cloudflare Workers 部署

线上部署时，推荐使用：

- Cloudflare Workers 作为运行时
- Hyperdrive 作为数据库连接代理
- Neon 作为 PostgreSQL 数据库

部署时需要：

1. 在 Neon 创建数据库
2. 执行 [schema.sql](/G:/jiu-ai-music/jiu-app/lib/server/schema.sql)
3. 在 Cloudflare 创建 Hyperdrive，并绑定到 Neon
4. 在 `wrangler.jsonc` 里配置 `HYPERDRIVE`
5. 配置 `AUTH_COOKIE_SECRET`
6. 不要再依赖阿里云那套部署方式作为主线

## 数据库表

当前后端依赖两张核心表：

- `users`
- `sessions`

对应定义在 [schema.sql](/G:/jiu-ai-music/jiu-app/lib/server/schema.sql)。

## 代码结构

- `app/api/*`：HTTP 接口
- `lib/server/*`：服务端身份、会话和数据库适配层
- `lib/auth/*`：前后端共享的身份类型
- `stores/globalStore.ts`：前端本地状态

## 当前边界

- 游客账号已经可用
- 邮箱登录还没做
- 作品、收藏、进度后面会继续挂到同一套用户体系上
- 大文件以后再接 R2 或其他对象存储
