#!/usr/bin/env bash
# Restores a backup made by scripts/backup.sh into the GlucoPerso Docker stack.
#
#   scripts/restore.sh backups/20261010T020000Z          # asks for confirmation
#   scripts/restore.sh --yes backups/20261010T020000Z
#
# Steps: verify checksums → safety backup of the current state
# (backups/pre-restore/) → stop the app → pg_restore --clean in a single
# transaction → replace the data volume (photos + secrets.env) → start the app
# (which applies any newer migrations).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  echo "Usage: $0 [--yes] <backup directory>" >&2
  exit 1
}

assume_yes=0
if [[ "${1:-}" == "--yes" ]]; then
  assume_yes=1
  shift
fi
[[ $# -eq 1 ]] || usage
src="$(cd "$1" && pwd)"
cd "$ROOT"

for file in db.dump data.tar.gz; do
  [[ -f "$src/$file" ]] || {
    echo "Missing $src/$file" >&2
    exit 1
  }
done
if [[ -f "$src/SHA256SUMS" ]]; then
  (cd "$src" && sha256sum --check --quiet SHA256SUMS)
fi

if ((assume_yes == 0)); then
  echo "This REPLACES the current database and photos with the backup $(basename "$src")."
  read -r -p "Type « restaurer » to continue: " answer
  [[ "$answer" == "restaurer" ]] || {
    echo "Cancelled."
    exit 1
  }
fi

docker compose up -d --wait db

echo "→ Safety backup of the current state (backups/pre-restore/)"
BACKUP_DIR="$ROOT/backups/pre-restore" BACKUP_KEEP=5 "$ROOT/scripts/backup.sh"

echo "→ Stopping the app"
docker compose stop app

echo "→ Restoring the database"
docker compose exec -T db sh -c \
  'pg_restore --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --single-transaction --exit-on-error' \
  <"$src/db.dump"

echo "→ Restoring photos and secrets"
docker compose run --rm --no-deps -T --entrypoint sh app -c \
  'find /data -mindepth 1 -delete && tar -xzf - -C /data' \
  <"$src/data.tar.gz"

echo "→ Starting the app"
docker compose up -d app
echo "✓ Restore finished. Check the logs: docker compose logs -f app"
