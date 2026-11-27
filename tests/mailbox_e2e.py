# Mailbox end to end in a real browser, with the real Worker running locally (wrangler dev; WRANGLER=/path/to/wrangler):
# report cards reach the teacher's panel by themselves (spaced out to save the free server's writes);
# questions, the league table and tests reach the students by themselves.   python3 tests/mailbox_e2e.py
import json,os,subprocess,time,atexit,shutil,signal,urllib.request
from playwright.sync_api import sync_playwright
URL="http://localhost:8765/";SRV="http://localhost:8787/";WR=os.environ.get("WRANGLER","/tmp/wr4/node_modules/.bin/wrangler");R={};DEV=[None]
_REAL=open("src/teacher.json").read() if os.path.exists("src/teacher.json") else None
def stop():
    if DEV[0]:
        try: os.killpg(DEV[0].pid,signal.SIGTERM)
        except Exception: pass
        DEV[0]=None
def restore():
    if _REAL: open("src/teacher.json","w").write(_REAL)
    elif os.path.exists("src/teacher.json"): os.remove("src/teacher.json")
    if os.path.exists("src/server.json"): os.remove("src/server.json")
    stop()
atexit.register(restore)
def build():
    subprocess.run(["node","build.mjs"],check=True,capture_output=True);subprocess.run("rm -rf /tmp/site && cp -r dist/pwa /tmp/site",shell=True,check=True)
def worker(sig):
    stop();time.sleep(1);d="/tmp/mbx_srv";shutil.rmtree(d,ignore_errors=True);shutil.copytree("server",d)
    DEV[0]=subprocess.Popen([WR,"dev","--local","--port","8787","--var","TEACHER_SIG:"+sig],cwd=d,stdout=open("/tmp/mbx_dev.log","w"),stderr=subprocess.STDOUT,stdin=subprocess.DEVNULL,start_new_session=True)
    for _ in range(60):
        time.sleep(1)
        try: urllib.request.urlopen(SRV+"ping",timeout=2);return
        except Exception: pass
    raise SystemExit("worker did not start")
