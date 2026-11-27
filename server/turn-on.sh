#!/usr/bin/env bash
# Turns the mailbox on (run by .github/workflows/server.yml and server-wait.yml):
# deploys the Worker; the first time it answers, writes its address into src/server.json, raises the version,
# rebuilds the site (gh-pages branch) and starts a new APK build. Later runs only redeploy the Worker.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
say(){ printf '%s\n' "$*"; [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '%s\n\n' "$*" >> "$GITHUB_STEP_SUMMARY"; return 0; }
bash server/deploy.sh
OUT=$(cat server/out.txt)
case "$OUT" in
  SKIPPED) say "⏳ صندوق خودکار هنوز خاموش است: رمز CLOUDFLARE_API_TOKEN در تنظیمات مخزن نیست."; exit 0;;
  WAIT)    say "⏳ صندوق روی Cloudflare گذاشته شد ولی نشانی‌اش هنوز جواب نمی‌دهد؛ دوباره امتحان می‌شود."; exit 0;;
  https://*|http://localhost:*) ;;
  *) say "❌ نتیجهٔ نامعلوم: $OUT"; exit 1;;
esac
OLD=$(node -p 'try{require("./src/server.json").url}catch(e){""}')
if [ "$OLD" = "$OUT" ]; then say "✅ صندوق خودکار روشن است ($OUT) و دوباره روی Cloudflare گذاشته شد."; exit 0; fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git fetch -q origin main && git checkout -q -B main FETCH_HEAD      # the newest main, in case it moved meanwhile
printf '{"url": "%s"}\n' "$OUT" > src/server.json
node -e 'const fs=require("fs"),f="src/version.json",v=JSON.parse(fs.readFileSync(f,"utf8")),p=v.version.split(".").map(Number);p[2]++;
 fs.writeFileSync(f,JSON.stringify({version:p.join("."),code:v.code+1}).replace(/":/g,"\": ").replace(/,"/g,", \"")+"\n")'
VER=$(node -p 'require("./src/version.json").version')
node build.mjs
grep -q "connect-src 'self' ${OUT%/}" dist/pwa/index.html
grep -q "connect-src 'self' ${OUT%/}" dist/pwa/t/index.html
git add src/server.json src/version.json
git commit -q -m "نسخهٔ $VER: صندوق خودکار روشن شد (کارنامه‌ها و سؤال‌های معلم بدون لینک می‌رسند)"
git push -q origin HEAD:main

# the site: same files as dist/pwa, keeping the branch's own README and .nojekyll
git fetch -q --depth 1 origin gh-pages
SITE=$(mktemp -d)
git worktree add -q --detach "$SITE" FETCH_HEAD
find "$SITE" -mindepth 1 -maxdepth 1 ! -name .git ! -name .nojekyll ! -name README.md -exec rm -rf {} +
cp -R dist/pwa/. "$SITE"/
( cd "$SITE" && git add -A && git commit -q -m "نسخهٔ $VER: صندوق خودکار روشن شد" && git push -q origin HEAD:gh-pages )
PAGES_SHA=$(git -C "$SITE" rev-parse HEAD)
git worktree remove --force "$SITE"
# the push starts the Pages build; ask for one as well (harmless if already running) and wait until the new site is built
PG="سایت هم به‌روز شد."
if [ -n "${GITHUB_REPOSITORY:-}" ]; then
  PG="⚠️ سایت هنوز ساخته نشده بود؛ معمولاً چند دقیقه بعد خودش به‌روز می‌شود."
  gh api -X POST "repos/$GITHUB_REPOSITORY/pages/builds" >/dev/null 2>&1 || true
  for i in $(seq 1 40); do
    st=$(gh api "repos/$GITHUB_REPOSITORY/pages/builds/latest" --jq '.status+" "+.commit' 2>/dev/null || true)
    [ "$st" = "built $PAGES_SHA" ] && { PG="سایت هم به‌روز شد."; break; }
    case "$st" in errored*) PG="⚠️ ساخت سایت در GitHub خطا داد."; break;; esac
    sleep 6
  done
fi

# the Android app
if gh workflow run android.yml --ref main; then APK="ساخت فایل اندروید هم شروع شد."; else APK="ساخت فایل اندروید خودکار شروع نشد؛ با تغییر بعدی ساخته می‌شود."; fi
say "✅ صندوق خودکار روشن شد: $OUT — نسخهٔ $VER. $PG $APK"
