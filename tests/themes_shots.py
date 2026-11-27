import json
from playwright.sync_api import sync_playwright
from PIL import Image
T=list(json.load(open('src/themes.json')).keys());shots=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=1,is_mobile=True,has_touch=True,reduced_motion="reduce");c.add_init_script("if(!localStorage.getItem('arabibazi:state'))localStorage.setItem('arabibazi:state',JSON.stringify({name:'تست',ui:{intro:1,tour:1,qtip:1}}))");pg=c.new_page()
    pg.goto("http://localhost:8765/");pg.click('[data-act="pickGrade"][data-g="12"]');pg.wait_for_timeout(700)
    for th in T:
        pg.evaluate(f"document.documentElement.dataset.theme='{th}';document.documentElement.dataset.light=APP.themes['{th}'][4]?'1':'0'")
        pg.evaluate("__app.start('chapter',1)");pg.wait_for_timeout(250)
        q=pg.evaluate("__app.ses().qs[0]");pg.click(f'#qO .opt >> nth={(q["a"]+1)%4}');pg.wait_for_timeout(150)
        pg.screenshot(path=f"/tmp/th_{th}.png");shots.append(th)
        pg.evaluate("__app.ses()&&0");pg.evaluate("document.querySelector('[data-act=quit]').click()");pg.wait_for_timeout(100);pg.evaluate("document.querySelector('#dlg .btn').click()");pg.wait_for_timeout(150)
    # one home screen per theme family too
    b.close()
cols=6;w,h=390,844;s=0.5
sheet=Image.new('RGB',(int(cols*w*s)+(cols+1)*8,int(3*h*s)+4*8),'#888')
for i,th in enumerate(shots):
    im=Image.open(f"/tmp/th_{th}.png").resize((int(w*s),int(h*s)))
    sheet.paste(im,(8+(i%cols)*(int(w*s)+8),8+(i//cols)*(int(h*s)+8)))
sheet.save('reports/themes.png');print(len(shots),"themes")