def get(path): return json.loads(urllib.request.urlopen(SRV+path,timeout=5).read())
SEEN=lambda n:"if(!localStorage.getItem('arabibazi:state'))localStorage.setItem('arabibazi:state',JSON.stringify({name:%s,grade:11,ui:{intro:1,tour:1,qtip:1}}))"%json.dumps(n)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"]);errs=[]
    T=b.new_context(viewport={"width":390,"height":844});tp=T.new_page();tp.on("pageerror",lambda e:errs.append("T:"+str(e)))
    open("src/server.json","w").write(json.dumps({"url":SRV}));build()
    tp.goto(URL+"t/");tp.wait_for_selector("#s-setup:not([hidden])");tp.fill("#p1","Mailbox-Test-2026!");tp.fill("#p2","Mailbox-Test-2026!");tp.click('[data-act="create"]')
    tp.wait_for_selector("#s-backup:not([hidden])",timeout=20000);tp.check("#bkOk");tp.click('[data-act="bkNext"]');tp.wait_for_selector("#s-code:not([hidden])");code=tp.inner_text("#tcode")
    tp.click('[data-act="codeNext"]');tp.wait_for_selector("#s-dash:not([hidden])")
    open("src/teacher.json","w").write(json.dumps({"code":code}));build();worker(code.split(".")[1])
    S=b.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True);S.add_init_script(SEEN("سارا مرادی"));sp=S.new_page();sp.on("pageerror",lambda e:errs.append("S:"+str(e)))
    posts=[];sp.on("request",lambda r:posts.append(r.headers.get("content-type","")) if r.method=="POST" and r.url.startswith(SRV) else None)
    pre=[];sp.on("request",lambda r:pre.append(1) if r.method=="OPTIONS" else None)
    fr=[];sp.on("response",lambda r:fr.append(r) if r.url.startswith(SRV+"f?") else None)
    def sprint():
        sp.click("#daily");sp.wait_for_selector("#play:not([hidden])")
        for i in range(10):
            q=sp.evaluate("__app.ses().qs[__app.ses().i]");sp.click(f'#qO .opt >> nth={q["a"] if i%3 else (q["a"]+1)%4}');sp.click("#qN");sp.wait_for_timeout(330)
        sp.wait_for_selector("#result:not([hidden])");sp.wait_for_timeout(2500)
    sp.goto(URL);sp.wait_for_selector("#lrow .lcard",timeout=15000);sp.wait_for_selector("#intro",state="hidden",timeout=8000)
    sprint();a1=sp.evaluate("__app.S.sentAt");R["report_sent_by_itself_after_a_sprint"]=bool(a1)
    R["no_preflight_request"]=not pre and all(c.startswith("text/plain") for c in posts)
    sp.goto(URL);sp.wait_for_selector("#intro",state="hidden",timeout=8000);sprint()
    R["second_sprint_waits_(spaced_out)"]=sp.evaluate("__app.S.sentAt")==a1 and sp.evaluate("(__app.S.mbxD||0)>(__app.S.sentAt||0)")
    sp.evaluate("__app.S.sentAt=Date.now()-4*60000");n0=len(posts)
    sp.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))");sp.wait_for_timeout(2500)
    R["sent_when_the_app_is_closed"]=len(posts)==n0+1 and sp.evaluate("(__app.S.mbxD||0)<=(__app.S.sentAt||0)")
    sp.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true})")
    # teacher: nothing pasted — reopening the panel brings the report in
    tp.click('[data-act="lock"]');tp.goto(URL+"t/");tp.wait_for_selector("#s-unlock:not([hidden])");tp.fill("#pu","Mailbox-Test-2026!");tp.click('[data-act="unlock"]')
    tp.wait_for_selector("#s-dash:not([hidden])",timeout=20000);tp.wait_for_timeout(3500);R["teacher_got_report_without_link"]="سارا مرادی" in tp.inner_text("#stList")
    R["auto_note_and_pull_button_shown"]=tp.is_visible("#impAuto") and not tp.is_visible("#impLink") and tp.is_visible('[data-act="pull"]')
    # teacher publishes a question, the league and a test; students get them by themselves
    tp.click('[data-act="tab"][data-v="qs"]');tp.click('[data-act="eg"][data-g="11"]');tp.fill("#eq","سؤال صندوق");tp.fill("#es","لَنْ نَكْتُبَ")
    for i,o in enumerate(["نخواهیم نوشت","ننوشتیم","نمی‌نویسیم","ننویسیم"]):tp.fill(f"#eo{i}",o)
    tp.check('input[name="ea"][value="0"]');tp.fill("#ee","لن + مضارع ← آیندهٔ منفی");tp.click('[data-act="saveQ"]');tp.click('[data-act="publish"]')
    tp.wait_for_selector("#pubOut .msg.ok",timeout=15000);R["teacher_publish_sent_to_all"]="برای همهٔ دانش‌آموزها" in tp.inner_text("#pubOut")
    tp.click('[data-act="tab"][data-v="lg"]');tp.click('[data-act="lgG"][data-g="11"]');R["teacher_sees_full_names"]="سارا مرادی" in tp.inner_text("#lgT")
    tp.click('[data-act="lgPub"]');tp.wait_for_selector("#lgOut .msg.ok",timeout=15000)
    tp.click('[data-act="tsG"][data-g="11"]');tp.check('#tsL input[value="5"]');tp.fill("#tsT","آزمون صندوق");tp.click('[data-act="tsPub"]');tp.wait_for_selector("#tsOut .msg.ok",timeout=15000)
    R["feed_kinds"]=[x["t"] for x in get("f")["items"]];R["grade_10_gets_none"]=get("f?g=10")["items"]==[]
    sp.goto(URL);sp.wait_for_selector("#intro",state="hidden",timeout=8000);sp.wait_for_timeout(5000)
    R["student_got_teacher_question"]=sp.evaluate("Engine.poolFor(11).filter(q=>q.c===90).length")==1
    R["student_got_test"]=sp.locator('#minis [data-act="set"]').count()==1
    sp.click('.dock [data-v="league"]');sp.wait_for_timeout(1200);R["student_sees_self_in_league"]=sp.locator(".lgr.me").count()==1
    lg=sp.inner_text("#v-league");R["published_league_shows_short_name"]="سارا م." in lg and "مرادی" not in lg
    got=fr[-1].json()["items"];R["feed_brought_3_packs"]=len(got)==3 and "since=0" in fr[-1].url and "g=11" in fr[-1].url
    sp.goto(URL);sp.wait_for_timeout(6000)
    R["next_open_asks_only_for_newer"]=fr[-1].json()["items"]==[] and "since=0" not in fr[-1].url
    R["sealed_report_size_chars"]=max(len(x["c"]) for x in get("r")["items"])
    R["errors"]=errs;b.close()
print(json.dumps(R,ensure_ascii=False,indent=1))
bad=[k for k,v in R.items() if v is False or (k=="errors" and v)]
print("FAILED: "+", ".join(bad) if bad else "all passed")
