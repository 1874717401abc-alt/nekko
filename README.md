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
- `AI_BACKEND`: AI 助手后端，`deepseek` 为直连模型，`hermes` 为本机 Hermes Agent 网关。
- `DEEPSEEK_API_KEY`: DeepSeek API Key，必须只放在服务器环境变量或 `.env.local`。
- `DEEPSEEK_BASE_URL`: DeepSeek API 地址，默认 `https://api.deepseek.com`。
- `DEEPSEEK_MODEL`: DeepSeek 直连兜底模型，默认 `deepseek-v4-flash`。
- `HERMES_API_BASE_URL`: Hermes Agent API server 地址，线上默认 `http://127.0.0.1:8642/v1`。
- `HERMES_API_KEY`: Hermes API server bearer token，只给服务端使用。
- `HERMES_MODEL`: Hermes 对外暴露的 agent 模型名，默认 `hermes-agent`。
- `RADAR_CRON_SECRET`: 内容雷达定时任务密钥，供服务器本机 cron 调用。

## 功能结构

- `/assistant`: AI 助手，读取工作台项目、任务、灵感、资料、打卡和动态，输出创作策略、文案、复盘和行动建议；支持保存多轮对话、上传 txt/md/csv/json/html/pdf/docx 文件，并尝试读取消息里的公开链接。
- `/agent`: 任务执行中心，把一句目标拆成可追踪步骤，执行站内白名单动作，并保存每一步状态和结果。
- `/api/ai/content-radar`: 内容雷达接口，会读取 B站公开热门/排行榜信号，通过 Hermes Agent 生成原创选题，并写入灵感库；管理员可在灵感页手动触发，服务器 cron 可每日自动触发。
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

AI 助手通过服务端接口调用模型或 Hermes Agent，前端不会接触 API Key。对话、消息和附件提取文本会保存到 SQLite，方便按对话继续上下文。`AI_BACKEND=hermes` 时，每个 Nekko 对话会带独立 Hermes session header，Hermes 网关离线时可自动降级到 DeepSeek 直连。

Workspace Agent 支持有限白名单动作：创建项目、创建任务、创建灵感、创建资料、运行 B站内容雷达、整理内容雷达生成的灵感标签。模型只负责规划动作，服务端会按现有数据规则校验字段和权限后执行，并把执行结果写回对话。删除、改密码、登录外部平台、外部发布等高风险动作没有开放。

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
