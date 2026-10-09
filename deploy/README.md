# Self-hosted deployment

How to run Saad Studio on a single Linux host (the target is a Hetzner Cloud
server) instead of Vercel. Nothing here is specific to Hetzner.

Neon, Clerk, Backblaze B2, Cloudflare R2, Stripe and every model provider stay
where they are and are reached over the network. No data is migrated.

## What is in this directory

| File | Purpose |
|---|---|
| `Caddyfile` | Reverse proxy and automatic HTTPS. The default. |
| `nginx/saadstudio.conf` | Alternative for hosts already running nginx. Do not run both. |
| `run-cron.sh` | Calls one scheduled endpoint. Replaces Vercel Cron. |
| `crontab.example` | The five schedules copied from `vercel.json`. |
| `upload-static-to-b2.sh` | Uploads `public/downloads` to B2. Dry run by default. |

The container itself is defined by `../Dockerfile` and `../docker-compose.yml`.

## 1. Prerequisites

- Docker Engine and the Compose plugin.
- Ports 80 and 443 reachable from the internet, and DNS for the domain pointing
  at the host. Needed only for the `serve` profile; a local build test needs
  neither.

## 2. Environment variables

Secrets live in `.env.production`, which is git-ignored. Compose passes it to
the container through `env_file`, so values never enter an image layer —
`.dockerignore` excludes `.env*` as well.

```bash
cp .env.example .env.production
chmod 600 .env.production
chown root:root .env.production
# fill in the values
```

`.env.example` lists every variable the code reads, generated from the
`process.env.*` sites in `app/`, `lib/` and `components/`, plus the two Prisma
datasource variables. The ones marked REQUIRED are checked by `/api/health`.

Two rules worth repeating:

- **`NEXT_PUBLIC_*` is inlined at build time.** Changing one needs a rebuild,
  and it must also be passed as a build arg — `docker-compose.yml` already wires
  the ones the app uses. Never put a secret behind a `NEXT_PUBLIC_` name.
- **Everything else is read at runtime.** Rotating a key is
  `docker compose up -d --force-recreate app`, with no rebuild.

Compose also needs `SITE_DOMAIN` and `ACME_EMAIL` for Caddy. Put those in a
plain `.env` beside `docker-compose.yml`, since Compose reads that file for
interpolation but not `.env.production`.

One overlap to be aware of: `.env.production` is also a filename Next.js loads
by itself during a production build. So the file serves two roles — build-time
input when you run `npm run build` on the host, and runtime input when Compose
passes it to the container. Keep production values in it and nothing else. It
never reaches an image either way, because `.dockerignore` excludes `.env*`.

## 3. Build and run locally

No domain and no public ports — the app binds to loopback only:

```bash
docker compose build
docker compose up -d
curl -fsS "http://127.0.0.1:3000/api/health?full=1"
```

A healthy response reports `"ok": true` and, with `full=1`, that ffmpeg resolved
and which storage providers are configured.

## 4. Run behind HTTPS

```bash
docker compose -f docker-compose.yml -f docker-compose.serve.yml up -d
```

Caddy requests a certificate from Let's Encrypt on first start and renews it on
its own. There is no certbot step and no renewal cron. Back up the `caddy-data`
volume: it holds the issued certificates and the ACME account key.

Caddy lives in a second file rather than behind a Compose profile because
Compose interpolates variables for every service in a file whatever the active
profile, so a required `SITE_DOMAIN` in the main file would have broken the
app-only run in step 3 too.

To use nginx instead, do not layer in `docker-compose.serve.yml`; install
`nginx/saadstudio.conf` on the host and let it proxy to `127.0.0.1:3000`.

Either way the proxy read timeout is set to 360s. The studio export,
video-extend stitch and transitions stitch routes run ffmpeg inside the request
and are declared at 300s in `vercel.json`; nginx's 60s default would return 504
while the job was still running.

## 5. Scheduled jobs

`vercel.json` crons do not exist off Vercel, so the five schedules move to the
host crontab.

```bash
install -m 0755 deploy/run-cron.sh /usr/local/bin/saad-cron
mkdir -p /etc/saad-studio
printf 'CRON_SECRET=%s\n' "$(openssl rand -hex 32)" > /etc/saad-studio/cron.env
chmod 600 /etc/saad-studio/cron.env
chown root:root /etc/saad-studio/cron.env
crontab -u root deploy/crontab.example
crontab -l -u root
```

