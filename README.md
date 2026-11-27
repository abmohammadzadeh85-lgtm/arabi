# عربی‌بازی — source

One source, four outputs: the web app (GitHub Pages, branch `gh-pages`), the teacher panel (`/t/`),
one offline file (`dist/standalone.html`) and the Android app (APK, built by GitHub Actions).
Persian report for the owner: `REPORT-fa.md`.

```
node build.mjs                      # builds everything, prints sizes; stops if the question bank is broken
node tests/leak.cjs                 # 1000 sessions × 3 modes × 3 grades (+ teacher questions): no cross-grade question
python3 tests/browser.py            # needs dist/pwa served at http://localhost:8765/
python3 tests/teacher_e2e.py        # teacher panel ↔ student app, end to end (uses a throw-away teacher key)
python3 tests/back_test.py          # back button / back swipe closes the top layer
node tests/worker_unit.mjs          # the mailbox Worker against an in-memory KV
python3 tests/mailbox_e2e.py        # mailbox in a real browser, Worker run locally (WRANGLER=…/wrangler)
bash tests/mailbox_ci_test.sh       # server/turn-on.sh end to end with a stand-in Cloudflare API, git remote and gh
python3 tests/sound_measure.py      # renders every sound with the app's own code and measures it
python3 tools/contrast.py src/themes.json
python3 tools/android_icons.py      # redraws the Android launcher icons from src/mascot.svg.txt
```

| Path | What |
|---|---|
| `src/bank/` | question generators (gen10/11/12), `lessons.mjs` (one generator per textbook lesson + lesson titles), `vocab.mjs` (each lesson's glossary words from عربی ۱ و ۲), validation, normalisation |
| `src/app/` | `index.html` template, `style.css`, `i18n.js`, `engine.js` (grade lock: only `poolFor(g)` reads the bank, teacher questions included), `sound.js`, `crypto.js`, `ui.js`, `sw.js` |
| `src/teacher/` | teacher panel: keys are made and kept (passphrase-wrapped) on the teacher's device; reports arrive sealed for her key; question packs leave signed with it |
| `src/teacher.json` | the teacher's **public** code `{"code":"AB1…"}`, built into the app. Missing → reports and teacher questions are off |
| `src/server.json` | `{"url":"https://arabibazi.<name>.workers.dev/"}`, written by the Mailbox workflow. Missing → everything travels by links |
| `server/` | the mailbox: `worker.js` (Cloudflare Worker + KV), `cf.mjs` (account, workers.dev name, storage), `deploy.sh`, `turn-on.sh`, `log.sh` |
| `src/apk.json` | `{"ready":true}` shows the Android download link in the web app (only once a release signed with the permanent key exists) |
| `src/themes.json` | the 18 themes (single source for CSS and the contrast test) |
| `src/version.json` | single version source (app, service worker cache, Android versionName/versionCode) |
| `src/overrides.json` | manual grade fixes: `{"question-id": 12}` or `null` to quarantine |
| `android/` | Capacitor 6 shell. `ci/build.sh` builds and signs the APK, `ci/smoke.sh` opens it on an emulator, `ci/res/` icons + launch screen, `update-app.sh` = the same build on your own Ubuntu |
| `.github/workflows/android.yml` | every push to `main` that touches the app → APK → GitHub release; screenshots/logs → branch `ci-logs` |
| `.github/workflows/server.yml`, `server-wait.yml` | the mailbox: deploys the Worker, then turns it on in the site and the app (see below) |
| `reports/` | theme screenshots, sound measurements, test results, sound samples |

## Android signing

Repository secret `APK_KEY_PASSWORD` (Settings → Secrets and variables → Actions), at least 12 characters.
On the first build with it, a signing key is made and stored **encrypted with that password** in
`android/ci/keystore.p12.enc`; every later build reuses it, so installed apps update in place.
Without the secret the workflow still builds, but as a pre-release `preview` signed with a throw-away key.

## Mailbox (no links to pass around)

Optional and off until the repository secret `CLOUDFLARE_API_TOKEN` exists (a token made from Cloudflare's
**Edit Cloudflare Workers** template; `CLOUDFLARE_ACCOUNT_ID` is only needed if the token reaches several accounts).
`server-wait.yml` checks every 20 minutes; once the secret is there it deploys `server/worker.js` (choosing a
workers.dev name and making the KV storage if needed), writes the address to `src/server.json`, raises the version,
pushes the rebuilt site to `gh-pages`, starts the APK build, and switches its own timer off. Later changes under
`server/` redeploy through `server.yml`. A short log (ids masked) goes to the branch `ci-server`.

What travels: a student's report card, already sealed for the teacher's key, after a sprint (at most every 20 minutes,
and when the app is closed or opened, at most every 3 minutes, only if there is new progress); the teacher's signed
question packs, league tables (family names cut to one letter) and tests, which every app of that grade picks up on
its next start. The Worker cannot read reports, accepts only packs signed with the teacher's public code, and each
phone writes under SHA-256 of its own random secret. No accounts, no tokens in the apps. Free-plan sizing: one KV write
per report and per pack; packs and reports are paged (`since`), so a request never parses much. If the Worker cannot
be reached, everything falls back to the links.

## Security model (teacher)

No accounts. The teacher panel makes an ECDSA P-256 key (signs question packs) and an ECDH P-256 key
(opens reports) on the teacher's device; the private halves are wrapped with her passphrase (PBKDF2-SHA256, 600 000
rounds → AES-GCM) and never leave the device except inside her backup code. Students' reports are sealed with an
ephemeral ECDH key + HKDF-SHA256 + AES-GCM, so only her panel can read them; the app accepts a question pack only if
its ECDSA signature matches the public code built into the app. Opening `/t/` therefore gives nobody else anything:
a new panel has its own keys, which the app does not trust. Pages lock their scripts with a hash-based CSP and the
panel refuses to run inside a frame.

The optional mailbox (above) only carries what is already sealed or signed.

Storage keys: `arabibazi:state`, `arabibazi:sound`, `arabibazi:packs` (student app);
`arabibazi-teacher:*` (teacher panel).
