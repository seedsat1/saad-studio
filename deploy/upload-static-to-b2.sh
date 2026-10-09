#!/usr/bin/env bash
# Uploads public/downloads to Backblaze B2 so the installers stop being served
# from the application host.
#
# Dry run by default. Nothing is written to the bucket unless --live is passed,
# so running this by accident is harmless.
#
#   ./deploy/upload-static-to-b2.sh                # list what would be uploaded
#   ./deploy/upload-static-to-b2.sh --live         # actually upload
#
# Requires the AWS CLI (B2 is S3-compatible) and B2 credentials. Credentials are
# read from .env.production, or from the environment if already exported.
#
# After a successful upload, set STATIC_CDN_BASE_URL in .env.production to the
# bucket's public base URL and recreate the container. next.config.mjs then
# redirects /downloads/* there; see staticOffloadRedirects() for why that keeps
# every existing download link working.
#
# This script only writes to the bucket. It does not touch the database, the
# repository, or the running site, and it never deletes a local file.

set -euo pipefail

LIVE=0
[[ "${1:-}" == "--live" ]] && LIVE=1

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/public/downloads"
ENV_FILE="${SAAD_ENV_FILE:-$REPO_ROOT/.env.production}"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "error: $SOURCE_DIR does not exist" >&2
  exit 1
fi

# Load credentials only if they are not already in the environment, so CI can
# inject them without a file on disk.
if [[ -z "${B2_ACCESS_KEY_ID:-}" && -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
fi

BUCKET="${B2_BUCKET:-${B2_BUCKET_NAME:-}}"
ENDPOINT="${B2_ENDPOINT:-}"
REGION="${B2_REGION:-us-west-004}"

for required in B2_ACCESS_KEY_ID B2_SECRET_ACCESS_KEY; do
  if [[ -z "${!required:-}" ]]; then
    echo "error: $required is not set (checked the environment and $ENV_FILE)" >&2
    exit 1
  fi
done

if [[ -z "$BUCKET" ]]; then
  echo "error: set B2_BUCKET or B2_BUCKET_NAME" >&2
  exit 1
fi

if [[ -z "$ENDPOINT" ]]; then
  echo "error: set B2_ENDPOINT, e.g. https://s3.eu-central-003.backblazeb2.com" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "error: the AWS CLI is required (B2 speaks the S3 API)" >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="$B2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$B2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="$REGION"

echo "source   : $SOURCE_DIR"
echo "target   : s3://$BUCKET/downloads/"
echo "endpoint : $ENDPOINT"
echo "mode     : $([[ $LIVE -eq 1 ]] && echo LIVE || echo 'DRY RUN (pass --live to upload)')"
echo

# Installers are versioned by filename and never edited in place, so they are
# safe to cache for a year. Content types are set explicitly because B2 defaults
# to application/octet-stream, which makes some browsers mangle the filename.
sync_args=(
  s3 sync "$SOURCE_DIR" "s3://$BUCKET/downloads/"
  --endpoint-url "$ENDPOINT"
  --cache-control "public, max-age=31536000, immutable"
  --no-progress
  --exclude "*"
  --include "*.exe"
  --include "*.zip"
  --include "*.rar"
  --include "*.zxp"
  --include "*.msi"
  --include "*.dmg"
)

[[ $LIVE -eq 0 ]] && sync_args+=(--dryrun)

aws "${sync_args[@]}"

if [[ $LIVE -eq 0 ]]; then
  echo
  echo "Dry run finished. Nothing was uploaded."
  exit 0
fi

echo
echo "Verifying the uploaded objects:"
aws s3 ls "s3://$BUCKET/downloads/" --endpoint-url "$ENDPOINT" --human-readable

cat <<'NEXT'

Next steps:
  1. Confirm each file downloads from the bucket's public URL in a browser.
  2. Set STATIC_CDN_BASE_URL in .env.production to that public base URL.
  3. docker compose up -d --force-recreate app
  4. curl -I https://<your-domain>/downloads/SaadStudio-Setup.exe
     Expect 307 with a Location header pointing at the bucket.
  5. Only after that is confirmed, consider removing the files from
     public/downloads in a separate commit.
NEXT
