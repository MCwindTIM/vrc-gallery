# 土豆 VRChat Gallery

VRChat photo gallery — [vrc.mcwind.cloud](https://vrc.mcwind.cloud)

**Languages:** [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日文](README.jp.md)

npm workspaces monorepo (React + Express). Public gallery with month filter, lightbox, and VRChat metadata. Internal `/admin` for upload, edit, orientation, and show/hide.

## Features

- **Gallery** — masonry grid, infinite scroll, month filter (`?month=YYYY-MM`), lightbox (← → Esc / R rotate)
- **Metadata** — XMP capture time, world, author, notes; `Asia/Taipei` grouping, 24-hour timestamps
- **Admin** — drag-and-drop upload, edit, rename, delete; display orientation; ordered masonry grid (newest top-left); visibility + month filters (`YYYY-MM`)
- **Sync** — scans `photos/`, WebP thumbnails, `photos.json`; skips non-images

## Stack

React 19 · Vite 6 · Tailwind 4 · Express 5 · Sharp · Multer  
Fonts: Klee One, Noto Sans TC/SC, LXGW WenKai Lite (mixed CJK names)

## Project structure

```
vrc-gallery/
├── client/              → client/dist/
├── server/              → server/dist/
├── photos/              # originals + thumbs/ (gitignored)
├── data/photos.json     # catalog (gitignored)
├── scripts/             # deploy.sh, prod.sh, docker-import.sh
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs
└── .env.example
```

## Quick start

**Dev** (no build):

```bash
npm install && cp .env.example .env
mkdir -p photos data && npm run sync-photos
npm run dev          # :5173 (proxy) + API :8787
```

**Production**:

```bash
npm ci && cp .env.example .env && mkdir -p photos data
npm run build && npm start    # prestart runs sync-photos:prod
```

Or `./scripts/deploy.sh` → `./scripts/prod.sh` (loads `.env`).

**Update**:

```bash
git pull && npm ci && npm run build && pm2 restart vrc-gallery
```

> `.env` is not loaded automatically — use `prod.sh`, PM2 `env`, or export before `npm start`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite + tsx |
| `npm run build` | client + server |
| `npm run prod` | build + start |
| `npm start` | sync-photos:prod → serve SPA + API |
| `npm run sync-photos` | scan photos/ (dev) |
| `npm run sync-photos:prod` | scan photos/ (built) |

## Photo catalog

1. Add images to `photos/` (`.jpg` `.jpeg` `.png` `.webp`)
2. `npm run sync-photos` → `photos/thumbs/{id}_thumb.webp` + `data/photos.json`

**Capture date:** XMP CreateDate → VRChat filename → file birth time

**Re-sync preserves admin edits:** `hidden`, `displayOrientation`, `date`, `annotation`  
While running, add files then run `npm run sync-photos:prod` (API reloads on catalog change)

| Field | Description |
|-------|-------------|
| `displayOrientation` | `portrait` / `landscape`; omit = auto from pixels |
| `hidden` | `true` = hidden from public gallery/stats; still in admin |

## Deploy

### PM2

```bash
npm run build && pm2 start ecosystem.config.cjs
```

### Docker

```bash
mkdir -p photos data
docker compose up -d --build
```

**Use two separate volumes** (never mount one volume to both paths):

| Container path | Contents |
|----------------|----------|
| `/app/photos` | images + `thumbs/` |
| `/app/data` | `photos.json` |

Import image: `docker load -i vrc-gallery-image.tar && ./scripts/docker-import.sh`  
Behind a proxy in Portainer: set `TRUST_PROXY=1`.

### Reverse proxy (nginx)

```nginx
proxy_pass http://127.0.0.1:8787;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8787` | listen port |
| `PHOTOS_DIR` | `./photos` | image directory |
| `DATA_DIR` | `./data` | catalog directory |
| `PHOTO_TZ` | `Asia/Taipei` | day/month grouping |
| `PHOTO_TZ_OFFSET` | `+08:00` | VRChat filename TZ fallback |
| `NODE_ENV` | — | `production` hides API error details |
| `CORS_ORIGIN` | reflect | set explicitly in production |
| `TRUST_PROXY` | — | `1` behind nginx/Caddy; `0` for direct LAN HTTP |
| `ADMIN_PASSWORD` | — | admin login (private IP + password) |
| `ADMIN_JWT_SECRET` | derived | session cookie HMAC secret |
| `ADMIN_SESSION_HOURS` | `24` | session lifetime |
| `ADMIN_COOKIE_SECURE` | auto | Secure on HTTPS; `0` for `http://192.168.x.x` |

Dev only: `VITE_API_PROXY` / `VITE_PHOTO_PROXY` (default `http://127.0.0.1:8787`)

## Admin

| Client | `/admin` | `/api/admin/*` |
|--------|----------|----------------|
| Private IP | login UI | session cookie required |
| Public IP | 302 → `/` | 302 → `/` |

**Features:** upload · edit metadata · rename · delete · orientation · show/hide · visibility filter · month filter · ordered masonry (newest → oldest, left-to-right)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/access` | access status (`clientIp`, etc.) |
| `POST` | `/api/admin/login` | login |
| `POST` | `/api/admin/logout` | logout |
| `GET` | `/api/admin/photos` | full catalog |
| `POST` | `/api/admin/photos` | upload (`files`, max 10 × 50MB) |
| `PATCH` | `/api/admin/photos/:id` | update fields incl. `hidden` |
| `DELETE` | `/api/admin/photos/:id` | delete |

## Public API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | health check |
| `GET` | `/api/photos/stats` | totals, months (excludes hidden) |
| `GET` | `/api/photos` | paginated: `page` `limit` `month` `year` `q` |
| `GET` | `/api/photos/:id` | detail + prev/next |
| `GET` | `/photos.json` | legacy flat catalog |
| `GET` | `/photos/*` | static files |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| LAN `/admin` redirects to `/` | `TRUST_PROXY=0`; check `/api/admin/access` → `clientIp` |
| Login OK but API 401 | no `Secure` cookie on HTTP LAN → `ADMIN_COOKIE_SECURE=0` |
| Admin settings lost on restart | update server; sync preserves `hidden`, etc. |
| Changes not applied | `npm run build` + restart both client and server |
| Docker messy dirs | separate `photos` and `data` volumes |
| Mixed simplified glyphs | Noto SC fallback; names use LXGW WenKai Lite |
