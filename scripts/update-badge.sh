#!/usr/bin/env bash
# scripts/update-badge.sh
# Usage: ./scripts/update-badge.sh <profile> <platform> [status]
# Examples:
#   ./scripts/update-badge.sh production android
#   ./scripts/update-badge.sh preview android building
#   ./scripts/update-badge.sh production android failed
#
# Requires COPA_GIST_TOKEN in your shell profile (~/.zshrc):
#   export COPA_GIST_TOKEN="github_pat_..."

set -euo pipefail

PROFILE="${1:-production}"
PLATFORM="${2:-android}"
STATUS="${3:-success}"

if [[ -z "${COPA_GIST_TOKEN:-}" ]]; then
  echo "❌  COPA_GIST_TOKEN is not set. Add it to your shell profile."
  exit 1
fi

case "$PLATFORM" in
  android) GIST_ID="d2ca48d8459d001342f0ab89cab24d69" ;;
  ios)     GIST_ID="99274dbb100f6febf3c4d7fc20e0375b" ;;
  *)
    echo "❌  Unknown platform '${PLATFORM}'. Use 'android' or 'ios'."
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

VERSION=$(node -e "
const cfg = require('${REPO_ROOT}/app.config.js');
const expo = cfg.default?.expo ?? cfg.expo;
console.log(expo?.version ?? 'unknown');
" 2>/dev/null || echo "unknown")

case "$STATUS" in
  success)  COLOR="brightgreen" ;;
  building) COLOR="blue" ;;
  failed)   COLOR="critical" ;;
  *)        COLOR="lightgrey" ;;
esac

DATE="$(date -u +%Y-%m-%d)"
FILENAME="copa-${PLATFORM}.json"
LABEL="${PLATFORM} · ${PROFILE}"
MESSAGE="v${VERSION} · ${DATE}"

JSON_CONTENT=$(printf \
  '{"schemaVersion":1,"label":"%s","message":"%s","color":"%s","namedLogo":"expo","logoColor":"white"}' \
  "$LABEL" "$MESSAGE" "$COLOR")

PAYLOAD=$(printf '{"files":{"%s":{"content":%s}}}' \
  "$FILENAME" \
  "$(echo "$JSON_CONTENT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH \
  -H "Authorization: token ${COPA_GIST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "https://api.github.com/gists/${GIST_ID}")

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo "✅  Badge updated → ${LABEL}: ${MESSAGE} (${COLOR})"
else
  echo "❌  Gist update failed (HTTP ${HTTP_STATUS}). Check COPA_GIST_TOKEN."
  exit 1
fi