Use the **same** value for `CRON_SECRET` in `/etc/saad-studio/cron.env` and in
`.env.production`, or every job gets a 403.

All six `/api/cron/*` endpoints now require `Authorization: Bearer $CRON_SECRET`
and return **503** when `CRON_SECRET` is unset or shorter than 16 characters.
They no longer accept the `x-vercel-cron` header on its own, which any client
could forge once the app is not behind Vercel, and they no longer accept the
secret in a query string, which would leak it into access logs.

This also works unchanged on Vercel: with `CRON_SECRET` set on the project,
Vercel sends it as an `Authorization` header automatically.

Smoke-test one job:

```bash
saad-cron /api/cron/kie-sync
# and confirm an unauthenticated call is refused:
curl -i http://127.0.0.1:3000/api/cron/kie-sync          # 401
curl -i -H 'x-vercel-cron: 1' http://127.0.0.1:3000/api/cron/kie-sync   # 401
```

`credit-reconcile` is deliberately left commented out in `crontab.example`: it
exists in the codebase but was never listed in `vercel.json`, so it has never
run on a schedule, and it mutates credit balances. Review a dry run before
enabling it.

## 6. Offloading the installers

`public/downloads` holds about 103 MB, and the largest file is 34 MB, so every
plugin download is 34 MB of egress from this host.

```bash
./deploy/upload-static-to-b2.sh           # dry run, uploads nothing
./deploy/upload-static-to-b2.sh --live
```

Then set `STATIC_CDN_BASE_URL` in `.env.production` to the bucket's public base
URL and recreate the container. `next.config.mjs` redirects `/downloads/*`
there, so `/downloads/SaadStudio-Setup.exe` and the other URLs already used by
the site and by `lib/admin/plugin-control-plane.ts` keep working — the redirect
is temporary (307), never permanent, so unsetting the variable restores local
serving immediately.

```bash
curl -I https://<your-domain>/downloads/SaadStudio-Setup.exe   # expect 307
```

Only after that is confirmed should the files be removed from `public/`, in a
separate commit.

`public/img` is larger still (about 315 MB) but is **not** offloaded by this
mechanism. Those files are consumed by `next/image`, whose optimizer reads the
local path from disk rather than following a redirect, so a redirect alone
would not let the files be deleted. Moving them means either rewriting the
references to absolute CDN URLs or turning off image optimization — a separate
decision, not a migration step.

## 7. FFmpeg

The image is Debian-based, not Alpine. `ffmpeg-static`, `@ffmpeg-installer`,
`sharp` and the Prisma query engine all ship glibc-linked binaries; on Alpine
they exist but cannot execute, and `apk add ffmpeg` did not help because the old
code never looked at `PATH`.

`lib/server/ffmpeg-path.ts` now probes each candidate by running `-version` and
falls back to a system ffmpeg, in this order: `FFMPEG_PATH`, `ffmpeg-static`,
`@ffmpeg-installer/ffmpeg`, then `PATH`. The Dockerfile installs ffmpeg and
pins `FFMPEG_PATH=/usr/bin/ffmpeg`.

Confirm it two ways — that the binary runs inside the container, and that the
app resolved it:

```bash
docker compose exec app /usr/bin/ffmpeg -version | head -1
curl -fsS "http://127.0.0.1:3000/api/health?full=1" | grep -o '"ffmpeg":{[^}]*}'
```

Expect `{"available":true,"source":"env"}` — `env` because the Dockerfile pins
`FFMPEG_PATH`. A `source` of `system` is equally fine. `"available":false` means
no candidate ran, and the container log names the ones that were tried.

## 8. Sizing the host

Do not pick an instance size from a guess. Measure first:

1. Start the stack and leave it idle for an hour, then record
   `docker stats --no-stream`.
2. Drive a real export through `/api/studio/export` and a stitch through
   `/api/video-extend/stitch`, and record peak CPU, peak memory and peak disk
   use under `/tmp/saad-studio`.
3. Repeat with two or three concurrent jobs.
4. Size from the measured peak with roughly 50% headroom, then set the
   `deploy.resources.limits` block in `docker-compose.yml`, which is commented
   out until there are real numbers to put in it.

## 9. Rollback

The Vercel project stays deployed throughout. Rollback is a DNS change back to
it, so keep the record's TTL low (300s) until the new host has been stable for
several days.
