#!/usr/bin/env bash
# Builds the signed APK of «عربی‌بازی» on your own Ubuntu computer (the same steps GitHub Actions runs).
# Usually you do NOT need this: every change pushed to GitHub builds the APK automatically.
# Run from the android/ folder:   ./update-app.sh
# Needs: Node 18+, JDK 17, Android SDK (ANDROID_HOME set), openssl. Internet for npm and Gradle.
set -euo pipefail
cd "$(dirname "$0")"
die(){ printf '\n✗ %s\n' "$*" >&2; exit 1; }
command -v node >/dev/null || die "Node نصب نیست:  sudo apt install nodejs npm"
command -v java >/dev/null || die "جاوا نصب نیست:  sudo apt install openjdk-17-jdk"
java -version 2>&1 | grep -q '"17' || die "برای Capacitor 6 جاوای ۱۷ لازم است."
command -v openssl >/dev/null || die "openssl نصب نیست:  sudo apt install openssl"
[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ] || die "مسیر Android SDK پیدا نشد؛ ANDROID_HOME را تنظیم کن."
echo "رمز کلید امضا همان رمزی است که در GitHub با نام APK_KEY_PASSWORD گذاشته‌اید."
echo "(اگر خالی بگذارید، یک نسخهٔ آزمایشی با کلید موقت ساخته می‌شود.)"
read -r -s -p "رمز (نمایش داده نمی‌شود): " APK_KEY_PASSWORD; echo
export APK_KEY_PASSWORD
bash ci/build.sh
echo
echo "فایل آماده: $(pwd)/out/arabibazi.apk"
