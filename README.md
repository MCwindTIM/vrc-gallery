# 土豆 VRChat Gallery

Full-stack photo gallery for [vrc.mcwind.cloud](https://vrc.mcwind.cloud) — browse VRChat screenshots with capture metadata, month filters, infinite scroll, and an internal admin panel for uploads and edits.

## Features

- **Gallery** — paginated masonry-style grid with infinite scroll, month filter, and lightbox; day/month grouping uses `Asia/Taipei` (+08:00), timestamps shown in 24-hour format (e.g. `2026/06/11 00:38`)
- **Month filter** — year-grouped dropdown; custom styled panel on desktop (`sm+`), native `<select>` on mobile; filter syncs to `?month=YYYY-MM` (shareable URLs, browser back/forward); subtitle shows filtered count (e.g. `12 張照片 · 2024年3月`)
- **Lightbox** — prev/next scoped to the active month filter (including cross-page neighbors via API); swipe/drag horizontally to change photos; keyboard ← → / Esc / R (rotate); load progress for large images with browser-cache awareness
- **VRChat metadata** — capture date from XMP `CreateDate` or `VRChat_YYYY-MM-DD_…` filenames; optional annotations (world, author, description, in-game comment) from embedded XMP
- **Admin panel** (`/admin`, internal network only) — upload (drag-and-drop, up to 10 files), edit metadata, rename, delete
- **Catalog sync** — CLI scans `photos/`, generates JPEG thumbnails, writes `data/photos.json`; non-image files (e.g. `photos.json`, `thumbs/`) are skipped automatically; catalog reloads when the file changes on disk
- **Backward compatible** — `GET /photos.json` serves the legacy flat catalog format

### Gallery URL

- `?month=YYYY-MM` — deep-link or share a month filter (e.g. `/?month=2024-03`)
- Omit the param to show all photos; invalid values are ignored
- Browser back/forward restores the previous filter

## Project structure

npm workspaces monorepo:

```
vrc-gallery/
├── client/          # React SPA (Vite) → client/dist/ after build
├── server/          # Express API → server/dist/ after build
├── scripts/         # deploy.sh, prod.sh, docker-import.sh
├── photos/          # Full-size images + thumbs/ (gitignored)
├── data/            # photos.json catalog (gitignored)
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs
├── .env.example
└── package.json
```

## Stack

- **Client:** React 19, Vite 6, Tailwind CSS 4, Framer Motion; fonts loaded via Google Fonts CDN (`fonts.loli.net` in mainland China, `fonts.googleapis.com` elsewhere)
- **Server:** Express 5, TypeScript, Sharp (thumbnails + metadata), Multer (uploads)

## Development

Dev mode does **not** require `npm run build`. Vite serves the client on the fly; the server runs TypeScript via `tsx`.

```bash
cd vrc-gallery
npm install
cp .env.example .env   # optional; defaults work for local dev
mkdir -p photos data
npm run sync-photos    # create data/photos.json (empty [] if no images yet)
npm run dev
```

- Frontend: http://localhost:5173 (proxies `/api`, `/photos`, and `/photos.json` to the API)
- API: http://localhost:8787

Place images in `photos/` (JPEG, PNG, or WebP), then run `npm run sync-photos` again to refresh the catalog and thumbnails.

## Production

Production **must** build both workspaces before start:

1. **Client** — `vite build` → `client/dist/` (static SPA)
2. **Server** — `tsc` → `server/dist/` (Node API + serves `client/dist`)

A single Node process on `PORT` (default `8787`) serves the SPA, `/api`, and `/photos`.

### npm scripts

| Script | When | What it does |
|--------|------|----------------|
| `npm run dev` | Local dev | Vite `:5173` + `tsx` API `:8787` — **no build** |
| `npm run build` | Deploy | `vite build` + `tsc` |
| `npm run prod` | Deploy | `build` then `start` (one-shot) |
| `npm start` | After build | `sync-photos:prod` then `node server/dist/index.js` |
| `npm run sync-photos` | Dev / manual | Scan `photos/` via `tsx` (no build needed) |
| `npm run sync-photos:prod` | After build | Scan `photos/` via compiled `server/dist/scripts/sync-photos.js` |

`npm start` runs `sync-photos:prod` first (via `prestart`), so thumbnails and `data/photos.json` stay in sync on every restart. After adding images while the server is already running, run `npm run sync-photos:prod` — the API reloads the catalog when `photos.json` changes on disk.

### First deploy

```bash
cd vrc-gallery
./scripts/deploy.sh      # npm ci, .env, mkdir, build, sync-photos:prod
./scripts/prod.sh        # load .env, npm start
```

Or step by step:

```bash
npm ci
cp .env.example .env     # set TRUST_PROXY, NODE_ENV, CORS_ORIGIN, etc.
mkdir -p photos data
# copy or rsync existing photos/ and data/photos.json if migrating
npm run prod             # build + start
```

App listens on http://localhost:8787 (or your `PORT`). Put nginx/Caddy in front for HTTPS.

### PM2

```bash
npm run build
pm2 start ecosystem.config.cjs
```

Customize env in `ecosystem.config.cjs` or override at runtime. PM2 runs `npm start`, so catalog sync runs on each (re)start.

### Docker

Build and run with Docker Compose:

```bash
mkdir -p photos data
docker compose up -d --build
```

App listens on http://localhost:8787. `npm start` inside the container runs `sync-photos:prod` on each start.

**Import a pre-built image** (e.g. on another machine or Portainer):

```bash
docker load -i vrc-gallery-image.tar
./scripts/docker-import.sh   # load image + docker compose up -d
```

**Volume mapping** — use **two separate** mounts; do not map the same volume to both paths:

| Host / volume | Container path | Contents |
|---------------|----------------|----------|
| `./photos` or `vrc-gallery-photos` | `/app/photos` | Original images + `thumbs/` |
| `./data` or `vrc-gallery-data` | `/app/data` | `photos.json` only |

Expected layout:

```
photos/
  image.png
  thumbs/
    image_thumb.jpg
data/
  photos.json
```

In Portainer: **Images → Import** to upload `vrc-gallery-image.tar`, then deploy via **Stacks** with `docker-compose.yml`. Set `TRUST_PROXY=1` when behind a reverse proxy.

### Update deploy

```bash
git pull
npm ci
npm run build
npm run sync-photos:prod   # if photos/ changed on disk
pm2 restart vrc-gallery     # or ./scripts/prod.sh
```

> **Note:** The app does not load `.env` automatically. Use `./scripts/prod.sh` (sources `.env`), PM2 `env`, or systemd `EnvironmentFile`. Export vars manually if you run `npm start` directly.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8787` | Server listen port |
| `NODE_ENV` | unset | Set to `production` to hide error details in API responses |
| `DATA_DIR` | `./data` | Directory containing `photos.json` |
| `CATALOG_PATH` | `{DATA_DIR}/photos.json` | Photo catalog file |
| `PHOTOS_DIR` | `./photos` | Original images; thumbnails go in `photos/thumbs/` |
| `PHOTO_TZ_OFFSET` | `+08:00` | Timezone offset for VRChat filename dates (no TZ in filename) |
| `PHOTO_TZ` | `Asia/Taipei` | IANA timezone for gallery day/month grouping, month filter, and stats (server) |
| `CORS_ORIGIN` | reflect request origin | Allowed CORS origin (set explicitly in production) |
| `TRUST_PROXY` | unset | Set to `1` behind a reverse proxy so admin IP checks use `X-Forwarded-For` / `X-Real-IP` |

When `TRUST_PROXY` is unset, forwarded headers are still trusted if the direct connection comes from a private IP (typical reverse-proxy setup).

**Dev-only (Vite):**

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_PROXY` | `http://127.0.0.1:8787` | API proxy target during `npm run dev` |
| `VITE_PHOTO_PROXY` | same as `VITE_API_PROXY` | `/photos` static proxy target |

## Photo catalog

1. Drop full-size images into `photos/` (supported: `.jpg`, `.jpeg`, `.png`, `.webp`)
2. Run `npm run sync-photos`

This writes `photos/thumbs/{id}_thumb.jpg` (max 640px, JPEG quality 82) and updates `data/photos.json`.

Sync and catalog load **skip** non-image files and directories in `photos/` (e.g. stray `photos.json`, `thumbs/`, other extensions) without failing. Unreadable image files are logged and skipped during sync. Admin upload silently ignores non-image files in a batch.

**Capture date** (in priority order):

1. XMP `CreateDate` or `tiff:DateTime`
2. `VRChat_YYYY-MM-DD_HH-MM-SS` filename (uses `PHOTO_TZ_OFFSET`)
3. Filesystem birth time

**Annotations** (optional, from XMP at sync/upload time): `WorldDisplayName`, `xmp:Author`, `dc:description` / `dc:title`, `exif:UserComment`. Shown in the lightbox and editable in admin.

**Dates & time display**

- Stored `date` values are ISO UTC strings from XMP / filename / filesystem at sync time
- Gallery day headers, month filter (`?month=YYYY-MM`), and `/api/photos/stats` month counts use **local calendar dates** in `Asia/Taipei` (override server-side with `PHOTO_TZ`)
- Lightbox and admin list timestamps use **24-hour** format: `YYYY/MM/DD HH:mm` (no 上午/下午)
- VRChat filename fallback still uses `PHOTO_TZ_OFFSET` when the filename has no timezone

## Admin (internal network only)

- **UI:** `/admin` (lazy-loaded; non-private clients are redirected to `/`)
- **API:** `/api/admin/*` (same IP restriction; returns `302` redirect to `/` for public IPs)

From a private-network IP (RFC 1918, loopback, link-local):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/access` | Check admin access |
| `GET` | `/api/admin/photos` | Full catalog (with IDs) |
| `POST` | `/api/admin/photos` | Upload images (`multipart/form-data`, field `files`, max 10 × 50 MB); non-image files in the batch are skipped |
| `PATCH` | `/api/admin/photos/:id` | Update `name`, `date`, `annotation` |
| `DELETE` | `/api/admin/photos/:id` | Remove image, thumbnail, and catalog entry |

Behind a reverse proxy, set `TRUST_PROXY=1` and forward the client IP:

```nginx
# nginx example
location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Optional: block admin from the public internet at the proxy layer
location ~ ^/(admin|api/admin) {
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    allow 192.168.0.0/16;
    allow 127.0.0.1;
    deny all;
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Public API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/photos/stats` | `{ total, months, latestDate, updatedAt }` |
| `GET` | `/api/photos` | Paginated list — query: `page`, `limit` (max 50), `month` (`YYYY-MM` or `YYYY`), `year`, `q` (name search) |
| `GET` | `/api/photos/:id` | Single photo with `prev` / `next` neighbors; pass the same `month` / `year` / `q` filters as the list endpoint so neighbors stay within the active filter |
| `GET` | `/photos.json` | Legacy catalog (no `id` / `year` fields) |
| `GET` | `/photos/*` | Static image files |

## Reverse proxy

Point your reverse proxy at the Node process on `PORT` (default `8787`). The production server serves the built SPA from `client/dist/`, API routes under `/api`, and images under `/photos`.
