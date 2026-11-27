# Draws the Android launcher icons (legacy square/round + adaptive foreground) from src/mascot.svg.txt.
# Output goes to android/ci/res/mipmap-*/ ; the CI copies that folder over the Capacitor template.
import math,os,re
from playwright.sync_api import sync_playwright
from PIL import Image
LOGO=open("src/mascot.svg.txt").read().strip()
inner=re.sub(r'^<svg[^>]*>|</svg>$','',LOGO)
def svg(size,shape,logo_box):
    bg={"none":"",
        "round":f'<circle cx="{size/2}" cy="{size/2}" r="{size*0.46}" fill="url(#g)"/>',
        "square":f'<rect x="{size*0.06}" y="{size*0.06}" width="{size*0.88}" height="{size*0.88}" rx="{size*0.2}" fill="url(#g)"/>'}[shape]
    b=logo_box*size;o=(size-b)/2
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
            '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A5C"/><stop offset="1" stop-color="#FF4F9A"/></linearGradient></defs>'
            f'{bg}<svg x="{o}" y="{o}" width="{b}" height="{b}" viewBox="6 6 54 54">{inner}</svg></svg>')
DENS={"mdpi":1,"hdpi":1.5,"xhdpi":2,"xxhdpi":3,"xxxhdpi":4}
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"]);pg=br.new_page()
    def render(markup,size,path):
        pg.set_viewport_size({"width":size,"height":size});pg.set_content(f'<html><body style="margin:0;background:transparent">{markup}</body></html>')
        pg.locator("svg").first.screenshot(path=path,omit_background=True)
    # measure the logo: farthest opaque pixel from the centre when the logo box fills the canvas
    render(svg(1000,"none",1.0),1000,"/tmp/probe.png");im=Image.open("/tmp/probe.png").convert("RGBA");a=im.split()[3].load()
    far=max(math.hypot(x-500,y-500) for y in range(0,1000,2) for x in range(0,1000,2) if a[x,y]>8)/1000
    fg_box=0.296/far          # whole logo inside the 64 dp circle of the 108 dp adaptive canvas
    print("logo reach",round(far,3),"→ foreground box",round(fg_box,3))
    for d,k in DENS.items():
        os.makedirs(f"android/ci/res/mipmap-{d}",exist_ok=True)
        render(svg(round(108*k),"none",fg_box),round(108*k),f"android/ci/res/mipmap-{d}/ic_launcher_foreground.png")
        render(svg(round(48*k),"square",0.62),round(48*k),f"android/ci/res/mipmap-{d}/ic_launcher.png")
        render(svg(round(48*k),"round",0.6),round(48*k),f"android/ci/res/mipmap-{d}/ic_launcher_round.png")
    br.close()
# preview: foreground on the gradient with a circle and a squircle mask, plus the legacy icons
from PIL import ImageDraw
fg=Image.open("android/ci/res/mipmap-xxxhdpi/ic_launcher_foreground.png").convert("RGBA")
grad=Image.new("RGBA",fg.size);gp=grad.load();W=fg.size[0]
for y in range(W):
    for x in range(W):
        t=(x+y)/(2*W-2);gp[x,y]=(255,int(138+(79-138)*t),int(92+(154-92)*t),255)
sheet=Image.new("RGBA",(W*4+50,W+20),(40,40,48,255))
for i,mask in enumerate(("circle","squircle")):
    m=Image.new("L",fg.size,0);dr=ImageDraw.Draw(m);r=W*72/108/2;c=W/2
    (dr.ellipse if mask=="circle" else (lambda b,**k:dr.rounded_rectangle(b,radius=r*0.6,**k)))((c-r,c-r,c+r,c+r),fill=255)
    comp=Image.alpha_composite(grad,fg);out=Image.new("RGBA",fg.size,(0,0,0,0));out.paste(comp,(0,0),m);sheet.alpha_composite(out,(10+i*(W+10),10))
for i,f in enumerate(("ic_launcher","ic_launcher_round")):
    sheet.alpha_composite(Image.open(f"android/ci/res/mipmap-xxxhdpi/{f}.png").convert("RGBA").resize((W,W)),(10+(i+2)*(W+10),10))
sheet.save("/tmp/android_icons_preview.png");print("ok")
