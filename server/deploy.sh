#!/usr/bin/env bash
# Deploys the mailbox Worker to Cloudflare. Needs the repository secret CLOUDFLARE_API_TOKEN
# (made from the «Edit Cloudflare Workers» template); CLOUDFLARE_ACCOUNT_ID is optional.
# Leaves the result in server/out.txt: the Worker's address, SKIPPED (no secret yet) or WAIT (deployed, not answering yet).
set -euo pipefail
cd "$(dirname "$0")"
rm -f out.txt deploy-out.txt wrangler.deploy.toml
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then echo "The Cloudflare secret is not set yet; nothing deployed."; echo SKIPPED > out.txt; exit 0; fi
W=${WRANGLER:-"npx -y wrangler@4.168.0"}
export WRANGLER_SEND_METRICS=false
ID=$(node cf.mjs account); export CLOUDFLARE_ACCOUNT_ID="$ID"
[ -n "${GITHUB_ACTIONS:-}" ] && echo "::add-mask::$ID"
SUB=$(node cf.mjs subdomain)
KV=$(node cf.mjs kv ARABIBAZI)
SIG=$(node -p 'require("../src/teacher.json").code.split(".")[1]')
[[ "$SUB" =~ ^[a-z0-9-]+$ && "$KV" =~ ^[0-9a-f]{32}$ && "$SIG" =~ ^[A-Za-z0-9_-]{80,}$ ]] || { echo "::error::Unexpected answer from Cloudflare."; exit 1; }
# the storage id is filled in only for this deploy, so the committed wrangler.toml stays the same for everyone
sed "s/__KV_ID__/$KV/" wrangler.toml > wrangler.deploy.toml
$W deploy --config wrangler.deploy.toml --var "TEACHER_SIG:$SIG" 2>&1 | sed "s/$ID/***/g" | tee deploy-out.txt
url=${MAILBOX_TEST_URL:-"https://arabibazi.$SUB.workers.dev/"}
for i in $(seq 1 30); do
  if curl -fsS --max-time 10 "${url}ping" 2>/dev/null | grep -q arabibazi; then echo "$url" > out.txt; echo "mailbox: $url"; exit 0; fi
  sleep "${PING_WAIT:-10}"
done
echo WAIT > out.txt
echo "::warning::Deployed, but $url does not answer yet (a new workers.dev address can take a few minutes); it will be tried again."
