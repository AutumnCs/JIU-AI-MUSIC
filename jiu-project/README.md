# Jiu 项目文档总览

> 当前版本基准日期：`2026-08-10`

## 文档分层

- `current/`：与当前代码和 Cloudflare Workers + D1 + R2 架构一致的主线文档。
- `archive/`：历史规划、旧方案和归档参考材料。

## 当前状态速览

- 前端主站已部署到 Cloudflare Workers。
- 后端数据由 Cloudflare D1 持久化，音乐音频使用 R2。
- 游客账号、session、音乐任务和社区交互已落地。
- 数据库结构由 `jiu-app/migrations/0001_init.sql` 管理。

## 入口

- [当前文档](./current/README.md)
- [归档文档](./archive/README.md)
