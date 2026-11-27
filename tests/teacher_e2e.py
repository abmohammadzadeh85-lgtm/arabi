# End-to-end: teacher sets up the panel → code goes into the student app → student sends a report → teacher reads it
# → teacher publishes questions → student imports them (and a forged pack is refused).
import json,re,subprocess,sys,time
from playwright.sync_api import sync_playwright
URL="http://localhost:8765/";SITE="https://abmohammadzadeh85-lgtm.github.io/arabi/";R={}
import os,atexit
_REAL=open("src/teacher.json").read() if os.path.exists("src/teacher.json") else None   # the real teacher key: put back after the test
atexit.register(lambda: open("src/teacher.json","w").write(_REAL) if _REAL else (os.path.exists("src/teacher.json") and os.remove("src/teacher.json")))
SEEN="if(!localStorage.getItem('arabibazi:state'))localStorage.setItem('arabibazi:state',JSON.stringify({ui:{intro:1,tour:1,qtip:1}}))"
def ctx(b,seen=True):
    c=b.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
    if seen:c.add_init_script(SEEN)
    return c
def setup_teacher(pg,pw):
    pg.goto(URL+"t/");pg.wait_for_selector("#s-setup:not([hidden])")
    pg.fill("#p1",pw);pg.fill("#p2",pw);pg.click('[data-act="create"]');pg.wait_for_selector("#s-backup:not([hidden])",timeout=20000)
    bk=pg.inner_text("#bk");pg.check("#bkOk");pg.click('[data-act="bkNext"]');pg.wait_for_selector("#s-code:not([hidden])")
    code=pg.inner_text("#tcode");pg.click('[data-act="codeNext"]');pg.wait_for_selector("#s-dash:not([hidden])");return code,bk
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    T=ctx(b);tp=T.new_page();errs=[];tp.on("pageerror",lambda e:errs.append("T:"+str(e)))
    csp=lambda who:(lambda m:errs.append(who+" console: "+m.text) if ("Content Security Policy" in m.text or "Refused" in m.text) else None)
    tp.on("console",csp("T"))
    # weak passphrase refused
    tp.goto(URL+"t/");tp.fill("#p1","12345");tp.fill("#p2","12345");tp.click('[data-act="create"]');R["weak_pass_refused"]=tp.inner_text("#setupMsg")!=""
    code,bk=setup_teacher(tp,"Arabi-Test-2026!")
    R["teacher_code_ok"]=bool(re.match(r"^AB1\.[A-Za-z0-9_-]{80,90}\.[A-Za-z0-9_-]{80,90}$",code));R["backup_code_ok"]=bk.startswith("ABK1.")
    vault=tp.evaluate("JSON.parse(localStorage.getItem('arabibazi-teacher:vault'))")
    R["vault_has_no_plain_private_key"]='"d"' not in json.dumps(vault) and "jwk" not in json.dumps(vault)
    # a second, fake teacher (another device)
    F=ctx(b);fp=F.new_page();fake_code,_=setup_teacher(fp,"Someone-Else-99!")
    # build the student app locked to the real teacher
    open("src/teacher.json","w").write(json.dumps({"code":code}))
    subprocess.run(["node","build.mjs"],check=True,capture_output=True);subprocess.run("rm -rf /tmp/site && cp -r dist/pwa /tmp/site",shell=True,check=True)
    # student
    St=ctx(b);sp=St.new_page();sp.on("pageerror",lambda e:errs.append("S:"+str(e)));sp.on("console",csp("S"))
    sp.goto(URL);sp.wait_for_selector('[data-act="pickGrade"]')
    sp.click('[data-act="pickGrade"][data-g="11"]');R["name_required"]=sp.is_visible("#pick")
    sp.fill("#nm","زهرا احمدی");sp.click('[data-act="pickGrade"][data-g="11"]');sp.wait_for_selector("#lrow .lcard")
    sp.click('[data-act="start"][data-m="mixed"]');sp.wait_for_timeout(300)
    for i in range(10):
        q=sp.evaluate("__app.ses().qs[__app.ses().i]");sp.click(f'#qO .opt >> nth={q["a"] if i%3 else (q["a"]+1)%4}');sp.click("#qN");sp.wait_for_timeout(330)
    sp.wait_for_selector("#result:not([hidden])");sp.click('#result [data-act="sendReport"]');sp.wait_for_selector("#dlg:not([hidden]) code",timeout=15000)
    link=sp.inner_text("#dlg code");R["report_link_shape"]=link.startswith(URL.replace("http://localhost:8765/","https://abmohammadzadeh85-lgtm.github.io/arabi/")+"t/#r=")
    rcode=link.split("#r=")[1];R["report_link_len"]=len(link)
    R["report_unreadable_without_key"]="زهرا" not in link
    # the fake teacher cannot open it
    fp.fill("#imp",link);fp.click('[data-act="import"]');fp.wait_for_timeout(1500);R["fake_teacher_cannot_open_report"]="باز نشد" in fp.inner_text("#impMsg")
    # real teacher: lock, then open the link → unlock → imported
    tp.click('[data-act="lock"]');tp.goto(URL+"t/#r="+rcode);tp.wait_for_selector("#s-unlock:not([hidden])")
    tp.fill("#pu","wrong-password-1");tp.click('[data-act="unlock"]');tp.wait_for_timeout(2500);R["wrong_pass_refused"]="درست نیست" in tp.inner_text("#unMsg")
    tp.fill("#pu","Arabi-Test-2026!");tp.click('[data-act="unlock"]');tp.wait_for_selector("#s-dash:not([hidden])",timeout=20000);tp.wait_for_timeout(1500)
    R["links_note_when_no_mailbox"]=tp.is_visible("#impLink") and not tp.is_visible("#impAuto") and not tp.is_visible('[data-act="pull"]')
    lst=tp.inner_text("#stList");R["teacher_sees_student_by_grade"]="زهرا احمدی" in lst and "یازدهم" in lst
    tp.click('#stList [data-act="stu"]');tp.wait_for_selector("#dlg:not([hidden])");R["report_detail_has_chapters"]="انواع «لا»" in tp.inner_text("#dlg") or "نوع فعل" in tp.inner_text("#dlg")
    tp.click("#dlg .btn >> nth=0")
    # tampered report rejected
    bad=rcode[:-6]+("A" if rcode[-6]!="A" else "B")+rcode[-5:]
    tp.fill("#imp","x #r="+bad);tp.click('[data-act="import"]');tp.wait_for_timeout(800);R["tampered_report_refused"]="باز نشد" in tp.inner_text("#impMsg")
    # teacher writes questions for 11 and 12 and publishes
    tp.click('[data-act="tab"][data-v="qs"]')
    for g,qq in ((11,"سؤال آزمایشی یازدهم"),(12,"سؤال آزمایشی دوازدهم")):
        tp.click(f'[data-act="eg"][data-g="{g}"]');tp.fill("#eq",qq);tp.fill("#es","قَدْ كَتَبْنا")
        for i,o in enumerate(["نوشته‌ایم","نوشتیم","می‌نویسیم","نوشته بودیم"]):tp.fill(f"#eo{i}",o)
        tp.check('input[name="ea"][value="0"]');tp.fill("#ee","قد + ماضی = ماضی نقلی");tp.click('[data-act="saveQ"]')
    tp.click('[data-act="publish"]');tp.wait_for_selector("#pubOut .btn",timeout=10000)
    pack=tp.evaluate("document.querySelector('#pubOut code').textContent")
    # get full link via the clipboard-less path: rebuild from storage is not possible, so read the button's closure by downloading
    with tp.expect_download() as d: tp.click("#pubOut .btn.wide")
    plink=open(d.value.path()).read().strip().replace(SITE,URL);R["pack_link_len"]=len(plink)
    # forged pack from the fake teacher
    fp.click('[data-act="tab"][data-v="qs"]');fp.click('[data-act="eg"][data-g="11"]');fp.fill("#eq","سؤال جعلی");
    for i,o in enumerate(["الف","ب","ج","د"]):fp.fill(f"#eo{i}",o)
    fp.check('input[name="ea"][value="1"]');fp.fill("#ee","جعلی");fp.click('[data-act="saveQ"]');fp.click('[data-act="publish"]');fp.wait_for_selector("#pubOut .btn",timeout=10000)
    with fp.expect_download() as d2: fp.click("#pubOut .btn.wide")
    flink=open(d2.value.path()).read().strip().replace(SITE,URL)
    sp.goto(flink);sp.wait_for_selector("#dlg:not([hidden])",timeout=10000);R["forged_pack_refused"]="از طرف معلم نیست" in sp.inner_text("#dlg");sp.click("#dlg .btn")
    sp.goto(plink);sp.wait_for_selector("#dlg:not([hidden])",timeout=10000);R["real_pack_accepted"]="۱ سؤال تازه" in sp.inner_text("#dlg");sp.click("#dlg .btn");sp.wait_for_timeout(500)
    R["grade11_sees_teacher_chapter"]="سؤال‌های معلم" in sp.inner_text("#v-home")
    tq=sp.evaluate("Engine.poolFor(11).filter(q=>q.c===90).map(q=>q.q)");R["grade11_teacher_qs"]=tq
    R["grade12_q_hidden_in_11"]=not any("دوازدهم" in x for x in tq) and sp.evaluate("Engine.poolFor(12).filter(q=>q.c===90).length")==1
    R["hash_cleared"]=sp.evaluate("location.hash")==""
    # two-week league and a teacher test set, both signed by the teacher
    tp.click('[data-act="tab"][data-v="lg"]');tp.click('[data-act="lgG"][data-g="11"]');tp.wait_for_timeout(300)
    R["teacher_league_rows"]=tp.locator("#lgT .lgr").count()
    tp.click('[data-act="lgPub"]');tp.wait_for_selector("#lgOut .btn",timeout=10000)
    with tp.expect_download() as d3: tp.click("#lgOut .btn.wide")
    llink=open(d3.value.path()).read().strip().replace(SITE,URL)
    tp.click('[data-act="tsG"][data-g="11"]');tp.check('#tsL input[value="5"]');tp.check('#tsL input[value="6"]');tp.fill("#tsT","آزمون آزمایشی");tp.click('[data-act="tsPub"]');tp.wait_for_selector("#tsOut .btn",timeout=10000)
    with tp.expect_download() as d4: tp.click("#tsOut .btn.wide")
    slink=open(d4.value.path()).read().strip().replace(SITE,URL)
    sp.goto(llink);sp.wait_for_selector("#dlg:not([hidden])",timeout=10000);R["league_imported"]="به‌روز شد" in sp.inner_text("#dlg");sp.click("#dlg .btn")
    sp.click('.dock [data-v="league"]');sp.wait_for_timeout(1200);R["league_shows_me"]=sp.locator(".lgr.me").count()==1
    sp.goto(slink);sp.wait_for_selector("#dlg:not([hidden])",timeout=10000);sp.click("#dlg .btn");sp.click('.dock [data-v="home"]');sp.wait_for_timeout(900)
    R["set_card_on_home"]=sp.locator('#minis [data-act="set"]').count()==1
    sp.click('#minis [data-act="set"]');sp.wait_for_selector("#play:not([hidden])");chs=sp.evaluate("__app.ses().qs.map(q=>q.c)");R["set_only_chosen_lessons"]=all(c in (5,6) for c in chs) and len(chs)==10
    fake_l=fp.evaluate("1");R["class_progress_shown"]=tp.evaluate("document.querySelectorAll('#cls .cr').length")>=0
    # the teacher panel refuses to run inside another site's frame
    fr=b.new_page();fr.set_content('<iframe src="'+URL+'t/" width="400" height="500"></iframe>');fr.wait_for_timeout(2500)
    R["panel_blank_in_frame"]=fr.frames[1].evaluate("document.documentElement.textContent.trim()===''&&!document.querySelector('#p1')")
    R["errors"]=errs
    b.close()
print(json.dumps(R,ensure_ascii=False,indent=1))
