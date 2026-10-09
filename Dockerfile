# Saad Studio production image.
#
# Base image choice: Debian slim, not Alpine. The app shells out to ffmpeg and
# uses sharp and the Prisma query engine, and all three ship prebuilt binaries
# linked against glibc. On Alpine (musl) those binaries exist but cannot
# execute, so `apk add ffmpeg` alone did not fix it — see lib/server/ffmpeg-path.ts.
#
# Build:  docker build -t saad-studio .
# Run:    see docker-compose.yml

FROM node:20-bookworm-slim AS base
# openssl is required by the Prisma query engine; ca-certificates for outbound
# HTTPS to the model providers.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*


# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# `npm install`, not `npm ci`, and this is deliberate.
#
# package-lock.json is out of sync with package.json by one entry —
# @emnapi/runtime@1.11.3, an optional transitive dependency of sharp — and
# `npm ci` refuses to install at all when the two disagree:
#   "npm error `npm ci` can only install packages when your package.json and
#    package-lock.json ... are in sync. Missing: @emnapi/runtime@1.11.3"
#
# This command matches the installCommand in vercel.json exactly, so the image
# resolves dependencies the same way the deployments on Vercel already do and
# introduces no new risk. --legacy-peer-deps is required either way: the
# dependency graph does not resolve peers strictly.
#
# Switching back to `npm ci` (for reproducible builds) means regenerating the
# lock file, which can shift resolved versions across the tree — a deliberate
# change to make and test on its own, not part of the migration.
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Generate the Prisma client against this image's libc so the engine that ends
# up in the runtime layer is the one that was built here.
COPY prisma ./prisma
RUN npx prisma generate


# ── builder ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.mjs only emits .next/standalone when this is set. Without it the
# COPY of .next/standalone in the runner stage fails and the build breaks.
ENV NEXT_OUTPUT_MODE=standalone
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time placeholders. Next.js inlines NEXT_PUBLIC_* at build time, so the
# real values must be supplied as build args for anything that has to be baked
# into the client bundle. Everything server-side is read at runtime from the env.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_B2_PUBLIC_URL
ARG NEXT_PUBLIC_B2_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ARG NEXT_PUBLIC_R2_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_B2_PUBLIC_URL=$NEXT_PUBLIC_B2_PUBLIC_URL
ENV NEXT_PUBLIC_B2_PUBLIC_BASE_URL=$NEXT_PUBLIC_B2_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_R2_PUBLIC_BASE_URL=$NEXT_PUBLIC_R2_PUBLIC_BASE_URL

RUN npm run build

# File tracing copies the whole of public/ into .next/standalone/public — the
# outputFileTracingExcludes in next.config.mjs trim the serverless function
# bundle, not this copy. public/ is around 1 GB, so leaving both in place would
# carry it in two image layers. Drop the traced copy and let the explicit COPY
# in the runner stage provide the single, complete one.
RUN rm -rf .next/standalone/public


# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# A full ffmpeg build, used by the export, stitch, poster and transcode routes.
# FFMPEG_PATH pins it so lib/server/ffmpeg-path.ts does not have to probe the
# bundled glibc builds first.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
ENV FFMPEG_PATH=/usr/bin/ffmpeg

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The ffmpeg routes write intermediates under os.tmpdir(); the runtime user
# needs somewhere it owns. Mount a volume here if exports are large.
RUN mkdir -p /tmp/saad-studio && chown nextjs:nodejs /tmp/saad-studio
ENV TMPDIR=/tmp/saad-studio

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Readiness is reported by /api/health, which checks the database, storage
# credentials and ffmpeg. --start-period covers first-boot Prisma connect.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
