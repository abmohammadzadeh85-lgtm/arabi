#!/usr/bin/env bash
# Builds and signs android/out/arabibazi.apk from the source (used by GitHub Actions and by ../update-app.sh).
#
# Signing key:
#   APK_KEY_PASSWORD set   → the permanent key in android/ci/keystore.p12.enc (made on first use, then reused
#                            forever, so installed apps can update). The file is encrypted with that password.
#   APK_KEY_PASSWORD empty → a throw-away key just for this build ("preview"): fine for trying the app,
#                            but an app installed from it cannot be updated later without reinstalling.
# Writes android/out/result.env (KIND, VERSION, CODE, NEW_KEY, SHA256, CERT) for the workflow.
set -euo pipefail
cd "$(dirname "$0")/.."                       # → android/
ROOT=$(cd .. && pwd)
say(){ printf '\n▶ %s\n' "$*"; }

VER=$(node -p "require('$ROOT/src/version.json').version")
CODE=$(node -p "require('$ROOT/src/version.json').code")
say "عربی‌بازی $VER (versionCode $CODE)"

say "1) web app → android/www"
( cd "$ROOT" && node build.mjs )
grep -q '"target":"apk"' www/index.html

say "2) Capacitor project"
npm ci --no-audit --no-fund
rm -rf android
npx cap add android
# icons, launch screen and theme of عربی‌بازی over the template
find android/app/src/main/res -name 'splash.png' -delete
cp -R ci/res/. android/app/src/main/res/
GRADLE=android/app/build.gradle
grep -q 'applicationId "ir.arabibazi.app"' "$GRADLE"
sed -i -E "s/versionCode [0-9]+/versionCode $CODE/; s/versionName \"[^\"]*\"/versionName \"$VER\"/" "$GRADLE"
grep -q "versionCode $CODE" "$GRADLE"
npx cap sync android

say "3) Gradle (release, unsigned)"
( cd android && ./gradlew --no-daemon --stacktrace assembleRelease )
UNSIGNED=android/app/build/outputs/apk/release/app-release-unsigned.apk
[ -f "$UNSIGNED" ]

say "4) sign"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
BT=$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)
mkdir -p out; rm -f out/arabibazi.apk out/result.env
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
"$BT/zipalign" -f -p 4 "$UNSIGNED" "$TMP/aligned.apk"
NEW_KEY=0
if [ -n "${APK_KEY_PASSWORD:-}" ]; then
  [ ${#APK_KEY_PASSWORD} -ge 12 ] || { echo "::error::APK_KEY_PASSWORD must be at least 12 characters"; exit 1; }
  KIND=release; export KS_PASS="$APK_KEY_PASSWORD"
  if [ -f ci/keystore.p12.enc ]; then
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in ci/keystore.p12.enc -out "$TMP/ks.p12" -pass env:KS_PASS \
      || { echo "::error::Could not open android/ci/keystore.p12.enc with APK_KEY_PASSWORD (was the password changed?)"; exit 1; }
  else
    keytool -genkeypair -storetype PKCS12 -keystore "$TMP/ks.p12" -alias arabibazi -keyalg RSA -keysize 4096 -validity 36500 \
      -storepass:env KS_PASS -keypass:env KS_PASS -dname "CN=Arabi Bazi, O=Arabi Bazi, C=IR"
    openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -in "$TMP/ks.p12" -out ci/keystore.p12.enc -pass env:KS_PASS
    NEW_KEY=1
  fi
else
  KIND=preview; export KS_PASS=$(openssl rand -hex 24)
  keytool -genkeypair -storetype PKCS12 -keystore "$TMP/ks.p12" -alias arabibazi -keyalg RSA -keysize 2048 -validity 3650 \
    -storepass:env KS_PASS -keypass:env KS_PASS -dname "CN=Arabi Bazi preview, O=Arabi Bazi, C=IR"
fi
"$BT/apksigner" sign --ks "$TMP/ks.p12" --ks-key-alias arabibazi --ks-pass env:KS_PASS --key-pass env:KS_PASS \
  --out out/arabibazi.apk "$TMP/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs out/arabibazi.apk | tee "$TMP/verify.txt"
CERT=$(awk -F': ' '/certificate SHA-256 digest/{print $2; exit}' "$TMP/verify.txt")
SHA=$(sha256sum out/arabibazi.apk | cut -d' ' -f1)
printf 'KIND=%s\nVERSION=%s\nCODE=%s\nNEW_KEY=%s\nSHA256=%s\nCERT=%s\nSIZE=%s\n' \
  "$KIND" "$VER" "$CODE" "$NEW_KEY" "$SHA" "$CERT" "$(stat -c %s out/arabibazi.apk)" > out/result.env
cat out/result.env
say "ready: android/out/arabibazi.apk ($KIND)"
