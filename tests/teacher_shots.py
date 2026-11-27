# Screenshots of the teacher panel with three students (one paste with several report links at once).
import json,subprocess,os,atexit
from playwright.sync_api import sync_playwright
URL="http://localhost:8765/";SITE="https://abmohammadzadeh85-lgtm.github.io/arabi/"
atexit.register(lambda: os.path.exists("src/teacher.json") and os.remove("src/teacher.json"))
SEEN=lambda n:"if(!localStorage.getItem('arabibazi:state'))localStorage.setItem('arabibazi:state',JSON.stringify({name:%s,ui:{intro:1,tour:1,qtip:1}}))"%json.dumps(n)
def ctx(b,init=None):
    c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True)
    if init:c.add_init_script(init)
    return c
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    T=ctx(b);tp=T.new_page();tp.goto(URL+"t/");tp.wait_for_selector("#s-setup:not([hidden])");tp.screenshot(path="/tmp/t1_setup.png")
    tp.fill("#p1","Arabi-Test-2026!");tp.fill("#p2","Arabi-Test-2026!");tp.click('[data-act="create"]');tp.wait_for_selector("#s-backup:not([hidden])",timeout=20000);tp.screenshot(path="/tmp/t2_backup.png")
    tp.check("#bkOk");tp.click('[data-act="bkNext"]');tp.wait_for_selector("#s-code:not([hidden])");tp.screenshot(path="/tmp/t3_code.png");code=tp.inner_text("#tcode")
    tp.click('[data-act="codeNext"]');tp.wait_for_selector("#s-dash:not([hidden])")
    open("src/teacher.json","w").write(json.dumps({"code":code}));subprocess.run(["node","build.mjs"],check=True,capture_output=True);subprocess.run("rm -rf /tmp/site && cp -r dist/pwa /tmp/site",shell=True,check=True)
    links=[]
    for name,g,good in (("زهرا احمدی",11,.8),("علی رضایی",11,.5),("مریم کریمی",12,.9),("حسین مرادی",10,.6)):
        S=ctx(b,SEEN(name));sp=S.new_page();sp.goto(URL);sp.click(f'[data-act="pickGrade"][data-g="{g}"]');sp.wait_for_selector("#lrow .lcard")
        for rnd in range(3):
            sp.click('[data-act="start"][data-m="mixed"]');sp.wait_for_timeout(200)
            for i in range(10):
                q=sp.evaluate("__app.ses().qs[__app.ses().i]");ok=((i*7+rnd*3)%10)/10<good
                sp.click(f'#qO .opt >> nth={q["a"] if ok else (q["a"]+1)%4}');sp.click("#qN");sp.wait_for_timeout(330)
            sp.wait_for_selector("#result:not([hidden])")
            if rnd<2:sp.click('#result [data-act="home"]');sp.wait_for_selector("#lrow .lcard")
        if name=="زهرا احمدی":sp.screenshot(path="/tmp/s1_result.png")
        sp.click('#result [data-act="sendReport"]');sp.wait_for_selector("#dlg:not([hidden]) code",timeout=15000)
        if name=="زهرا احمدی":sp.screenshot(path="/tmp/s2_link.png")
        links.append(sp.inner_text("#dlg code"));S.close()
    tp.fill("#imp","\n".join("گزارش "+str(i)+": "+l for i,l in enumerate(links)));tp.click('[data-act="import"]');tp.wait_for_timeout(2500)
    R={"import_msg":tp.inner_text("#impMsg"),"students":tp.locator('#stList [data-act="stu"]').count()}
    tp.screenshot(path="/tmp/t4_dash.png",full_page=True)
    tp.click('[data-act="gf"][data-g="11"]');tp.wait_for_timeout(300);R["only11"]=tp.locator('#stList [data-act="stu"]').count()
    tp.click('[data-act="gf"][data-g="0"]');tp.wait_for_timeout(300)
    tp.click('#stList [data-act="stu"] >> nth=0');tp.wait_for_selector("#dlg:not([hidden])");tp.wait_for_timeout(300);tp.screenshot(path="/tmp/t5_student.png");tp.click("#dlg .btn >> nth=0")
    tp.click('[data-act="tab"][data-v="qs"]');tp.click('[data-act="eg"][data-g="12"]');tp.fill("#eq","حرف مشبهه را پیدا کن.");tp.fill("#es","لَيْتَ الشَّبابَ يَعودُ")
    for i,o in enumerate(["لَيْتَ","الشَّبابَ","يَعودُ","هیچ‌کدام"]):tp.fill(f"#eo{i}",o)
    tp.check('input[name="ea"][value="0"]');tp.fill("#ee","«لیت» از حروف مشبهة بالفعل است.");tp.screenshot(path="/tmp/t6_editor.png")
    tp.click('[data-act="saveQ"]');tp.wait_for_timeout(300);tp.click('[data-act="publish"]');tp.wait_for_selector("#pubOut .btn",timeout=10000);tp.wait_for_timeout(300);tp.screenshot(path="/tmp/t7_publish.png",full_page=True)
    print(json.dumps(R,ensure_ascii=False))
    b.close()
