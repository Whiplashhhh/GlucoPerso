#!/bin/sh
# GlucoPerso container entrypoint:
#   1. provides BETTER_AUTH_SECRET (generated once, persisted in the data volume);
#   2. applies pending database migrations (`prisma migrate deploy`);
#   3. starts the command (default: the Next.js server).
set -eu

SECRETS_FILE="${SECRETS_FILE:-/data/secrets.env}"

if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
  if [ ! -s "$SECRETS_FILE" ]; then
    umask 077
    secret="$(node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))")"
    printf 'BETTER_AUTH_SECRET=%s\n' "$secret" >"$SECRETS_FILE"
    chmod 600 "$SECRETS_FILE"
    echo "entrypoint: BETTER_AUTH_SECRET generated and saved in $SECRETS_FILE (keep it in your backups)."
  fi
  BETTER_AUTH_SECRET="$(sed -n 's/^BETTER_AUTH_SECRET=//p' "$SECRETS_FILE")"
  export BETTER_AUTH_SECRET
fi

mkdir -p "${PHOTOS_DIR:-/data/photos}"

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  attempt=1
  until (cd /opt/migrate && ./node_modules/.bin/prisma migrate deploy); do
    if [ "$attempt" -ge 10 ]; then
      echo "entrypoint: database migrations failed, giving up." >&2
      exit 1
    fi
    echo "entrypoint: migrations failed (attempt $attempt/10), retrying in 3 s…" >&2
    attempt=$((attempt + 1))
    sleep 3
  done
fi

exec "$@"
