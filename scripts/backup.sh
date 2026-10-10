#!/usr/bin/env bash
# Backs up the GlucoPerso Docker stack into ./backups/<timestamp>/:
#   db.dump      PostgreSQL dump (custom format, for pg_restore)
#   data.tar.gz  the app data volume: photos + secrets.env
#   SHA256SUMS   checksums
# Keeps the last BACKUP_KEEP backups (default 14).
#
#   scripts/backup.sh
#   BACKUP_DIR=/srv/backups BACKUP_KEEP=30 scripts/backup.sh
#
# Run from anywhere; uses docker-compose.yml + .env of the repository. Standard
# Compose variables (COMPOSE_PROJECT_NAME, COMPOSE_FILE, COMPOSE_ENV_FILES…) are
# honoured. Backups contain health data: store copies encrypted, off-site.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-14}"

if ! [[ "$BACKUP_KEEP" =~ ^[0-9]+$ ]] || ((BACKUP_KEEP < 1)); then
  echo "BACKUP_KEEP must be a positive integer." >&2
  exit 1
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$BACKUP_DIR/$stamp"

umask 077
mkdir -p "$dest"
cleanup() {
  echo "Backup failed: removing incomplete $dest" >&2
  rm -rf -- "$dest"
}
trap cleanup ERR

echo "→ Database dump"
docker compose exec -T db sh -c \
  'pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  >"$dest/db.dump"
# Fails if the dump is unreadable.
docker compose exec -T db pg_restore --list <"$dest/db.dump" >/dev/null

echo "→ Photos and secrets"
if [[ -n "$(docker compose ps --status running --quiet app)" ]]; then
  docker compose exec -T app tar -czf - -C /data . >"$dest/data.tar.gz"
else
  docker compose run --rm --no-deps -T --entrypoint tar app -czf - -C /data . >"$dest/data.tar.gz"
fi
tar -tzf "$dest/data.tar.gz" >/dev/null

(cd "$dest" && sha256sum db.dump data.tar.gz >SHA256SUMS)
trap - ERR
echo "✓ Backup written to $dest ($(du -sh "$dest" | cut -f1))"

# Retention: timestamped directories sort chronologically.
mapfile -t backups < <(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' | sort)
excess=$((${#backups[@]} - BACKUP_KEEP))
if ((excess > 0)); then
  for old in "${backups[@]:0:excess}"; do
    echo "→ Removing old backup $(basename "$old")"
    rm -rf -- "$old"
  done
fi
