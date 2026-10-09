#!/bin/sh
# Invokes one scheduled Saad Studio endpoint, replacing Vercel Cron.
#
# The secret is read from a root-only file rather than passed on the command
# line, because command lines are visible to every user through /proc and land
# in shell history. It is sent as a Bearer header, never as a query parameter,
# so it does not reach access logs.
#
# Install:
#   install -m 0755 deploy/run-cron.sh /usr/local/bin/saad-cron
#   mkdir -p /etc/saad-studio
#   printf 'CRON_SECRET=%s\n' "$YOUR_SECRET" > /etc/saad-studio/cron.env
#   chmod 600 /etc/saad-studio/cron.env && chown root:root /etc/saad-studio/cron.env
#
# Usage:
#   saad-cron /api/cron/generation-reconcile
#
# Requests go to the loopback binding published by docker-compose.yml, so they
# never leave the host and do not depend on DNS or the certificate.

set -eu

ENV_FILE="${SAAD_CRON_ENV:-/etc/saad-studio/cron.env}"
BASE_URL="${SAAD_CRON_BASE_URL:-http://127.0.0.1:3000}"
# Long enough for a reconciliation sweep, short enough to not pile up runs.
TIMEOUT="${SAAD_CRON_TIMEOUT:-300}"

ENDPOINT="${1:-}"
if [ -z "$ENDPOINT" ]; then
  echo "usage: $0 /api/cron/<name>" >&2
  exit 2
fi

if [ ! -r "$ENV_FILE" ]; then
  echo "saad-cron: cannot read $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
. "$ENV_FILE"

if [ -z "${CRON_SECRET:-}" ]; then
  echo "saad-cron: CRON_SECRET is not set in $ENV_FILE" >&2
  exit 1
fi

# --fail-with-body so a 4xx/5xx is both reported and readable in the cron mail.
# Secrets are in a header, so -v style logging is avoided entirely.
exec curl --silent --show-error --fail-with-body \
  --max-time "$TIMEOUT" \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  "${BASE_URL}${ENDPOINT}"
