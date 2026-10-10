#!/usr/bin/env bash
# Encrypts a backup made by scripts/backup.sh with age and copies it off the
# server as a single file: glucoperso-<timestamp>.tar.age.
#
#   BACKUP_AGE_RECIPIENTS=/srv/glucoperso/backup-recipients.txt \
#   BACKUP_OFFSITE=user@nas:/srv/glucoperso-backups \
#     scripts/backup-offsite.sh [backup directory]     # default: the latest one
#
# BACKUP_AGE_RECIPIENTS  file of age public keys (age1…) or SSH public keys,
#                        one per line. The matching private key must NOT live
#                        on the server: a stolen server then exposes no backup.
# BACKUP_OFFSITE         where to copy the encrypted file:
#                          user@host:/path    rsync over SSH
#                          /mnt/nas/path      local mount (NAS, USB disk…)
#                          rclone:remote:path rclone (S3, B2, SFTP, Drive…)
#
# scripts/backup.sh calls this script itself when BACKUP_OFFSITE is set.
# Off-site retention is left to the destination (bucket lifecycle rules,
# snapshots…): this script never deletes anything remotely.
#
# Decrypt on a machine that holds the private key:
#   age -d -i key.txt glucoperso-<timestamp>.tar.age | tar -x
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
recipients="${BACKUP_AGE_RECIPIENTS:-}"
target="${BACKUP_OFFSITE:-}"

fail() {
  echo "$*" >&2
  exit 1
}

[[ -n "$target" ]] || fail "Set BACKUP_OFFSITE (user@host:/path, /local/path or rclone:remote:path)."
[[ -n "$recipients" ]] || fail "Set BACKUP_AGE_RECIPIENTS to a file of age or SSH public keys."
[[ -r "$recipients" ]] || fail "Cannot read $recipients."
grep -Eq '^(age1|ssh-)' "$recipients" || fail "No age1… or ssh-… public key in $recipients."
command -v age >/dev/null || fail "age is not installed (apt install age / https://age-encryption.org)."
if [[ "$target" == rclone:* ]]; then
  command -v rclone >/dev/null || fail "rclone is not installed."
else
  command -v rsync >/dev/null || fail "rsync is not installed."
fi

if [[ $# -ge 1 ]]; then
  src="$(cd "$1" && pwd)"
else
  src="$(find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' | sort | tail -n 1)"
  [[ -n "$src" ]] || fail "No backup found in $BACKUP_DIR: run scripts/backup.sh first."
fi
for file in db.dump data.tar.gz SHA256SUMS; do
  [[ -f "$src/$file" ]] || fail "Missing $src/$file"
done
(cd "$src" && sha256sum --check --quiet SHA256SUMS)

name="glucoperso-$(basename "$src").tar.age"
umask 077
tmp="$(mktemp -d "$(dirname "$src")/.offsite.XXXXXX")"
trap 'rm -rf -- "$tmp"' EXIT

echo "→ Encrypting $(basename "$src")"
# The dump and the archive are already compressed: plain tar is enough.
tar -cf - -C "$(dirname "$src")" "$(basename "$src")" | age -R "$recipients" -o "$tmp/$name"
[[ -s "$tmp/$name" ]] || fail "Encryption produced an empty file."

echo "→ Copying to $target"
if [[ "$target" == rclone:* ]]; then
  rclone copyto "$tmp/$name" "${target#rclone:}/$name"
else
  # rsync writes to a temporary name and renames at the end: no partial file
  # is ever visible under the final name.
  rsync --times --chmod=F600 "$tmp/$name" "${target%/}/"
fi
echo "✓ Off-site copy: ${target%/}/$name ($(du -h "$tmp/$name" | cut -f1))"
