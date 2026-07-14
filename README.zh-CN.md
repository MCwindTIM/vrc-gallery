# 土豆 VRChat Gallery

VRChat 照片相册 — [vrc.mcwind.cloud](https://vrc.mcwind.cloud)

**语言：** [English](README.md) · [繁體中文](README.zh-TW.md) · [日文](README.zh-TW.md)

npm workspaces monorepo（React + Express）。公开相册含月份筛选、灯箱、VRChat 元数据；内网 `/admin` 管理上传、编辑、显示方向、显示/隐藏。

## 功能

- **Gallery** — 瀑布流、无限滚动、月份筛选（`?month=YYYY-MM`）、灯箱（← → Esc / R 旋转）
- **Metadata** — XMP 拍摄时间、世界、作者、备注；日期分组用 `Asia/Taipei`，24 小时制
- **Admin** — 拖放上传、编辑、重命名、删除；显示方向；相册显示/隐藏；可见性过滤器
- **Sync** — 扫描 `photos/` 生成 WebP 缩图与 `photos.json`；跳过非图片文件

## 技术栈

React 19 · Vite 6 · Tailwind 4 · Express 5 · Sharp · Multer  
字体：Klee One（手写）、Noto Sans TC/SC（UI）、LXGW WenKai Lite（混合简繁名称）

## 项目结构

```
vrc-gallery/
├── client/              → client/dist/
├── server/              → server/dist/
├── photos/              # 原图 + thumbs/（gitignore）
├── data/photos.json     # 目录索引（gitignore）
├── scripts/             # deploy.sh, prod.sh, docker-import.sh
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs
└── .env.example
```

## 快速开始

**Dev**（不需 build）：

```bash
npm install && cp .env.example .env
mkdir -p photos data && npm run sync-photos
npm run dev          # :5173（proxy） + API :8787
```

**Production**：

```bash
npm ci && cp .env.example .env && mkdir -p photos data
npm run build && npm start    # prestart 会跑 sync-photos:prod
```

或 `./scripts/deploy.sh` → `./scripts/prod.sh`（会加载 `.env`）。

**更新**：

```bash
git pull && npm ci && npm run build && pm2 restart vrc-gallery
```

> `.env` 不会自动加载。直接 `npm start` 请先 `export` 或用 `prod.sh` / PM2 `env`。

## Scripts

| Script | 用途 |
|--------|------|
| `npm run dev` | Vite + tsx |
| `npm run build` | client + server |
| `npm run prod` | build + start |
| `npm start` | sync-photos:prod → 启动 API（含 SPA） |
| `npm run sync-photos` | 扫描 photos/（dev，tsx） |
| `npm run sync-photos:prod` | 扫描 photos/（built） |

## 照片目录

1. 放入 `photos/`（`.jpg` `.jpeg` `.png` `.webp`）
2. `npm run sync-photos` → 写入 `photos/thumbs/{id}_thumb.webp` 与 `data/photos.json`

**拍摄日期优先顺序：** XMP CreateDate → VRChat 文件名 → 文件创建时间

**Re-sync 会保留 admin 修改：** `hidden`、`displayOrientation`、`date`、`annotation`  
运行中新增图片：手动 `npm run sync-photos:prod`（API 会检测 `photos.json` 变更）

**Catalog 字段（admin 可改）：**

| 字段 | 说明 |
|------|------|
| `displayOrientation` | `portrait` / `landscape`；省略＝依像素自动 |
| `hidden` | `true`＝公开相册与统计隐藏；admin 仍可见 |

## 部署

### PM2

```bash
npm run build && pm2 start ecosystem.config.cjs
```

### Docker

```bash
mkdir -p photos data
docker compose up -d --build
```

**Volume 必须分开**（不可同一 volume 挂两个 path）：

| 容器路径 | 内容 |
|----------|------|
| `/app/photos` | 原图 + `thumbs/` |
| `/app/data` | `photos.json` |

导入镜像：`docker load -i vrc-gallery-image.tar && ./scripts/docker-import.sh`  
Portainer 后方有 proxy 时设 `TRUST_PROXY=1`。

### Reverse proxy（nginx 摘要）

```nginx
proxy_pass http://127.0.0.1:8787;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

## 环境变量

| Variable | Default | 说明 |
|----------|---------|------|
| `PORT` | `8787` | 监听端口 |
| `PHOTOS_DIR` | `./photos` | 原图目录 |
| `DATA_DIR` | `./data` | catalog 目录 |
| `PHOTO_TZ` | `Asia/Taipei` | 日期/月份分组 |
| `PHOTO_TZ_OFFSET` | `+08:00` | VRChat 文件名无 TZ 时的偏移 |
| `NODE_ENV` | — | `production` 隐藏 API 错误细节 |
| `CORS_ORIGIN` | reflect | 正式环境建议明确设置 |
| `TRUST_PROXY` | — | 有 nginx/Caddy 设 `1`；直连 LAN HTTP 设 `0` |
| `ADMIN_PASSWORD` | — | 后台密码（内网 IP + 登录） |
| `ADMIN_JWT_SECRET` | 衍生 | session cookie 签名 |
| `ADMIN_SESSION_HOURS` | `24` | session 时效 |
| `ADMIN_COOKIE_SECURE` | auto | HTTPS 自动 Secure；LAN HTTP 设 `0` |

Dev only：`VITE_API_PROXY` / `VITE_PHOTO_PROXY`（默认 `http://127.0.0.1:8787`）

## 后台 Admin

| 来源 | `/admin` | `/api/admin/*` |
|------|----------|----------------|
| 内网 IP | 登录页（可设密码） | 需 session cookie |
| 外网 | 302 → `/` | 302 → `/` |

**功能：** 上传 · 编辑 metadata · 重命名 · 删除 · 显示方向 · 相册显示/隐藏 · 过滤（全部/显示/隐藏）

**Admin API**（内网 + cookie）：

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/admin/access` | 访问状态（含 `clientIp`） |
| `POST` | `/api/admin/login` | 登录 |
| `POST` | `/api/admin/logout` | 登出 |
| `GET` | `/api/admin/photos` | 完整 catalog |
| `POST` | `/api/admin/photos` | 上传（`files`，最多 10 × 50MB） |
| `PATCH` | `/api/admin/photos/:id` | 更新 name / date / annotation / displayOrientation / hidden |
| `DELETE` | `/api/admin/photos/:id` | 删除 |

## 公开 API

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/photos/stats` | 总数、月份统计（不含 hidden） |
| `GET` | `/api/photos` | 分页：`page` `limit` `month` `year` `q` |
| `GET` | `/api/photos/:id` | 单张 + prev/next（filter 需与列表一致） |
| `GET` | `/photos.json` | 旧版 flat catalog |
| `GET` | `/photos/*` | 静态图片 |

## 疑难排解

| 问题 | 处理 |
|------|------|
| 内网 `/admin` 被 redirect | `TRUST_PROXY=0`；查 `/api/admin/access` 的 `clientIp` |
| 登录成功但 API 401 | LAN HTTP 时 cookie 勿用 `Secure` → `ADMIN_COOKIE_SECURE=0` |
| admin 设置重启后消失 | 需新版 server；`sync-photos` 会保留 `hidden` 等字段 |
| 设置没生效 | `npm run build` 后重启；client + server 都要更新 |
| Docker 目录混乱 | `photos` 与 `data` 分开 volume |
| 简繁字体不一致 | UI 用 Noto SC fallback；名称用 LXGW WenKai Lite |
