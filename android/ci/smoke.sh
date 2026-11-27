#!/usr/bin/env bash
# Smoke test on an Android emulator (GitHub Actions): install the APK, open it, take screenshots,
# try the name/grade screen and the back button, and keep logcat. Never fails the build by itself;
# everything it sees is written to smoke-<api>/ for a person to look at.
set -u
API="${1:-x}"; OUT="smoke-$API"; mkdir -p "$OUT"
APP=ir.arabibazi.app
shot(){ adb exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
dump(){ adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb exec-out cat /sdcard/ui.xml > "$OUT/$1.xml" 2>/dev/null; }
# centre of the first node whose text/content-desc contains $2 (or whose class is $2) in dump $1
find_node(){ python3 - "$OUT/$1.xml" "$2" <<'PY'
import re,sys,xml.etree.ElementTree as ET
try: root=ET.parse(sys.argv[1]).getroot()
except Exception: sys.exit(1)
key=sys.argv[2]
for n in root.iter("node"):
    t=(n.get("text") or "")+" "+(n.get("content-desc") or "")
    if key in t or n.get("class")==key:
        x1,y1,x2,y2=map(int,re.findall(r"\d+",n.get("bounds")));print((x1+x2)//2,(y1+y2)//2);sys.exit(0)
sys.exit(1)
PY
}
tap_node(){ local xy; xy=$(find_node "$1" "$2") && { adb shell input tap $xy; echo "tap $2 at $xy"; return 0; }; echo "not found: $2"; return 1; }

adb wait-for-device
adb shell getprop ro.build.version.release > "$OUT/android-version.txt"
adb shell dumpsys package com.google.android.webview 2>/dev/null | grep -m1 versionName > "$OUT/webview-version.txt" || true
adb install -r android/out/arabibazi.apk > "$OUT/install.txt" 2>&1; cat "$OUT/install.txt"
adb shell dumpsys package $APP | grep -E "versionCode|versionName" | head -2 > "$OUT/package.txt"
adb logcat -c
adb shell monkey -p $APP -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 1.6; shot 1-intro
sleep 4.5; shot 2-start
dump 2-start
# name + grade 11 (the name box is the only text field on this screen)
if tap_node 2-start android.widget.EditText; then
  sleep 0.8; adb shell input text "Sara"; sleep 0.5; adb shell input keyevent 111   # ESC closes the keyboard
  sleep 0.8; dump 2b-name
  tap_node 2b-name "یازدهم" && sleep 2.5
fi
shot 3-after-grade; dump 3-after-grade
tap_node 3-after-grade "رد شدن" && sleep 1     # skip the tour if it is showing
shot 4-home
# back button: close the settings sheet first, then leave the app
tap_node 4-home "تنظیمات" && sleep 1.2 && shot 5-settings
adb shell input keyevent 4; sleep 1.2; shot 6-after-back
adb shell input keyevent 4; sleep 1.5; shot 7-after-second-back
adb shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity|ResumedActivity" | head -3 > "$OUT/after-back-focus.txt"
adb shell monkey -p $APP -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 1.2; shot 8-reopen-intro
sleep 4.5; shot 9-reopen
adb logcat -d > "$OUT/logcat-all.txt"
grep -E "Capacitor|chromium|AndroidRuntime|FATAL|$APP" "$OUT/logcat-all.txt" | tail -300 > "$OUT/logcat.txt"
grep -c "FATAL EXCEPTION" "$OUT/logcat-all.txt" > "$OUT/crashes.txt" || true
ls -la "$OUT"
exit 0
