# Browser tests in Chromium (mobile size): grade switch, separate data, offline, update flow, throttled speed, manifest.
import json,subprocess,shutil,re,time
from playwright.sync_api import sync_playwright
URL="http://localhost:8765/";SITE="/tmp/site";R={}
SEEN="if(!localStorage.getItem('arabibazi:state'))localStorage.setItem('arabibazi:state',JSON.stringify({name:'تست',ui:{intro:1,tour:1,qtip:1}}))"
def mobile(b,fresh=False,**kw):
    c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True,**kw)
    if not fresh:c.add_init_script(SEEN)   # returning student: name saved, tour already seen
    return c
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    # --- every open: a 3-second intro that a tap cannot skip; the tour comes once, after choosing a grade
    OBS="new MutationObserver(function(m,o){var i=document.getElementById('intro');if(!i)return;if(!i.hidden&&!window.__t0)window.__t0=performance.now();if(i.hidden&&window.__t0&&!window.__introMs){window.__introMs=Math.round(performance.now()-window.__t0);o.disconnect()}}).observe(document,{subtree:true,attributes:true,attributeFilter:['hidden']})"
    c=mobile(b,fresh=True);c.add_init_script(OBS)
    pg=c.new_page();pg.goto(URL);pg.wait_for_timeout(250)
    R["intro_shown"]=pg.is_visible("#intro")
    pg.mouse.click(195,420);pg.wait_for_timeout(500);R["intro_tap_does_not_skip"]=pg.is_visible("#intro")
    pg.wait_for_selector("#intro",state="hidden",timeout=6000);R["intro_ms"]=pg.evaluate("window.__introMs")
    pg.click('[data-act="pickGrade"][data-g="10"]');pg.wait_for_timeout(300);R["name_needed_before_grade"]=pg.is_visible("#pick")
    pg.fill("#nm","تست");pg.click('[data-act="pickGrade"][data-g="10"]');pg.wait_for_selector("#tour:not([hidden])",timeout=4000)
    steps=1
    while pg.is_visible("#tour"):
        pg.click('#tour [data-act="tourNext"]');pg.wait_for_timeout(450);steps+=1
        if steps>10:break
    R["tour_steps"]=steps-1;R["tour_saved"]=pg.evaluate("JSON.parse(localStorage.getItem('arabibazi:state')).ui.tour===1")
    pg.reload();pg.wait_for_timeout(300);R["intro_again_on_next_open"]=pg.is_visible("#intro")
    pg.wait_for_selector("#intro",state="hidden",timeout=6000);pg.wait_for_timeout(700);R["no_tour_second_time"]=pg.is_hidden("#tour")
    c.close()
    # --- grade switch mid-session + separate data
    c=mobile(b);pg=c.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(URL);pg.click('[data-act="pickGrade"][data-g="12"]');pg.wait_for_timeout(600)
    pg.click('[data-act="start"][data-m="mixed"]');pg.wait_for_timeout(300)
    q=pg.evaluate("__app.ses().qs[0]");wrong=(q["a"]+1)%4
    pg.click(f'#qO .opt >> nth={wrong}');pg.wait_for_timeout(200)
    g12_wrong=pg.evaluate("__app.S.wrong[12]")
    pg.evaluate("__app.setGrade(10)");pg.wait_for_timeout(600)
    R["queue_cleared_on_switch"]=pg.evaluate("__app.ses()") is None
    pg.click('[data-act="start"][data-m="mixed"]');pg.wait_for_timeout(300)
    ses=pg.evaluate("__app.ses()");R["next_question_after_12to10"]=ses["qs"][0]["id"]
    R["switch_ok"]=all(x["g"]==10 for x in ses["qs"])
    pg.evaluate("document.querySelector('[data-act=quit]').click()");pg.wait_for_timeout(200);pg.evaluate("document.querySelector('#dlg .btn').click()");pg.wait_for_timeout(300)
    pg.click('[data-act="tab"][data-v="review"]');pg.wait_for_timeout(300)
    R["grade12_mistake_hidden_in_10"]=pg.locator('#v-review [data-m="review"]').count()==0 and len(g12_wrong)==1
    pg.evaluate("__app.setGrade(12)");pg.wait_for_timeout(500);pg.click('[data-act="tab"][data-v="review"]');pg.wait_for_timeout(300)
    R["grade12_mistake_still_in_12"]=pg.locator('#v-review [data-m="review"]').count()==1
    R["errors"]=errs;c.close()
    # --- offline after first visit
    c=mobile(b);pg=c.new_page();pg.goto(URL);pg.evaluate("navigator.serviceWorker.ready");pg.wait_for_timeout(800)
    pg.click('[data-act="pickGrade"][data-g="11"]');pg.wait_for_timeout(1000)
    c.set_offline(True);pg.reload();pg.wait_for_timeout(1200)
    R["offline_home_chapters"]=pg.locator("#v-home .ch").count()
    pg.click('[data-act="start"][data-m="mixed"]');pg.wait_for_timeout(400);R["offline_question_shown"]=pg.locator("#qO .opt").count()==4
    c.set_offline(False)
    # --- update flow: publish a new version, page must offer it and never reload by itself
    src=open(SITE+"/sw.js").read();open(SITE+"/sw.js","w").write(re.sub(r'var V="([^"]+)"',lambda m:'var V="'+m.group(1)+'-test"',src,count=1))
    pg.evaluate("window.__marker=1;window.__reg&&window.__reg.update()");pg.wait_for_timeout(2500)
    R["update_bar_shown"]=pg.is_visible("#upd");R["no_auto_reload"]=pg.evaluate("window.__marker===1")
    pg.evaluate("document.querySelector('#upd .btn').click()");pg.wait_for_timeout(2500)
    R["reloaded_after_tap"]=pg.evaluate("window.__marker===undefined")
    R["new_cache"]=pg.evaluate("caches.keys()")
    open(SITE+"/sw.js","w").write(src);c.close()
    # --- manifest / installability
    c=mobile(b);pg=c.new_page();pg.goto(URL);pg.wait_for_timeout(1500);cdp=c.new_cdp_session(pg)
    m=cdp.send("Page.getAppManifest");R["manifest_errors"]=m.get("errors");
    try:R["installability_errors"]=[e["errorId"] for e in cdp.send("Page.getInstallabilityErrors")["installabilityErrors"]]
    except Exception as e:R["installability_errors"]=str(e)
    c.close()
    # --- speed on a 4x/6x slower CPU: open app + 50 answers, count long pauses (>50 ms)
    for rate in (4,6):
        c=mobile(b);pg=c.new_page();cdp=c.new_cdp_session(pg);cdp.send("Emulation.setCPUThrottlingRate",{"rate":rate})
        pg.add_init_script("window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:'longtask',buffered:true})")
        t0=time.time();pg.goto(URL);pg.wait_for_selector('[data-act="pickGrade"]');load=time.time()-t0
        pg.click('[data-act="pickGrade"][data-g="11"]');pg.wait_for_selector("#v-home .ch")
        boot_lt=pg.evaluate("window.__lt.slice()");pg.evaluate("window.__lt=[]")
        n=0
        while n<50:
            pg.click('[data-act="start"][data-m="mixed"]') if pg.is_visible('[data-act="start"][data-m="mixed"]') else None
            for i in range(10):
                pg.click('#qO .opt >> nth=0');n+=1;pg.click('#qN')
            pg.wait_for_selector('#result:not([hidden])');pg.click('[data-act="home"]');pg.wait_for_selector("#v-home .ch")
        R[f"cpu{rate}x"]={"open_s":round(load,2),"long_tasks_open_ms":boot_lt,"answers":n,"long_tasks_during_answers_ms":pg.evaluate("window.__lt")}
        c.close()
    b.close()
print(json.dumps(R,ensure_ascii=False,indent=1))
