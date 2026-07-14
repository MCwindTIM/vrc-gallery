# 土豆 VRChat Gallery

VRChat 相片相簿 — [vrc.mcwind.cloud](https://vrc.mcwind.cloud)

**語言：** [English](README.md) · [简体中文](README.zh-CN.md) · [日文](README.zh-TW.md)

npm workspaces monorepo（React + Express）。公開相簿含月份篩選、燈箱、VRChat 元數據；內網 `/admin` 管理上傳、編輯、顯示方向、顯示/隱藏。

## 功能

- **Gallery** — 瀑布流、無限捲動、月份篩選（`?month=YYYY-MM`）、燈箱（← → Esc / R 旋轉）
- **Metadata** — XMP 拍攝時間、世界、作者、備註；日期分組用 `Asia/Taipei`，24 小時制
- **Admin** — 拖放上傳、編輯、重新命名、刪除；顯示方向；相簿顯示/隱藏；可見性過濾器
- **Sync** — 掃描 `photos/` 產生 WebP 縮圖與 `photos.json`；略過非圖片檔

## 技術棧

React 19 · Vite 6 · Tailwind 4 · Express 5 · Sharp · Multer  
字體：Klee One（手寫）、Noto Sans TC/SC（UI）、LXGW WenKai Lite（混合簡繁名稱）

## 專案結構

```
vrc-gallery/
├── client/              → client/dist/
├── server/              → server/dist/
├── photos/              # 原圖 + thumbs/（gitignore）
├── data/photos.json     # 目錄索引（gitignore）
├── scripts/             # deploy.sh, prod.sh, docker-import.sh
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs
└── .env.example
```

## 快速開始

**Dev**（不需 build）：

```bash
npm install && cp .env.example .env
mkdir -p photos data && npm run sync-photos
npm run dev          # :5173（proxy） + API :8787
```

**Production**：

```bash
npm ci && cp .env.example .env && mkdir -p photos data
npm run build && npm start    # prestart 會跑 sync-photos:prod
```

或 `./scripts/deploy.sh` → `./scripts/prod.sh`（會載入 `.env`）。

**更新**：

```bash
git pull && npm ci && npm run build && pm2 restart vrc-gallery
```

> `.env` 不會自動載入。直接 `npm start` 請先 `export` 或用 `prod.sh` / PM2 `env`。

## Scripts

| Script | 用途 |
|--------|------|
| `npm run dev` | Vite + tsx |
| `npm run build` | client + server |
| `npm run prod` | build + start |
| `npm start` | sync-photos:prod → 啟動 API（含 SPA） |
| `npm run sync-photos` | 掃描 photos/（dev，tsx） |
| `npm run sync-photos:prod` | 掃描 photos/（built） |

## 相片目錄

1. 放入 `photos/`（`.jpg` `.jpeg` `.png` `.webp`）
2. `npm run sync-photos` → 寫入 `photos/thumbs/{id}_thumb.webp` 與 `data/photos.json`

**拍攝日期優先順序：** XMP CreateDate → VRChat 檔名 → 檔案建立時間

**Re-sync 會保留 admin 修改：** `hidden`、`displayOrientation`、`date`、`annotation`  
執行中新增圖片：手動 `npm run sync-photos:prod`（API 會偵測 `photos.json` 變更）

**Catalog 欄位（admin 可改）：**

| 欄位 | 說明 |
|------|------|
| `displayOrientation` | `portrait` / `landscape`；省略＝依像素自動 |
| `hidden` | `true`＝公開相簿與統計隱藏；admin 仍可見 |

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

**Volume 必須分開**（不可同一 volume 掛兩個 path）：

| 容器路徑 | 內容 |
|----------|------|
| `/app/photos` | 原圖 + `thumbs/` |
| `/app/data` | `photos.json` |

匯入映像：`docker load -i vrc-gallery-image.tar && ./scripts/docker-import.sh`  
Portainer 後方有 proxy 時設 `TRUST_PROXY=1`。

### Reverse proxy（nginx 摘要）

```nginx
proxy_pass http://127.0.0.1:8787;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

## 環境變數

| Variable | Default | 說明 |
|----------|---------|------|
| `PORT` | `8787` | 監聽埠 |
| `PHOTOS_DIR` | `./photos` | 原圖目錄 |
| `DATA_DIR` | `./data` | catalog 目錄 |
| `PHOTO_TZ` | `Asia/Taipei` | 日期/月份分組 |
| `PHOTO_TZ_OFFSET` | `+08:00` | VRChat 檔名無 TZ 時的偏移 |
| `NODE_ENV` | — | `production` 隱藏 API 錯誤細節 |
| `CORS_ORIGIN` | reflect | 正式環境建議明確設定 |
| `TRUST_PROXY` | — | 有 nginx/Caddy 設 `1`；直連 LAN HTTP 設 `0` |
| `ADMIN_PASSWORD` | — | 後台密碼（內網 IP + 登入） |
| `ADMIN_JWT_SECRET` | 衍生 | session cookie 簽名 |
| `ADMIN_SESSION_HOURS` | `24` | session 時效 |
| `ADMIN_COOKIE_SECURE` | auto | HTTPS 自動 Secure；LAN HTTP 設 `0` |

Dev only：`VITE_API_PROXY` / `VITE_PHOTO_PROXY`（預設 `http://127.0.0.1:8787`）

## 後台 Admin

| 來源 | `/admin` | `/api/admin/*` |
|------|----------|----------------|
| 內網 IP | 登入頁（可設密碼） | 需 session cookie |
| 外網 | 302 → `/` | 302 → `/` |

**功能：** 上傳 · 編輯 metadata · 重新命名 · 刪除 · 顯示方向 · 相簿顯示/隱藏 · 過濾（全部/顯示/隱藏）

**Admin API**（內網 + cookie）：

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/admin/access` | 存取狀態（含 `clientIp`） |
| `POST` | `/api/admin/login` | 登入 |
| `POST` | `/api/admin/logout` | 登出 |
| `GET` | `/api/admin/photos` | 完整 catalog |
| `POST` | `/api/admin/photos` | 上傳（`files`，最多 10 × 50MB） |
| `PATCH` | `/api/admin/photos/:id` | 更新 name / date / annotation / displayOrientation / hidden |
| `DELETE` | `/api/admin/photos/:id` | 刪除 |

## 公開 API

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/health` | 健康檢查 |
| `GET` | `/api/photos/stats` | 總數、月份統計（不含 hidden） |
| `GET` | `/api/photos` | 分頁：`page` `limit` `month` `year` `q` |
| `GET` | `/api/photos/:id` | 單張 + prev/next（filter 需與列表一致） |
| `GET` | `/photos.json` | 舊版 flat catalog |
| `GET` | `/photos/*` | 靜態圖片 |

## 疑難排解

| 問題 | 處理 |
|------|------|
| 內網 `/admin` 被 redirect | `TRUST_PROXY=0`；查 `/api/admin/access` 的 `clientIp` |
| 登入成功但 API 401 | LAN HTTP 時 cookie 勿用 `Secure` → `ADMIN_COOKIE_SECURE=0` |
| admin 設定重啟後消失 | 需新版 server；`sync-photos` 會保留 `hidden` 等欄位 |
| 設定沒生效 | `npm run build` 後重啟；client + server 都要更新 |
| Docker 目錄混亂 | `photos` 與 `data` 分開 volume |
| 簡體字顯示不一致 | UI 用 Noto SC fallback；名稱用 LXGW WenKai Lite |
