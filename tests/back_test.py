# Back button / back swipe closes the top layer (sheet, dialog, quiz, other tab) instead of leaving the app.
import json
from playwright.sync_api import sync_playwright
URL="http://localhost:8765/";R={}
SEEN="if(!localStorage.getItem('arabibazi:state'))localStorage.setItem('arabibazi:state',JSON.stringify({name:'تست',grade:11,ui:{intro:1,tour:1,qtip:1}}))"
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    c=b.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True);c.add_init_script(SEEN);pg=c.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("about:blank");pg.goto(URL);pg.wait_for_selector("#intro",state="hidden",timeout=6000);pg.wait_for_selector("#v-home .ch")
    back=lambda:(pg.evaluate("history.back()"),pg.wait_for_timeout(350))
    pg.click('.hdr [data-act="settings"]');pg.wait_for_timeout(300);back();R["back_closes_settings"]=pg.is_hidden("#sheet") and pg.url.startswith(URL)
    pg.click('[data-act="tab"][data-v="stats"]');pg.wait_for_timeout(300);back();R["back_goes_home_tab"]=pg.is_visible("#v-home") and pg.url.startswith(URL)
    pg.click('[data-act="start"][data-m="mixed"]');pg.wait_for_timeout(300);back();R["back_in_quiz_asks_first"]=pg.is_visible("#dlg") and pg.is_visible("#play")
    back();R["back_again_keeps_quiz"]=pg.is_hidden("#dlg") and pg.is_visible("#play")
    back();pg.click("#dlg .btn >> nth=0");pg.wait_for_timeout(350);R["quit_returns_home"]=pg.is_visible("#main") and pg.is_hidden("#play")
    # closed with the X: the extra history entry is removed too, so one back leaves the app
    pg.click('.hdr [data-act="settings"]');pg.wait_for_timeout(300);pg.click('#sheet [data-act="closeSheet"]') if pg.locator('#sheet [data-act="closeSheet"]').count() else pg.keyboard.press("Escape");pg.wait_for_timeout(400)
    R["history_clean_after_ui_close"]=pg.evaluate("history.state===null")
    try:pg.evaluate("history.back()")
    except Exception:pass   # leaving the page ends the script context — that's the expected result
    pg.wait_for_timeout(600);R["one_back_leaves_from_home"]=pg.url=="about:blank"
    R["errors"]=errs;b.close()
print(json.dumps(R,ensure_ascii=False,indent=1))
