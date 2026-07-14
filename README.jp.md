# 土豆 VRChat Gallery

VRChat 写真ギャラリー — [vrc.mcwind.cloud](https://vrc.mcwind.cloud)

**他言語版:** [繁體中文](README.zh-TW.md) · [简体中文](README.zh-CN.md) · [English](README.md)

npm workspaces を採用したモノレポ構成（React + Express）による VRChat 写真ギャラリーです。月別フィルター、ライトボックス表示、VRChat メタデータ解析などを備え、撮影した写真を整理・閲覧できます。管理用の `/admin` パネルでは、写真のアップロード、編集、回転、公開状態の管理を行えます。

## 機能

- **ギャラリー** — メイソンリーグリッド（タイル型レイアウト）、無限スクロール、月別フィルター（`?month=YYYY-MM`）、ライトボックス（← → Esc / Rキーで回転）
- **メタデータ** — XMP撮影日時、ワールド、製作者、メモ。`Asia/Taipei`（台北時間）によるグループ化、24時間表記のタイムスタンプ
- **管理画面** — ドラッグ＆ドロップによるアップロード、編集、名前変更、削除。表示方向（回転）の調整。ソート済みのメイソンリーグリッド（左上が最新）。表示/非表示および月別フィルター（`YYYY-MM`）
- **同期** — `photos/` ディレクトリのスキャン、WebP サムネイルの生成、`photos.json` の更新。画像以外のファイルは自動でスキップ

## 技術スタック

React 19 · Vite 6 · Tailwind 4 · Express 5 · Sharp · Multer  
フォント: クレー One (Klee One)、Noto Sans TC/SC、霞鹜文楷 Lite (LXGW WenKai Lite)（日中韓の混在する名前向け）

## プロジェクト構造

```
vrc-gallery/
├── client/              → client/dist/（クライアント側ビルド）
├── server/              → server/dist/（サーバー側ビルド）
├── photos/              # オリジナル画像 + thumbs/（.gitignore 対象）
├── data/photos.json     # カタログ（.gitignore 対象）
├── scripts/             # deploy.sh, prod.sh, docker-import.sh
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs
└── .env.example
```

## クイックスタート

**開発環境**（ビルド不要）:

```bash
npm install && cp .env.example .env
mkdir -p photos data && npm run sync-photos
npm run dev          # :5173 (プロキシ経由) + API :8787
```

**本番環境**:

```bash
npm ci && cp .env.example .env && mkdir -p photos data
npm run build && npm start    # prestart時に sync-photos:prod が自動実行されます
```

または `./scripts/deploy.sh` → `./scripts/prod.sh`（`.env` を自動で読み込みます）を実行。

**アップデート**:

```bash
git pull && npm ci && npm run build && pm2 restart vrc-gallery
```

> `.env` は自動的には読み込まれません。`prod.sh`、PM2 の `env` を使用するか、`npm start` の前に手動で環境変数を export してください。

## スクリプト一覧

| スクリプト | 用途 |
|--------|---------|
| `npm run dev` | Vite + tsx (開発環境の起動) |
| `npm run build` | クライアント + サーバーのビルド |
| `npm run prod` | ビルドおよび本番環境での起動 |
| `npm start` | `sync-photos:prod` 実行後、SPAとAPIを配信 |
| `npm run sync-photos` | `photos/` のスキャン（開発環境用） |
| `npm run sync-photos:prod` | `photos/` のスキャン（ビルド済み環境用） |

## 写真カタログについて

1. `photos/` に画像を追加します（`.jpg` `.jpeg` `.png` `.webp`）
2. `npm run sync-photos` を実行すると、`photos/thumbs/{id}_thumb.webp` と `data/photos.json` が生成されます。

**撮影日時の優先順位:** XMPの `CreateDate` → VRChatのファイル名 → ファイルの作成日時（フォールバック）

**再同期しても管理画面での編集内容は保持されます:** `hidden`（非表示）、`displayOrientation`（表示方向）、`date`（日付）、`annotation`（メモなど）  
アプリの稼働中に新しくファイルを追加した場合は、`npm run sync-photos:prod` を実行してください（カタログの変更を検知してAPIが自動でリロードされます）。

| フィールド | 説明 |
|-------|-------------|
| `displayOrientation` | `portrait`（縦） / `landscape`（横）。省略時は画像のピクセルサイズから自動判定されます。 |
| `hidden` | `true` の場合、公開ギャラリーや統計から非表示になります（管理画面には引き続き表示されます）。 |

## デプロイ

### PM2

```bash
npm run build && pm2 start ecosystem.config.cjs
```

### Docker

```bash
mkdir -p photos data
docker compose up -d --build
```

**注意: 必ず2つの独立したボリュームを使用してください**（1つのボリュームを両方のパスに同時にマウントしないでください）:

| コンテナ内のパス | 内容 |
|----------------|----------|
| `/app/photos` | 画像本体 + `thumbs/` |
| `/app/data` | `photos.json` |

イメージのインポート: `docker load -i vrc-gallery-image.tar && ./scripts/docker-import.sh`  
Portainerなどのリバースプロキシ配下で稼働させる場合は、`TRUST_PROXY=1` を設定してください。

### リバースプロキシ (nginx) 設定例

```nginx
proxy_pass http://127.0.0.1:8787;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

## 環境変数

| 変数名 | デフォルト値 | 説明 |
|----------|---------|-------------|
| `PORT` | `8787` | リスンポート |
| `PHOTOS_DIR` | `./photos` | 画像ディレクトリのパス |
| `DATA_DIR` | `./data` | カタログ（メタデータ）保存先パス |
| `PHOTO_TZ` | `Asia/Taipei` | 日/月グループ化用のタイムゾーン |
| `PHOTO_TZ_OFFSET` | `+08:00` | VRChatファイル名解析用のフォールバックタイムゾーン |
| `NODE_ENV` | — | `production` に設定するとAPIエラーの詳細情報を非表示にします |
| `CORS_ORIGIN` | reflect | 本番環境では明示的に設定することを推奨します |
| `TRUST_PROXY` | — | nginx/Caddyなどの配下では `1`。LAN内直接アクセス（HTTP）の場合は `0` |
| `ADMIN_PASSWORD` | — | 管理画面ログイン用パスワード（プライベートIP + パスワード認証） |
| `ADMIN_JWT_SECRET` | 自動生成 | セッションクッキーの HMAC 署名用秘密鍵 |
| `ADMIN_SESSION_HOURS` | `24` | セッションの有効期限（時間） |
| `ADMIN_COOKIE_SECURE` | auto | HTTPS接続時はSecure属性を付与。`http://192.168.x.x` などのLAN内HTTP接続時は `0` に設定 |

開発環境のみ: `VITE_API_PROXY` / `VITE_PHOTO_PROXY` (デフォルト `http://127.0.0.1:8787`)

## 管理画面

| クライアント | `/admin` | `/api/admin/*` |
|--------|----------|----------------|
| プライベートIP | ログイン画面を表示 | セッションクッキーが必要 |
| グローバルIP | 302リダイレクト → `/` | 302リダイレクト → `/` |

**管理機能:** アップロード · メタデータ編集 · 名前変更 · 削除 · 表示方向の設定 · 表示/非表示 · 表示フィルター · 月別フィルター · ソート済みメイソンリーグリッド（最新順に左から右へ配置）

| メソッド | パス | 説明 |
|--------|------|-------------|
| `GET` | `/api/admin/access` | アクセスステータス（`clientIp` など）の確認 |
| `POST` | `/api/admin/login` | ログイン |
| `POST` | `/api/admin/logout` | ログアウト |
| `GET` | `/api/admin/photos` | 全写真カタログの取得 |
| `POST` | `/api/admin/photos` | アップロード（`files`、最大10個、各50MBまで） |
| `PATCH` | `/api/admin/photos/:id` | `hidden` を含むフィールド情報の更新 |
| `DELETE` | `/api/admin/photos/:id` | 写真の削除 |

## 公開 API

| メソッド | パス | 説明 |
|--------|------|-------------|
| `GET` | `/api/health` | ヘルスチェック |
| `GET` | `/api/photos/stats` | 統計情報（総数、月別。非表示の写真は除く） |
| `GET` | `/api/photos` | ページネーション対応リスト: `page` `limit` `month` `year` `q` |
| `GET` | `/api/photos/:id` | 詳細情報 + 前後の写真情報 |
| `GET` | `/photos.json` | 互換用フラットカタログ |
| `GET` | `/photos/*` | 静的ファイル（画像）の配信 |

## トラブルシューティング

| 発生している問題 | 解決策 |
|-------|-----|
| LAN内から `/admin` にアクセスすると `/` にリダイレクトされる | `TRUST_PROXY=0` に設定。`/api/admin/access` を叩いて検出されている `clientIp` を確認してください。 |
| ログインは成功するが、APIが 401 エラーになる | LAN内のHTTP環境のため Secure クッキーが送信されていません。`ADMIN_COOKIE_SECURE=0` を設定してください。 |
| 再起動すると管理画面での設定が消えてしまう | サーバー側をアップデートしてください。同期処理自体は `hidden` などの設定値を保持するように設計されています。 |
| 変更内容が反映されない | `npm run build` を実行してから、クライアントとサーバーの両方を再起動してください。 |
| Docker内のディレクトリが乱雑になる | `photos` ボリュームと `data` ボリュームをそれぞれ個別に分けてマウントしてください。 |
| 簡体字などの漢字フォントが不自然に混ざる | Noto SC にフォールバックします。また、名前部分には 霞鹜文楷 Lite (LXGW WenKai Lite) を適用してバランスを整えています。 |
