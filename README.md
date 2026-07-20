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

## 功能结构

- `/projects`: 管理项目，并把任务、资料、灵感归到具体项目下。
- `/progress`: 任务看板，支持任务状态流转。
- `/progress/[id]`: 任务详情，支持负责人、优先级、截止日期、进度记录和评论。
- `/inspiration`: 灵感、链接、参考图片记录。
- `/library`: 视频、文档和素材链接归档。
- `/checkin`: 每日打卡。
- `/team`: 团队成员资料。
- `/admin`: 管理员控制台，管理成员权限、首页内容和 JSON 数据备份。

## 数据存储

数据保存在 `data/nekko.db`。上传的头像和首页图片保存在 `data/uploads`。

业务数据通过单条新增、编辑、删除接口保存，避免前端整表覆盖造成多人协作时的数据丢失。关键动作会写入 `activity` 活动记录，用于首页团队动态和后续排查。

## 验证

```bash
npm run lint
npm run build
```
