#!/usr/bin/env bash
# Installs (or removes) the daily cron job that runs scripts/backup.sh.
# Run it as the user that manages Docker, on the server:
#
#   scripts/schedule-backup.sh                       # every day at 03:15
#   scripts/schedule-backup.sh --at 04:30
#   BACKUP_OFFSITE=user@nas:/srv/glucoperso-backups \
#   BACKUP_AGE_RECIPIENTS=/srv/glucoperso/backup-recipients.txt \
#     scripts/schedule-backup.sh                     # + encrypted off-site copy
#   scripts/schedule-backup.sh --remove
#
# The BACKUP_* variables set when running this script (BACKUP_DIR,
# BACKUP_KEEP, BACKUP_OFFSITE, BACKUP_AGE_RECIPIENTS) are written into the
# cron line, as well as the current PATH (cron's default one often misses
# docker). Running it again replaces the previous line. Output goes to
# <BACKUP_DIR>/backup.log.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER="# glucoperso-backup $ROOT"

usage() {
  echo "Usage: $0 [--at HH:MM] [--remove]" >&2
  exit 1
}

at="03:15"
remove=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --at)
      [[ $# -ge 2 ]] || usage
      at="$2"
      shift 2
      ;;
    --remove)
      remove=1
      shift
      ;;
    *) usage ;;
  esac
done

command -v crontab >/dev/null || {
  echo "crontab is not installed (apt install cron)." >&2
  exit 1
}
[[ "$at" =~ ^([01][0-9]|2[0-3]):([0-5][0-9])$ ]] || {
  echo "--at expects HH:MM (24 h), got « $at »." >&2
  exit 1
}
hour="$((10#${BASH_REMATCH[1]}))"
minute="$((10#${BASH_REMATCH[2]}))"

# Current crontab without our line (crontab -l fails when there is none).
current="$(crontab -l 2>/dev/null | grep -vF -- "$MARKER" || true)"

if ((remove == 1)); then
  printf '%s\n' "$current" | sed '/^$/d' | crontab -
  echo "✓ Backup cron job removed."
  exit 0
fi

# Fail now rather than every night.
if [[ -n "${BACKUP_OFFSITE:-}" ]]; then
  [[ -r "${BACKUP_AGE_RECIPIENTS:-}" ]] || {
    echo "BACKUP_OFFSITE is set: BACKUP_AGE_RECIPIENTS must point to a readable key file." >&2
    exit 1
  }
  command -v age >/dev/null || {
    echo "age is not installed (apt install age)." >&2
    exit 1
  }
fi

# POSIX single quoting: cron runs the line with /bin/sh, not bash.
q() {
  local escaped="${1//\'/\'\\\'\'}"
  printf "'%s'" "$escaped"
}

backup_dir="${BACKUP_DIR:-$ROOT/backups}"
(umask 077 && mkdir -p "$backup_dir")

env_vars="PATH=$(q "$PATH")"
for name in BACKUP_DIR BACKUP_KEEP BACKUP_OFFSITE BACKUP_AGE_RECIPIENTS; do
  if [[ -n "${!name:-}" ]]; then
    env_vars+=" $name=$(q "${!name}")"
  fi
done
command="umask 077 && cd $(q "$ROOT") && $env_vars scripts/backup.sh >> $(q "$backup_dir/backup.log") 2>&1"
# A bare % ends the command in a crontab line.
line="$minute $hour * * * ${command//%/\\%} $MARKER"

printf '%s\n%s\n' "$current" "$line" | sed '/^$/d' | crontab -
echo "✓ Daily backup at $at:"
echo "  $line"
echo "Test it now: (cd $(q "$ROOT") && $env_vars scripts/backup.sh)"
