#!/usr/bin/env bash
# The mailbox switch-on steps (server/turn-on.sh) end to end on this computer, with a stand-in Cloudflare API,
# a stand-in wrangler that runs the real Worker locally, a local git "GitHub" and a stand-in gh. Needs WRANGLER_REAL.
set -euo pipefail
SRC=$(cd "$(dirname "$0")/.." && pwd); T=$(mktemp -d); WR=${WRANGLER_REAL:-/tmp/wr/node_modules/.bin/wrangler}
ok(){ echo "✓ $*"; }; no(){ echo "✗ $*"; exit 1; }
cleanup(){ for f in /tmp/mbx_ci_api.pid /tmp/mbx_ci_dev.pid; do [ -f $f ] && { kill -- -"$(cat $f)" 2>/dev/null || true; }; rm -f $f; done; true; }; trap cleanup EXIT; trap 'cleanup; exit 1' INT TERM; cleanup; sleep 1
setsid node "$SRC/tests/fake_cloudflare.mjs" 8790 & echo $! > /tmp/mbx_ci_api.pid; sleep 1
# stand-in wrangler: checks what deploy.sh gives it, then serves the real Worker on localhost:8787
cat > "$T/wrangler" <<W
#!/usr/bin/env bash
set -e
[ "\$1" = deploy ] && [ "\$2" = --config ] && [ "\$3" = wrangler.deploy.toml ] && [ "\$4" = --var ] || { echo "bad args: \$*"; exit 1; }
grep -q 'id = "fedcba9876543210fedcba9876543210"' wrangler.deploy.toml || { echo "no kv id"; exit 1; }
[ "\$CLOUDFLARE_ACCOUNT_ID" = 0123456789abcdef0123456789abcdef ] || { echo "no account"; exit 1; }
echo "Uploaded arabibazi for account 0123456789abcdef0123456789abcdef"
cp worker.js /tmp/mbx_ci_worker.js; [ -f /tmp/mbx_ci_dev.pid ] && { kill -- -"\$(cat /tmp/mbx_ci_dev.pid)" 2>/dev/null || true; }; sleep 1
setsid $WR dev /tmp/mbx_ci_worker.js --local --port 8787 --var "\${5}" > /tmp/mbx_ci_dev.log 2>&1 < /dev/null & echo \$! > /tmp/mbx_ci_dev.pid
echo "  https://arabibazi.\$(echo \$5 | head -c0)sub.workers.dev"
W
chmod +x "$T/wrangler"
mkdir -p "$T/bin"; printf '#!/usr/bin/env bash\necho "gh $*" >> %s/gh.log\n' "$T" > "$T/bin/gh"; chmod +x "$T/bin/gh"
# a local "GitHub": main = this project, gh-pages = an older site with README and .nojekyll
git init -q --bare "$T/remote.git"
git clone -q "$T/remote.git" "$T/seed" 2>/dev/null; ( cd "$T/seed" && git checkout -q -b main
  tar -C "$SRC" --exclude=./dist --exclude=./android/www --exclude='*/node_modules' --exclude=./tools/node_modules --exclude=./android/android --exclude=./android/out -cf - . | tar -xf -
  rm -f src/server.json server/out.txt server/deploy-out.txt server/wrangler.deploy.toml
  git add -A && git -c user.name=t -c user.email=t@t commit -qm seed && git push -q origin main
  git checkout -q --orphan gh-pages && git rm -rqf . && echo "# site" > README.md && touch .nojekyll && echo old > stale.txt
  git add -A && git -c user.name=t -c user.email=t@t commit -qm oldsite && git push -q origin gh-pages )
git clone -q -b main "$T/remote.git" "$T/work"
run(){ ( cd "$T/work" && PATH="$T/bin:$PATH" CF_API=http://localhost:8790/client/v4 WRANGLER="$T/wrangler" MAILBOX_TEST_URL=http://localhost:8787/ PING_WAIT=1 GH_TOKEN=x "$@" bash server/turn-on.sh ) ; }
# 1) no secret yet → nothing happens
out=$(run env CLOUDFLARE_API_TOKEN= 2>&1); echo "$out" | grep -c "هنوز خاموش" >/dev/null && ok "no secret: stays off" || no "no secret: $out"
[ "$(git -C "$T/remote.git" rev-list --count main)" = 1 ] && ok "…and nothing was pushed" || no "pushed without a secret"
# 2) a wrong token → clear error, nothing pushed
if out=$(run env CLOUDFLARE_API_TOKEN=wrong 2>&1); then no "wrong token passed"; fi
echo "$out" | grep -c "token was not accepted" >/dev/null && ok "wrong token: clear message" || no "wrong token: $out"
# 3) the real thing
out=$(run env CLOUDFLARE_API_TOKEN=test-token 2>&1) || { echo "$out"; no "turn-on failed"; }
echo "$out" | tail -3
st=$(curl -s http://localhost:8790/_state); echo "$st" | grep -c '"sub":"arabibazi-' >/dev/null && ok "chose a free workers.dev name (the first one was taken)" || no "subdomain: $st"
git -C "$T/remote.git" show main:src/server.json | grep -c '"url": "http://localhost:8787/"' >/dev/null && ok "main: src/server.json has the address" || no "server.json"
v=$(git -C "$T/remote.git" show main:src/version.json); [ "$v" = "$(node -e 'const v=require("'"$SRC"'/src/version.json"),p=v.version.split(".");p[2]=+p[2]+1;console.log(JSON.stringify({version:p.join("."),code:v.code+1}).replace(/":/g,"\": ").replace(/,"/g,", \""))')" ] && ok "main: version raised ($v)" || no "version: $v"
git -C "$T/remote.git" show gh-pages:index.html | grep -c "connect-src 'self' http://localhost:8787" >/dev/null && ok "site: new page talks to the mailbox" || no "site page"
git -C "$T/remote.git" show gh-pages:t/index.html | grep -c "connect-src 'self' http://localhost:8787" >/dev/null && ok "site: teacher panel too" || no "teacher page"
git -C "$T/remote.git" ls-tree --name-only gh-pages | grep -cx README.md >/dev/null && git -C "$T/remote.git" ls-tree --name-only gh-pages | grep -cx .nojekyll >/dev/null && ok "site: README and .nojekyll kept" || no "site extras"
git -C "$T/remote.git" ls-tree --name-only gh-pages | grep -cx stale.txt >/dev/null && no "old file left on the site" || ok "site: old files removed"
grep -q "gh workflow run android.yml --ref main" "$T/gh.log" && ok "APK build started" || no "APK build"
git -C "$T/work" status --porcelain | grep -v '^??' | grep -c . >/dev/null && no "work tree left dirty" || ok "nothing left half-committed"
grep -q "__KV_ID__" "$T/work/server/wrangler.toml" && ok "committed wrangler.toml stays the same for everyone" || no "wrangler.toml changed"
grep -rq "0123456789abcdef0123456789abcdef" "$T/work/server/deploy-out.txt" && no "account id in the log" || ok "account id hidden in the log"
# 4) again → only redeploys
n=$(git -C "$T/remote.git" rev-list --count main); out=$(run env CLOUDFLARE_API_TOKEN=test-token 2>&1) || no "second run failed"
echo "$out" | grep -c "روشن است" >/dev/null && [ "$(git -C "$T/remote.git" rev-list --count main)" = "$n" ] && ok "second run: redeploys only, no new version" || no "second run: $out"
echo "all passed"
