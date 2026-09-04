# 土豆 VRChat Gallery

VRChat 照片相册 — [vrc.mcwind.cloud](https://vrc.mcwind.cloud)

**语言：** [English](README.md) · [繁體中文](README.zh-TW.md) · [日文](README.jp.md)

npm workspaces monorepo（React + Express）。公开瀑布流相册，含月份筛选、灯箱与 VRChat 元数据；仅内网可达的 `/admin` 用于上传、编辑、重命名、删除、显示方向与显示/隐藏。

## 功能

- **Gallery** — 瀑布流、无限滚动、月份筛选（`?month=YYYY-MM`）、灯箱（← → / Esc / R 旋转、滑动切换）
- **Metadata** — 拍摄时间、世界、作者、说明、用户备注（XMP 解析）；按 `Asia/Taipei` 分组、24 小时制
- **Admin** — 拖放上传、编辑、重命名、删除；显示方向；可见性 + 月份筛选；有序瀑布流（最新在左上）
- **Sync** — 扫描 `photos/` 生成 WebP 缩略图与 `photos.json`；跳过非图片；重新同步保留后台修改
- **安全加固** — 按 IP 登录限速、暂存上传（同名上传永远不会覆盖原图）、防路径穿越的重命名、关闭框架指纹响应头、登出需登录

## 技术栈

React 19 · Vite 6 · Tailwind 4 · Express 5 · Sharp · Multer · framer-motion  
字体：Klee One（手写）、Noto Sans TC/SC（UI）、LXGW WenKai Lite（混合简繁名称）

## 项目结构

```
vrc-gallery/
├── client/              → client/dist/       # Vite SPA（相册 + 管理界面）
├── server/              → server/dist/       # Express API + 静态托管
├── photos/              # 原图 + thumbs/（gitignore）
├── data/photos.json     # 目录索引（gitignore）
├── scripts/             # deploy.sh, prod.sh, docker-import.sh
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs # PM2 进程配置
└── .env.example
```

## 快速开始

**Dev**（无需构建）：

```bash
npm install && cp .env.example .env
mkdir -p photos data && npm run sync-photos
npm run dev          # Vite :5173（代理 /api、/photos）+ API :8787
```

**Production**：

```bash
npm ci && cp .env.example .env && mkdir -p photos data
npm run build && npm start    # prestart 会运行 sync-photos:prod
```

或 `./scripts/deploy.sh` → `./scripts/prod.sh`（会加载 `.env`）。

**更新**：

```bash
git pull && npm ci && npm run build && pm2 restart vrc-gallery   # PM2
# 或：docker compose up -d --build                                # Docker
```

> `.env` 不会自动加载——请使用 `prod.sh`、PM2 `env`、docker-compose `environment`，或在 `npm start` 前自行 `export`。

## Scripts

| Script | 用途 |
|--------|------|
| `npm run dev` | Vite（client）+ tsx watch（server） |
| `npm run build` | `build:client`（vite build）+ `build:server`（tsc） |
| `npm run prod` | build + start |
| `npm start` | `prestart` → `sync-photos:prod`；随后托管 SPA + API |
| `npm run sync-photos` | 扫描 `photos/`（dev，tsx） |
| `npm run sync-photos:prod` | 扫描 `photos/`（built） |

## 照片目录

1. 将图片放入 `photos/`（`.jpg` `.jpeg` `.png` `.webp`）
2. `npm run sync-photos` → 生成 `photos/thumbs/{id}_thumb.webp`（最长边 640px，WebP q82）与 `data/photos.json`

**拍摄时间优先级：** XMP `CreateDate` → VRChat 文件名（`VRChat_YYYY-MM-DD_HH-MM-SS[.fff]`，偏移 `+08:00`）→ 文件创建时间

**重新同步会保留后台修改：** `hidden`、`displayOrientation`、`date`、`annotation`  
运行中新增图片后执行 `npm run sync-photos:prod`——API 检测到 `photos.json` 变化（按请求检查 mtime）即自动重载。

| Catalog 字段 | 说明 |
|--------------|------|
| `name` / `url` / `thumb` | 文件名（不含扩展名）/ `/photos/...` / `/photos/thumbs/...` |
| `date` | ISO 拍摄时间（后台可改） |
| `width` / `height` | 原图像素尺寸 |
| `annotation` | 可选 `world` / `author` / `description` / `userComment`（XMP 或后台填写） |
| `displayOrientation` | `portrait` / `landscape`；省略 = 按像素自动 |
| `hidden` | `true` = 从公开相册/统计隐藏；后台仍可见 |

> 关于 `hidden` 的说明：它仅从公开 API 列表与统计中隐藏照片。原图仍由 `/photos/*` 静态托管，直接 URL 依然可访问。请把 `hidden` 视为「整理归类」，而非「访问控制」。

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

**Volume 必须分开**（不可将同一 volume 挂到两个路径）：

| 容器路径 | 内容 |
|----------|------|
| `/app/photos` | 原图 + `thumbs/` |
| `/app/data` | `photos.json` |

在另一台机器导入镜像：`./scripts/docker-import.sh [path/to/vrc-gallery-image.tar]`  
Compose 会透传 `TRUST_PROXY`（默认 `1`）；公开部署务必设置 `ADMIN_PASSWORD` / `ADMIN_JWT_SECRET`。

### 反向代理（nginx）

```nginx
server {
    server_name gallery.example.com;
    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

任何反向代理之后都需设置 `TRUST_PROXY=1`（见环境变量）。

## 环境变量

| Variable | 默认 | 说明 |
|----------|------|------|
| `PORT` | `8787` | 监听端口 |
| `PHOTOS_DIR` | `./photos` | 原图目录 |
| `DATA_DIR` | `./data` | 目录索引目录 |
| `CATALOG_PATH` | `$DATA_DIR/photos.json` | 覆盖 catalog 文件路径 |
| `PHOTO_TZ` | `Asia/Taipei` | 日期/月份分组时区 |
| `PHOTO_TZ_OFFSET` | `+08:00` | VRChat 文件名缺时区时的回退偏移 |
| `NODE_ENV` | — | `production` 隐藏 API 错误细节 |
| `CORS_ORIGIN` | 反射全部 | 生产环境建议显式设置（如 `https://vrc.mcwind.cloud`） |
| `TRUST_PROXY` | — | nginx/Caddy/Compose 后设 `1`；直连 LAN HTTP 设 `0` |
| `ADMIN_PASSWORD` | — | 后台登录密码（需内网 IP + 密码） |
| `ADMIN_JWT_SECRET` | 由密码派生 | cookie HMAC 密钥；建议单独设置随机值 |
| `ADMIN_SESSION_HOURS` | `24` | 会话时长 |
| `ADMIN_COOKIE_SECURE` | auto | HTTPS 自动加 `Secure`；`http://192.168.x.x` LAN 设 `0` |

Dev only：`VITE_API_PROXY` / `VITE_PHOTO_PROXY`（默认 `http://127.0.0.1:8787`）。

## 后台 Admin

| 客户端来源 | `/admin` 页面 | `/api/admin/*` |
|------------|---------------|----------------|
| 内网 IP（LAN / loopback） | 登录界面 | 需 session cookie |
| 公网 IP（或伪造公网 XFF） | 302 → `/` | 302 → `/` |

**登录限速：** 按客户端 IP——60 秒内失败 5 次后该 IP 被封锁 60 秒并返回 `429`；登录成功即清零（内存态，重启后重置）。

**功能：** 上传 · 编辑 metadata · 重命名 · 删除 · 显示方向 · 显示/隐藏 · 可见性筛选（全部/显示/隐藏） · 月份筛选 · 有序瀑布流（最新 → 最旧，从左到右）

**Admin API**（除 `login` 外需内网 + session cookie；`logout` 需已登录）：

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/admin/access` | 访问状态（`clientIp`、`privateNetwork`、认证状态） |
| `POST` | `/api/admin/login` | 登录（`{ password }`）；有限速（见上） |
| `POST` | `/api/admin/logout` | 登出（需已登录） |
| `GET` | `/api/admin/photos` | 完整 catalog（含 hidden） |
| `POST` | `/api/admin/photos` | 上传——`multipart/form-data`，字段 `files`，≤10 个文件 × ≤50MB，`.jpg/.jpeg/.png/.webp`；内容经 Sharp 校验 |
| `PATCH` | `/api/admin/photos/:id` | 更新 `name` / `date` / `annotation` / `displayOrientation` / `hidden` |
| `DELETE` | `/api/admin/photos/:id` | 删除原图 + 缩略图 |

**上传行为（安全设计）：** 文件先进入操作系统临时目录暂存。先校验文件名，再拒绝重名（同名 id 已在 catalog 中、或同名文件已存在于磁盘，均返回 `400 "A photo with this filename already exists"`）——校验全部通过前不会向 `photos/` 写入任何内容，同名上传永远不可能覆盖或删除既有原图。重命名（`PATCH name`）会拒绝路径分隔符（`/`、`\`、NUL）、`.`、`..` 与空名称（`400`），因此无法把文件移出 `PHOTOS_DIR`。

## 安全说明

- **网络边界：** `/api/admin` 全部接口与 `/admin` 页面都要求内网客户端 IP（RFC1918 / loopback）。`TRUST_PROXY=0` 时仅来自私网 socket 的转发头才被采信，公网调用者无法伪造通过；若置于反向代理之后必须设 `TRUST_PROXY=1`，才能取到真实客户端 IP。
- **会话 Cookie：** `vrc_admin`，`HttpOnly`、`SameSite=Strict`、`Path=/`，有效期 = `ADMIN_SESSION_HOURS`；HTTPS 下自动加 `Secure`（可用 `ADMIN_COOKIE_SECURE` 覆盖）。
- **登录：** 按 IP 限速（60 秒 5 次失败 → 封 60 秒 `429`）；密码为常数时间比较。
- **上传：** 先暂存再校验（扩展名、重名、Sharp 解码）后才进入 `photos/`；不存在覆盖路径。
- **重命名/删除：** 重命名对显示名称做防穿越校验；删除只移除由 catalog 推导出的路径。
- **框架指纹：** 已关闭 `X-Powered-By`。
- **hidden ≠ 私有：** `hidden` 仅从公开 API/统计隐藏（见照片目录说明）。

## 公开 API

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/health` | 健康检查（`{ ok, service }`） |
| `GET` | `/api/photos/stats` | 可见照片总数与月份统计（不含 hidden） |
| `GET` | `/api/photos` | 分页可见列表：`page` `limit`（≤50）`month`（`YYYY-MM`）`year` `q` |
| `GET` | `/api/photos/:id` | 单张照片 + 当前筛选下的 `prev`/`next` |
| `GET` | `/photos.json` | 旧版 flat catalog（仅可见） |
| `GET` | `/photos/*` | 静态原图与缩略图 |

## 疑难排解

| 问题 | 处理 |
|------|------|
| LAN `/admin` 被重定向到 `/` | 使用 `TRUST_PROXY=0`；查看 `/api/admin/access` → `clientIp` 是否是你的 LAN IP |
| 登录返回 `429` | 该 IP 失败次数过多——等 60 秒，或检查是否有其他程序在刷接口 |
| 登录成功但 API `401` | LAN HTTP 下 cookie 不要 `Secure` → `ADMIN_COOKIE_SECURE=0` |
| 上传返回 "already exists" | 该文件名/id 已被占用——换文件名或改个名字（既有照片不受影响） |
| admin 设置重启后消失 | 更新 server；`sync-photos` 会保留 `hidden`、`date`、`displayOrientation`、`annotation` |
| 修改不生效 | `npm run build` 后重启；client 与 server 都要更新 |
| Docker 目录混乱 | `photos` 与 `data` 使用独立 volume |
| 简繁字形不一致 | UI 用 Noto SC fallback；照片名用 LXGW WenKai Lite |
