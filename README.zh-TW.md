# 土豆 VRChat Gallery

VRChat 相片相簿 — [vrc.mcwind.cloud](https://vrc.mcwind.cloud)

**語言：** [English](README.md) · [简体中文](README.zh-CN.md) · [日文](README.jp.md)

npm workspaces monorepo（React + Express）。公開瀑布流相簿，含月份篩選、燈箱與 VRChat 中繼資料；僅內網可達的 `/admin` 用於上傳、編輯、重新命名、刪除、顯示方向與顯示/隱藏。

## 功能

- **Gallery** — 瀑布流、無限捲動、月份篩選（`?month=YYYY-MM`）、燈箱（← → / Esc / R 旋轉、滑動切換）
- **Metadata** — 拍攝時間、世界、作者、說明、使用者備註（XMP 解析）；依 `Asia/Taipei` 分組、24 小時制
- **Admin** — 拖放上傳、編輯、重新命名、刪除；顯示方向；可見性 + 月份篩選；有序瀑布流（最新在左上）
- **Sync** — 掃描 `photos/` 產生 WebP 縮圖與 `photos.json`；略過非圖片；重新同步保留後台修改
- **安全強化** — 依 IP 登入限速、暫存上傳（同名上傳永遠不會覆蓋原圖）、防路徑穿越的重新命名、關閉框架指紋回應頭、登出需登入

## 技術棧

React 19 · Vite 6 · Tailwind 4 · Express 5 · Sharp · Multer · framer-motion  
字體：Klee One（手寫）、Noto Sans TC/SC（UI）、LXGW WenKai Lite（混合簡繁名稱）

## 專案結構

```
vrc-gallery/
├── client/              → client/dist/       # Vite SPA（相簿 + 管理介面）
├── server/              → server/dist/       # Express API + 靜態代管
├── photos/              # 原圖 + thumbs/（gitignore）
├── data/photos.json     # 目錄索引（gitignore）
├── scripts/             # deploy.sh, prod.sh, docker-import.sh
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs # PM2 程序設定
└── .env.example
```

## 快速開始

**Dev**（不需建置）：

```bash
npm install && cp .env.example .env
mkdir -p photos data && npm run sync-photos
npm run dev          # Vite :5173（代理 /api、/photos）+ API :8787
```

**Production**：

```bash
npm ci && cp .env.example .env && mkdir -p photos data
npm run build && npm start    # prestart 會執行 sync-photos:prod
```

或 `./scripts/deploy.sh` → `./scripts/prod.sh`（會載入 `.env`）。

**更新**：

```bash
git pull && npm ci && npm run build && pm2 restart vrc-gallery   # PM2
# 或：docker compose up -d --build                                # Docker
```

> `.env` 不會自動載入——請使用 `prod.sh`、PM2 `env`、docker-compose `environment`，或在 `npm start` 前自行 `export`。

## Scripts

| Script | 用途 |
|--------|------|
| `npm run dev` | Vite（client）+ tsx watch（server） |
| `npm run build` | `build:client`（vite build）+ `build:server`（tsc） |
| `npm run prod` | build + start |
| `npm start` | `prestart` → `sync-photos:prod`；隨後代管 SPA + API |
| `npm run sync-photos` | 掃描 `photos/`（dev，tsx） |
| `npm run sync-photos:prod` | 掃描 `photos/`（built） |

## 相片目錄

1. 將圖片放入 `photos/`（`.jpg` `.jpeg` `.png` `.webp`）
2. `npm run sync-photos` → 產生 `photos/thumbs/{id}_thumb.webp`（最長邊 640px，WebP q82）與 `data/photos.json`

**拍攝時間優先順序：** XMP `CreateDate` → VRChat 檔名（`VRChat_YYYY-MM-DD_HH-MM-SS[.fff]`，偏移 `+08:00`）→ 檔案建立時間

**重新同步會保留後台修改：** `hidden`、`displayOrientation`、`date`、`annotation`  
執行中加入新圖後執行 `npm run sync-photos:prod`——API 偵測到 `photos.json` 變更（逐請求檢查 mtime）即自動重載。

| Catalog 欄位 | 說明 |
|--------------|------|
| `name` / `url` / `thumb` | 檔名（不含副檔名）/ `/photos/...` / `/photos/thumbs/...` |
| `date` | ISO 拍攝時間（後台可改） |
| `width` / `height` | 原圖像素尺寸 |
| `annotation` | 可選 `world` / `author` / `description` / `userComment`（XMP 或後台填寫） |
| `displayOrientation` | `portrait` / `landscape`；省略 = 依像素自動 |
| `hidden` | `true` = 從公開相簿/統計隱藏；後台仍可見 |

> 關於 `hidden` 的說明：它僅從公開 API 列表與統計中隱藏相片。原圖仍由 `/photos/*` 靜態代管，直接 URL 依然可存取。請把 `hidden` 視為「整理歸類」，而非「存取控制」。

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

**Volume 必須分開**（不可將同一 volume 掛到兩個路徑）：

| 容器路徑 | 內容 |
|----------|------|
| `/app/photos` | 原圖 + `thumbs/` |
| `/app/data` | `photos.json` |

在另一台機器匯入映像：`./scripts/docker-import.sh [path/to/vrc-gallery-image.tar]`  
Compose 會透傳 `TRUST_PROXY`（預設 `1`）；公開部署務必設定 `ADMIN_PASSWORD` / `ADMIN_JWT_SECRET`。

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

任何反向代理之後都需設定 `TRUST_PROXY=1`（見環境變數）。

## 環境變數

| Variable | 預設 | 說明 |
|----------|------|------|
| `PORT` | `8787` | 監聽埠 |
| `PHOTOS_DIR` | `./photos` | 原圖目錄 |
| `DATA_DIR` | `./data` | 目錄索引目錄 |
| `CATALOG_PATH` | `$DATA_DIR/photos.json` | 覆蓋 catalog 檔路徑 |
| `PHOTO_TZ` | `Asia/Taipei` | 日期/月份分組時區 |
| `PHOTO_TZ_OFFSET` | `+08:00` | VRChat 檔名缺時區時的回退偏移 |
| `NODE_ENV` | — | `production` 隱藏 API 錯誤細節 |
| `CORS_ORIGIN` | 反射全部 | 正式環境建議明確設定（如 `https://vrc.mcwind.cloud`） |
| `TRUST_PROXY` | — | nginx/Caddy/Compose 後設 `1`；直連 LAN HTTP 設 `0` |
| `ADMIN_PASSWORD` | — | 後台登入密碼（需內網 IP + 密碼） |
| `ADMIN_JWT_SECRET` | 由密碼衍生 | cookie HMAC 密鑰；建議單獨設定隨機值 |
| `ADMIN_SESSION_HOURS` | `24` | 工作階段時長 |
| `ADMIN_COOKIE_SECURE` | auto | HTTPS 自動加 `Secure`；`http://192.168.x.x` LAN 設 `0` |

Dev only：`VITE_API_PROXY` / `VITE_PHOTO_PROXY`（預設 `http://127.0.0.1:8787`）。

## 後台 Admin

| 用戶端來源 | `/admin` 頁面 | `/api/admin/*` |
|------------|---------------|----------------|
| 內網 IP（LAN / loopback） | 登入介面 | 需 session cookie |
| 公網 IP（或偽造公網 XFF） | 302 → `/` | 302 → `/` |

**登入限速：** 依用戶端 IP——60 秒內失敗 5 次後該 IP 被封鎖 60 秒並回傳 `429`；登入成功即清零（記憶體態，重啟後重置）。

**功能：** 上傳 · 編輯 metadata · 重新命名 · 刪除 · 顯示方向 · 顯示/隱藏 · 可見性篩選（全部/顯示/隱藏） · 月份篩選 · 有序瀑布流（最新 → 最舊，由左至右）

**Admin API**（除 `login` 外需內網 + session cookie；`logout` 需已登入）：

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/admin/access` | 存取狀態（`clientIp`、`privateNetwork`、認證狀態） |
| `POST` | `/api/admin/login` | 登入（`{ password }`）；有限速（見上） |
| `POST` | `/api/admin/logout` | 登出（需已登入） |
| `GET` | `/api/admin/photos` | 完整 catalog（含 hidden） |
| `POST` | `/api/admin/photos` | 上傳——`multipart/form-data`，欄位 `files`，≤10 個檔案 × ≤50MB，`.jpg/.jpeg/.png/.webp`；內容經 Sharp 驗證 |
| `PATCH` | `/api/admin/photos/:id` | 更新 `name` / `date` / `annotation` / `displayOrientation` / `hidden` |
| `DELETE` | `/api/admin/photos/:id` | 刪除原圖 + 縮圖 |

**上傳行為（安全設計）：** 檔案先進入作業系統暫存目錄。先驗證檔名，再拒絕重名（同名 id 已在 catalog 中、或同名檔案已存在於磁碟，均回傳 `400 "A photo with this filename already exists"`）——驗證全數通過前不會向 `photos/` 寫入任何內容，同名上傳永遠不可能覆蓋或刪除既有原圖。重新命名（`PATCH name`）會拒絕路徑分隔符（`/`、`\`、NUL）、`.`、`..` 與空名稱（`400`），因此無法把檔案移出 `PHOTOS_DIR`。

## 安全說明

- **網路邊界：** `/api/admin` 全部介面與 `/admin` 頁面都要求內網用戶端 IP（RFC1918 / loopback）。`TRUST_PROXY=0` 時僅來自私網 socket 的轉發標頭才被採信，公網呼叫者無法偽造通過；若置於反向代理之後必須設 `TRUST_PROXY=1`，才能取得真實用戶端 IP。
- **工作階段 Cookie：** `vrc_admin`，`HttpOnly`、`SameSite=Strict`、`Path=/`，有效期 = `ADMIN_SESSION_HOURS`；HTTPS 下自動加 `Secure`（可用 `ADMIN_COOKIE_SECURE` 覆蓋）。
- **登入：** 依 IP 限速（60 秒 5 次失敗 → 封 60 秒 `429`）；密碼為常數時間比較。
- **上傳：** 先暫存再驗證（副檔名、重名、Sharp 解碼）後才進入 `photos/`；不存在覆蓋路徑。
- **重新命名/刪除：** 重新命名對顯示名稱做防穿越驗證；刪除只移除由 catalog 推導出的路徑。
- **框架指紋：** 已關閉 `X-Powered-By`。
- **hidden ≠ 私有：** `hidden` 僅從公開 API/統計隱藏（見相片目錄說明）。

## 公開 API

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/health` | 健康檢查（`{ ok, service }`） |
| `GET` | `/api/photos/stats` | 可見相片總數與月份統計（不含 hidden） |
| `GET` | `/api/photos` | 分頁可見列表：`page` `limit`（≤50）`month`（`YYYY-MM`）`year` `q` |
| `GET` | `/api/photos/:id` | 單張相片 + 目前篩選下的 `prev`/`next` |
| `GET` | `/photos.json` | 舊版 flat catalog（僅可見） |
| `GET` | `/photos/*` | 靜態原圖與縮圖 |

## 疑難排解

| 問題 | 處理 |
|------|------|
| LAN `/admin` 被重新導向到 `/` | 使用 `TRUST_PROXY=0`；查看 `/api/admin/access` → `clientIp` 是否是你的 LAN IP |
| 登入回傳 `429` | 該 IP 失敗次數過多——等 60 秒，或檢查是否有其他程式在刷介面 |
| 登入成功但 API `401` | LAN HTTP 下 cookie 不要 `Secure` → `ADMIN_COOKIE_SECURE=0` |
| 上傳回傳 "already exists" | 該檔名/id 已被佔用——換檔名或改個名字（既有相片不受影響） |
| admin 設定重啟後消失 | 更新 server；`sync-photos` 會保留 `hidden`、`date`、`displayOrientation`、`annotation` |
| 修改沒生效 | `npm run build` 後重啟；client 與 server 都要更新 |
| Docker 目錄混亂 | `photos` 與 `data` 使用獨立 volume |
| 簡繁字形不一致 | UI 用 Noto SC fallback；相片名用 LXGW WenKai Lite |
