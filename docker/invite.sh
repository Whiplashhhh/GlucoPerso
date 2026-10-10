#!/bin/sh
# Creates a single-use invite code from inside the container:
#   docker compose exec app invite [--days 7] [--note "Pour Léa"]
set -eu

SECRETS_FILE="${SECRETS_FILE:-/data/secrets.env}"

# `docker compose exec` does not inherit what the entrypoint exported.
if [ -z "${BETTER_AUTH_SECRET:-}" ] && [ -r "$SECRETS_FILE" ]; then
  BETTER_AUTH_SECRET="$(sed -n 's/^BETTER_AUTH_SECRET=//p' "$SECRETS_FILE")"
  export BETTER_AUTH_SECRET
fi

exec node /app/cli/create-invite.mjs "$@"
