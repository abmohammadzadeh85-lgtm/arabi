#!/usr/bin/env bash
# Pushes a short log of the mailbox run to the ci-server branch (used by the workflows; no secrets, and account ids are hidden).
set -uo pipefail
cd "$(dirname "$0")/.."
D=$(mktemp -d)
for f in server/out.txt server/deploy-out.txt turn-on.log; do [ -f "$f" ] && cp "$f" "$D/"; done
printf 'run=%s\nsha=%s\nstatus=%s\nwhen=%s\n' "${GITHUB_RUN_ID:-local}" "${GITHUB_SHA:-}" "${1:-}" "$(date -u +%FT%TZ)" > "$D/run.txt"
sed -E -i 's/\b[0-9a-f]{32}\b/***/g' "$D"/*     # account and storage ids
cd "$D" && git init -q && git checkout -q -b ci-server && git add -A
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" commit -qm "گزارش صندوق ${GITHUB_RUN_ID:-}"
git push -q -f "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" ci-server
