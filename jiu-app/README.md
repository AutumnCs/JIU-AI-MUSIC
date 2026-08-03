# Jiu App

Jiu 是一个面向儿童音乐启蒙与 AI 创作的 Next.js 应用。当前主线已经切到 **Cloudflare Workers + Hyperdrive + Neon Free Postgres**。

## 下一里程碑：游客优先的后端身份

- `POST /api/auth/guest` 在没有有效会话时创建游客身份；已有有效会话时直接返回该身份
- `GET /api/me` 读取当前用户
- `POST /api/auth/logout` 退出当前会话

应用启动时先从本地读取游客占位身份，保证界面可以立即渲染；接入后端引导时，先请求 `GET /api/me`，没有有效会话再请求 `POST /api/auth/guest`。服务端将会话写入签名的 HTTP-only cookie，浏览器端不能直接读取该 cookie。

当前的存储边界如下：

- PostgreSQL：游客/未来邮箱用户身份，以及会话的创建、校验和撤销。
- `localStorage`：工坊草稿、作品缓存、学院进度和其他临时 UI 状态；这些内容已按当前用户 ID 隔离，但还不是云端同步。

邮箱登录不在这个里程碑内，后续只会把同一用户体系从 `guest` 升级为 `email`，不应丢失已有归属数据。

## 本地开发

```bash
npm install
npm run dev
```

从 `.env.example` 创建本地环境文件后，将 `DATABASE_URL` 指向 Neon 的开发数据库，便于直接测试数据库链路。

需要的环境变量：

```bash
DATABASE_URL=
AUTH_COOKIE_SECRET=
```

- `DATABASE_URL`：本地开发使用的 PostgreSQL 连接串，通常指向 Neon 开发数据库
- `AUTH_COOKIE_SECRET`：用于签名 HTTP-only session cookie 的长随机字符串；生产环境必须设置

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
6. 阿里云部署说明仅保留为归档参考，不作为主线路径

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
