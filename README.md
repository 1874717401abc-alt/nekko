# Nekko Studio Workspace

Nekko 自媒体工作室的内部协作工作台，包含项目、任务进度、灵感库、资料库、团队资料、每日打卡和管理控制台。

## 本地运行

```bash
npm install
npm run dev
```

默认访问地址是 `http://localhost:3000`。

## 环境变量

复制 `.env.local.example` 为 `.env.local`，并设置：

- `SESSION_SECRET`: 登录态签名密钥，生产环境必须是长随机字符串。
- `TEAM_INVITE_CODE`: 成员注册邀请码。
- `DEEPSEEK_API_KEY`: DeepSeek API Key，用于站内 AI 助手，必须只放在服务器环境变量或 `.env.local`。
- `DEEPSEEK_BASE_URL`: DeepSeek API 地址，默认 `https://api.deepseek.com`。
- `DEEPSEEK_MODEL`: AI 助手使用的模型，默认 `deepseek-v4-flash`。

## 功能结构

- `/assistant`: AI 助手，读取工作台项目、任务、灵感、资料、打卡和动态，输出创作策略、文案、复盘和行动建议。
- `/search`: 全局搜索，覆盖项目、任务、资料、灵感、进度记录和评论。
- `/projects`: 管理项目，并把任务、资料、灵感归到具体项目下。
- `/progress`: 任务看板，支持任务状态流转。
- `/progress/[id]`: 任务详情，支持负责人、优先级、截止日期、进度记录和评论。
- `/inspiration`: 灵感、链接、参考图片记录。
- `/library`: 视频、文档和素材链接归档。
- `/checkin`: 每日打卡。
- `/team`: 团队成员资料。
- `/admin`: 管理员控制台，管理成员权限、首页内容、JSON 数据备份和回收站。

## 数据存储

数据保存在 `data/nekko.db`。上传的头像和首页图片保存在 `data/uploads`。

业务数据通过单条新增、编辑、删除接口保存，避免前端整表覆盖造成多人协作时的数据丢失。删除项目、任务、灵感、资料和打卡时会先进入回收站，管理员可在 `/admin` 恢复或永久删除。关键动作会写入 `activity` 活动记录，用于首页团队动态和后续排查。

线上运行时，`data/nekko.db`、`data/uploads` 和 `public/uploads` 都是运行数据，不应直接提交到仓库。

AI 助手通过服务端接口调用 DeepSeek，前端不会接触 API Key。当前版本是只读助手，会基于工作台上下文给建议，不会直接改任务、删资料或发布内容。

## 部署

代码推送到 `main` 后，可以从本地执行：

```bash
npm run deploy
```

脚本会通过 SSH 到 `/opt/nekko`，备份 `data` 和上传目录，拉取 `main`，安装依赖，构建项目，重启 PM2 应用 `nekko`，并检查 `http://127.0.0.1:3000/login`。

## 验证

```bash
npm run lint
npm run build
```
