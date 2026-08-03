# Jiu App

Jiu 是一个面向儿童音乐启蒙与 AI 创作的 Next.js 应用。当前仓库已经完成了“游客优先”的最小后端闭环：

- 访客首次进入会创建游客身份
- 访客会话通过 HTTP-only 签名 cookie 维持
- 当前用户查询走 `/api/me`
- 退出登录走 `/api/auth/logout`
- 身份和会话数据已经切到 PostgreSQL 兼容存储

## 本地开发

```bash
npm install
npm run dev
```

打开 `http://localhost:3000` 即可。

如果你要在本地烟雾测试游客链路，需要显式打开本地回退：

```bash
$env:JIU_ALLOW_LOCAL_AUTH_STORE='true'
npm run dev
```

## 环境变量

必需变量：

```bash
DATABASE_URL=
AUTH_COOKIE_SECRET=
```

仅本地烟雾测试使用：

```bash
JIU_ALLOW_LOCAL_AUTH_STORE=true
JIU_AUTH_STORE_PATH=
```

- `DATABASE_URL`：阿里云 RDS PostgreSQL 或其他 PostgreSQL 兼容库的连接串
- `AUTH_COOKIE_SECRET`：用于签名 session cookie 的长随机字符串
- `JIU_ALLOW_LOCAL_AUTH_STORE`：只允许开发机上的文件存储回退，不要在预发/生产环境设置
- `JIU_AUTH_STORE_PATH`：可选，覆盖本地文件存储位置

## 当前后端边界

现在的后端只做三件事：

1. 创建游客用户
2. 读取当前会话对应的用户
3. 注销当前会话

这意味着：

- 草稿、临时 UI 状态、学院进度仍然可以继续放在前端本地存储里
- 用户身份和会话已经有服务端归属
- 以后接邮箱登录时，可以在同一套 `users` / `sessions` 结构上扩展，不用重做整个账号系统

## 阿里云 FC Web 函数部署

如果你的目标是阿里云 FC Web 函数，推荐把它当成“Next.js App Router + Node 运行时 + PostgreSQL”的组合来配：

1. 创建一台 PostgreSQL 兼容数据库，优先用阿里云 RDS PostgreSQL
2. 在 FC 函数环境变量里配置 `DATABASE_URL`
3. 配置一个足够长的 `AUTH_COOKIE_SECRET`
4. 不要在生产环境设置 `JIU_ALLOW_LOCAL_AUTH_STORE`
5. 先执行 `npm run build`
6. 把构建产物部署到 FC Web 函数运行环境

当前仓库里保留的本地开发目标是：

- `npm run dev`：本地开发
- `npm run build`：生产构建
- `npm run start`：本地启动生产构建结果

## 数据库表

当前后端依赖两张表：

- `users`
- `sessions`

对应定义在 `jiu-app/lib/server/schema.sql`。

## 你最关心的结论

- 这不是纯前端项目了
- 现在已经有可接阿里云的后端边界
- 登录系统的正式版以后再加，但游客体系已经可以先跑通
- 你现在先配 `DATABASE_URL` 和 `AUTH_COOKIE_SECRET`，就能把游客账号链路先立起来
