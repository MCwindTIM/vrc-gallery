# 土豆 VRChat Gallery

VRChat photo gallery — [vrc.mcwind.cloud](https://vrc.mcwind.cloud)

**Languages:** [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [日文](README.jp.md)

npm-workspaces monorepo (React + Express). Public masonry gallery with month filter, lightbox and VRChat metadata; private-network-only `/admin` for upload, edit, rename, delete, orientation and show/hide.

## Features

- **Gallery** — masonry grid, infinite scroll, month filter (`?month=YYYY-MM`), lightbox (← → / Esc / R rotate, swipe)
- **Metadata** — capture time, world, author, description, user comment from XMP; day/month grouping in `Asia/Taipei`, 24-hour timestamps
- **Admin** — drag-and-drop upload, edit, rename, delete; display orientation; visibility + month filters; ordered masonry (newest top-left)
- **Sync** — scans `photos/`, generates WebP thumbnails and `photos.json`; skips non-images; preserves admin edits on re-sync
- **Security hardening** — per-IP login throttling, staged uploads (same-name upload can never overwrite an original), path-traversal-safe rename, no framework fingerprint header, authenticated logout

## Stack

React 19 · Vite 6 · Tailwind 4 · Express 5 · Sharp · Multer · framer-motion  
Fonts: Klee One (handwriting), Noto Sans TC/SC (UI), LXGW WenKai Lite (mixed CJK names)

## Project structure

```
vrc-gallery/
├── client/              → client/dist/       # Vite SPA (gallery + admin UI)
├── server/              → server/dist/       # Express API + static hosting
├── photos/              # originals + thumbs/ (gitignored)
├── data/photos.json     # catalog (gitignored)
├── scripts/             # deploy.sh, prod.sh, docker-import.sh
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs # PM2 process file
└── .env.example
```

## Quick start

**Dev** (no build needed):

```bash
npm install && cp .env.example .env
mkdir -p photos data && npm run sync-photos
npm run dev          # Vite :5173 (proxies /api, /photos) + API :8787
```

**Production**:

```bash
npm ci && cp .env.example .env && mkdir -p photos data
npm run build && npm start    # prestart runs sync-photos:prod
```

Or `./scripts/deploy.sh` → `./scripts/prod.sh` (loads `.env`).

**Update**:

```bash
git pull && npm ci && npm run build && pm2 restart vrc-gallery   # PM2
# or: docker compose up -d --build                                # Docker
```

> `.env` is not loaded automatically — use `prod.sh`, PM2 `env`, docker-compose `environment`, or `export` before `npm start`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite (client) + tsx watch (server) |
| `npm run build` | `build:client` (vite build) + `build:server` (tsc) |
| `npm run prod` | build + start |
| `npm start` | `prestart` → `sync-photos:prod`; then serve SPA + API |
| `npm run sync-photos` | scan `photos/` (dev, tsx) |
| `npm run sync-photos:prod` | scan `photos/` (built) |

## Photo catalog

1. Add images to `photos/` (`.jpg` `.jpeg` `.png` `.webp`)
2. `npm run sync-photos` → writes `photos/thumbs/{id}_thumb.webp` (max 640px, WebP q82) and `data/photos.json`

**Capture date priority:** XMP `CreateDate` → VRChat filename (`VRChat_YYYY-MM-DD_HH-MM-SS[.fff]`, `+08:00` offset) → file creation time

**Re-sync preserves admin edits:** `hidden`, `displayOrientation`, `date`, `annotation`  
While running, add files then run `npm run sync-photos:prod` — the API reloads when `photos.json` changes (mtime check per request).

| Catalog field | Description |
|---------------|-------------|
| `name` / `url` / `thumb` | filename stem / `/photos/...` / `/photos/thumbs/...` |
| `date` | ISO capture time (admin-editable) |
| `width` / `height` | original pixel dimensions |
| `annotation` | optional `world` / `author` / `description` / `userComment` from XMP or admin |
| `displayOrientation` | `portrait` / `landscape`; omit = auto from pixels |
| `hidden` | `true` = hidden from public gallery/stats; still in admin |

> Note on `hidden`: it hides a photo from the public API list and stats only. Originals are served statically under `/photos/*`, so a direct URL still works. Treat `hidden` as curation, not access control.

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
| `/app/photos` | originals + `thumbs/` |
| `/app/data` | `photos.json` |

Import an image on another machine: `./scripts/docker-import.sh [path/to/vrc-gallery-image.tar]`  
Compose forwards `TRUST_PROXY` (default `1`); keep `ADMIN_PASSWORD` / `ADMIN_JWT_SECRET` set for a public deployment.

### Reverse proxy (nginx)

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

Set `TRUST_PROXY=1` behind any reverse proxy (see Environment).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8787` | listen port |
| `PHOTOS_DIR` | `./photos` | original-image directory |
| `DATA_DIR` | `./data` | catalog directory |
| `CATALOG_PATH` | `$DATA_DIR/photos.json` | override catalog file path |
| `PHOTO_TZ` | `Asia/Taipei` | day/month grouping timezone |
| `PHOTO_TZ_OFFSET` | `+08:00` | VRChat filename TZ fallback |
| `NODE_ENV` | — | `production` hides API error details |
| `CORS_ORIGIN` | reflect-all | set explicitly in production (e.g. `https://vrc.mcwind.cloud`) |
| `TRUST_PROXY` | — | `1` behind nginx/Caddy/Compose; `0` for direct LAN HTTP |
| `ADMIN_PASSWORD` | — | admin login (requires private-network IP + password) |
| `ADMIN_JWT_SECRET` | derived from password | cookie HMAC secret; set a dedicated random value |
| `ADMIN_SESSION_HOURS` | `24` | session lifetime |
| `ADMIN_COOKIE_SECURE` | auto | `Secure` on HTTPS; `0` for `http://192.168.x.x` LAN |

Dev only: `VITE_API_PROXY` / `VITE_PHOTO_PROXY` (default `http://127.0.0.1:8787`).

## Admin

| Client origin | `/admin` page | `/api/admin/*` |
|---------------|---------------|----------------|
| Private IP (LAN / loopback) | login UI | session cookie required |
| Public IP (or spoofed public XFF) | 302 → `/` | 302 → `/` |

**Login throttling:** per client IP — after 5 failed attempts within 60 s the IP is blocked with `429` for 60 s; a successful login resets the counter (in-memory, resets on restart).

**Features:** upload · edit metadata · rename · delete · orientation · show/hide · visibility filter (all/visible/hidden) · month filter · ordered masonry (newest → oldest, left-to-right)

**Admin API** (private network + session cookie except `login`; `logout` requires the cookie):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/access` | access status (`clientIp`, `privateNetwork`, auth) |
| `POST` | `/api/admin/login` | login (`{ password }`); throttled (see above) |
| `POST` | `/api/admin/logout` | logout (requires session) |
| `GET` | `/api/admin/photos` | full catalog (incl. hidden) |
| `POST` | `/api/admin/photos` | upload — `multipart/form-data`, field `files`, ≤10 files × ≤50MB, `.jpg/.jpeg/.png/.webp`; content verified with Sharp |
| `PATCH` | `/api/admin/photos/:id` | update `name` / `date` / `annotation` / `displayOrientation` / `hidden` |
| `DELETE` | `/api/admin/photos/:id` | delete original + thumbnail |

**Upload behavior (safe by design):** files are staged in an OS temp directory first. The name is validated, then duplicates (same id already in catalog or same file already on disk) are rejected with `400 "A photo with this filename already exists"` **before** anything is written into `photos/` — a same-name upload can never overwrite or delete an existing original. Rename (`PATCH name`) rejects path separators (`/`, `\`, NUL), `.`, `..` and empty names (`400`) so it cannot move files outside `PHOTOS_DIR`.

## Security notes

- **Network boundary:** the whole `/api/admin` API and the `/admin` UI require a private-network client IP (RFC1918 / loopback). With `TRUST_PROXY=0` forwarded headers are only honored from private sockets, so a public caller cannot fake its way in; a reverse proxy must set `TRUST_PROXY=1` so real client IPs are used.
- **Session cookie:** `vrc_admin`, `HttpOnly`, `SameSite=Strict`, `Path=/`, max-age = `ADMIN_SESSION_HOURS`; `Secure` auto-enabled on HTTPS (`ADMIN_COOKIE_SECURE` to override).
- **Login:** throttled per IP (5 failures / 60 s → `429` for 60 s); password compared in constant time.
- **Uploads:** staged then validated (extension, duplicate, Sharp decode) before entering `photos/`; no overwrite path.
- **Rename / delete:** rename validates display names against traversal; delete only removes paths derived from the catalog.
- **Fingerprinting:** `X-Powered-By` is disabled.
- **Hidden ≠ private:** `hidden` hides from public API/stats only (see Photo catalog note).

## Public API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | health check (`{ ok, service }`) |
| `GET` | `/api/photos/stats` | visible totals + month counts (excludes hidden) |
| `GET` | `/api/photos` | paginated visible list: `page` `limit` (≤50) `month` (`YYYY-MM`) `year` `q` |
| `GET` | `/api/photos/:id` | single photo + `prev`/`next` within the current filter |
| `GET` | `/photos.json` | legacy flat catalog (visible only) |
| `GET` | `/photos/*` | static originals + thumbnails |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| LAN `/admin` redirects to `/` | use `TRUST_PROXY=0`; check `/api/admin/access` → `clientIp` is your LAN IP |
| Login returns `429` | too many failures from your IP — wait 60 s or check nothing else is hammering it |
| Login OK but API `401` | no `Secure` cookie on HTTP LAN → `ADMIN_COOKIE_SECURE=0` |
| Upload returns "already exists" | that filename/id is taken — rename the file or use a different name (existing photo is untouched) |
| Admin settings lost on restart | update the server; `sync-photos` preserves `hidden`, `date`, `displayOrientation`, `annotation` |
| Changes not applied | `npm run build` + restart both client and server |
| Docker messy dirs | keep `photos` and `data` on separate volumes |
| Mixed simplified glyphs | Noto SC fallback in UI; photo names use LXGW WenKai Lite |
