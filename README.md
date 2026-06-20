# Telegram BYOS Storage Platform

A storage platform that behaves like Google Drive on the surface, but holds **no storage cost or liability**. Each user connects their **own Telegram bot + private channel** as the storage backend. The platform handles client-side encryption, resumable chunked transfer, manifest tracking, reassembly, and sharing on top of it.

> **Tagline:** _We host the index, never your files._

---

## Architecture

```
React SPA (Vite + TS)  <──>  Laravel API (control plane)  <──>  MySQL/SQLite (manifests)
                                       │                          Redis (queue/cache, optional)
                          Local Telegram Bot API server (chunk transfer)
                                       │
                          User's own Telegram bot + private channel
```

**Upload flow:** browser encrypts file (AES-256-GCM) → resumable 8 MiB chunked transfer to Laravel → `SplitAndUploadFileJob` splits into N MiB pieces → `Bus::batch()` of `UploadChunkJob` push each chunk to the user's Telegram channel → manifest rows record `telegram_message_id` → status broadcast over Reverb WebSocket.

**Download flow:** server streams chunks back in order via a `StreamedResponse` (never holding the full file in memory) → browser decrypts client-side.

---

## Monorepo layout

```
.
├── app/                          # Laravel backend
│   ├── Events/FileProgressUpdated.php
│   ├── Http/Controllers/Api/      Auth, File, Share, StorageConnection
│   ├── Http/Requests/             form requests / validation
│   ├── Jobs/                      SplitAndUpload, UploadChunk, Verify, Delete, PruneShares
│   ├── Models/                    User, StorageConnection, File, FileChunk, Share
│   └── Services/Telegram/         BotApiClient, TelegramStorage, TelegramApiException
├── database/migrations/           connections, files, file_chunks, shares, user crypto
├── routes/api.php                 REST API
└── frontend/                      React SPA (separate Vite project, port 5173)
    └── src/
        ├── lib/  api.ts · crypto.ts · uploader.ts · echo.ts · store.ts · types.ts
        ├── pages/ Auth · CryptoUnlock · Dashboard · Upload · FileDetail · StorageSettings · Share
        └── components/ FileRow · StorageConnectionCard · ShareModal · DownloadDecryptor
```

---

## Prerequisites

- PHP 8.3+ with `mbstring`, `openssl`, `pdo_sqlite` (or `pdo_mysql`)
- Composer
- Node 20+
- A **local Telegram Bot API server** (to allow >50 MB uploads):
  ```bash
  docker run -d --name tgbotapi -p 8081:8081 \
    -v telegram-bot-api-data:/var/lib/telegram-bot-api \
    -e TELEGRAM_API_ID=YOUR_API_ID \
    -e TELEGRAM_API_HASH=YOUR_API_HASH \
    aiogram/telegram-bot-api:latest
  ```
  (`api_id` / `api_hash` come from https://my.telegram.org)
- (Optional) Redis for production queue/cache. Dev defaults to `database`.

---

## Backend setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate          # sqlite by default; set DB_CONNECTION=mysql for prod
php artisan reverb:install   # only if .env lacks REVERB_* keys
```

Key `.env` values (already defaulted in `.env.example`):

```
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database          # use 'redis' in prod

TELEGRAM_BOT_API_BASE_URL=http://localhost:8081
TELEGRAM_CHUNK_SIZE_MB=1           # set higher (e.g. 1500) with local Bot API server
TELEGRAM_UPLOAD_CONCURRENCY=3
```

### Running the workers (in separate terminals)

```bash
php artisan serve --port=8000
php artisan queue:listen --queue=telegram
php artisan queue:listen --queue=default
php artisan reverb:start
php artisan schedule:work
```

---

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev        # http://localhost:5173
```

---

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/register` | Create account |
| POST | `/api/login` / `/api/logout` | Cookie-session auth |
| GET | `/api/crypto/setup` | Salt + verifier for client-side key derivation |
| POST | `/api/crypto/master-key` | Persist derived master key salt |
| GET/POST | `/api/storage-connections` | List / connect a bot + channel |
| POST | `/api/storage-connections/{id}/verify` | Round-trip test upload/delete |
| POST | `/api/files` | Initiate upload (returns upload URL) |
| POST | `/api/files/{id}/chunks` | Append a resumable encrypted segment |
| POST | `/api/files/{id}/complete` | Finalize → dispatch split/push batch |
| GET | `/api/files` · `/api/files/{id}` | List / detail |
| GET | `/api/files/{id}/download` | Streamed reassembly |
| DELETE | `/api/files/{id}` | Delete file + remote chunks |
| POST | `/api/files/{id}/share` | Create share link (optional password/expiry/cap) |
| GET/POST | `/api/shares/{token}` | Public share view / download |

Real-time progress is broadcast on Reverb channels `private-user.{id}` and `file.{fileId}` via the `FileProgressUpdated` event.

---

## Zero-knowledge crypto model

- **Per-file data key** generated in the browser (Web Crypto, AES-256-GCM).
- Content encrypted in **1 MiB segments**, each with a counter-derived IV from a per-file base IV.
- The data key is **wrapped** with a master key derived locally from the user's passphrase (PBKDF2-SHA256, 250k iterations in-browser; Argon2id recommended server-side for the verifier).
- The server stores **only ciphertext** plus the wrapped key + IV; it can never read file contents.

> Note: Web Crypto has no native Argon2; PBKDF2 is used in the browser. The `master_key_verifier` pattern lets the client confirm a correct passphrase without exposing the key.

---

## Connecting Telegram (UX)

1. In **Settings → Connections**, click **Connect**.
2. Open `@BotFather` → `/newbot` → copy the token.
3. Create a **private channel**, add the bot as admin.
4. Capture the numeric `chat_id` (forward a channel message to the bot or read it from the channel).
5. Paste both → backend validates via `getMe`, runs a round-trip test (upload → fetch → delete), marks the connection **active**.

---

## Verification commands

```bash
# Backend
php artisan route:list --path=api
php artisan test
vendor/bin/pint --test

# Frontend
cd frontend && npm run lint && npm run build
```

---

## Risk mitigations

| Risk | Mitigation |
|---|---|
| Bot token leak | Encrypted at rest (`encrypt()`), scoped to one channel |
| Large file memory blowup | Stream-based I/O end-to-end (`StreamedResponse`, `fseek`+`stream_copy_to_stream`) |
| Chunk upload failures | `Bus::batch()` with per-chunk `UploadChunkJob`, individual retries + backoff |
| Telegram rate limiting | `FLOOD_WAIT` honoured with retry-after backoff in `BotApiClient` |

---

## Status

The full vertical slice is implemented and verified to boot, type-check, build, and pass tests. End-to-end transfer requires a running local Telegram Bot API server + a real bot/channel. Switch `DB_CONNECTION=mysql` and `QUEUE_CONNECTION=redis` for production.
