# syntax=docker/dockerfile:1
# GlucoPerso production image: Next.js standalone server + Prisma migrations.
#   docker build -t glucoperso .
# See docs/deploiement.md.

ARG NODE_VERSION=24

# ── Base: Debian slim (glibc, for the sharp / argon2 / Prisma binaries) ──
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# OpenSSL is required by the Prisma schema engine (migrations).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── Dependencies (npm ci honours package.json "allowScripts") ──
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# prisma.config.ts needs a DATABASE_URL even for `prisma generate` (postinstall).
RUN --mount=type=cache,target=/root/.npm \
  DATABASE_URL="postgresql://build:build@localhost:5432/build" \
  npm ci --no-audit --no-fund

# ── Build: Next.js standalone output + bundled admin CLI ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/src/generated ./src/generated
COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run build \
  && npm run build:cli

# ── Migration tooling: a tiny node_modules with the Prisma CLI only ──
FROM base AS migrate
WORKDIR /opt/migrate
COPY package-lock.json /tmp/package-lock.json
# Same Prisma / dotenv versions as the app, read from the lockfile. The Prisma
# install scripts (schema engine download) must be allowed explicitly.
RUN --mount=type=cache,target=/root/.npm \
  node -e " \
    const lock = require('/tmp/package-lock.json').packages; \
    const v = (name) => lock['node_modules/' + name].version; \
    require('node:fs').writeFileSync('package.json', JSON.stringify({ \
      name: 'glucoperso-migrate', private: true, type: 'module', \
      dependencies: { prisma: v('prisma'), dotenv: v('dotenv') }, \
      allowScripts: { ['prisma@' + v('prisma')]: true, ['@prisma/engines@' + v('@prisma/engines')]: true }, \
    }, null, 2));" \
  && npm install --no-audit --no-fund \
  && rm /tmp/package-lock.json \
  && ls node_modules/@prisma/engines/ | grep -q '^schema-engine-'
COPY prisma.config.ts ./
COPY prisma ./prisma

# ── Runtime ──
FROM base AS runner
ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  PHOTOS_DIR=/data/photos \
  SECRETS_FILE=/data/secrets.env

COPY --from=migrate /opt/migrate /opt/migrate
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/cli ./cli
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --chmod=755 docker/invite.sh /usr/local/bin/invite

# Application files stay owned by root (read-only for the app); only the data
# volume and the Next.js cache are writable by the unprivileged `node` user.
RUN mkdir -p /data/photos /app/.next/cache \
  && chown -R node:node /data /app/.next/cache \
  && chmod 700 /data

USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/connexion',{redirect:'manual'}).then(r=>process.exit(r.status<500?0:1),()=>process.exit(1))"]

ENTRYPOINT ["docker-entrypoint"]
CMD ["node", "server.js"]
