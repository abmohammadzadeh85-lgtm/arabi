# Renders every sound with the app's own code (OfflineAudioContext in Chrome) and measures it.
import json,sys,numpy as np
from playwright.sync_api import sync_playwright
URL=sys.argv[1] if len(sys.argv)>1 else "http://localhost:8765/"
EV=[("correct",0),("correct",1),("correct",2),("wrong",0),("streak",0),("end",0),("tap",0)]
RANGE={"correct":(.2,.28),"wrong":(.15,.22),"streak":(.4,.5),"end":(.7,.9),"tap":(.04,.07)}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"]);pg=b.new_page();pg.goto(URL);pg.wait_for_timeout(500)
    data=pg.evaluate("""async(EV)=>{const out={};for(const pk of ['soft','glass','simple'])for(const [e,v] of EV){const s=await SFX.render(pk,e,100,v);out[pk+'|'+e+'|'+v]=Array.from(s)}return out}""",EV)
    b.close()
sr=48000;rows=[];allok=True
for k,arr in data.items():
    pk,e,v=k.split('|');x=np.array(arr,dtype=np.float64);pk_=np.max(np.abs(x))
    thr=pk_*10**(-60/20);idx=np.where(np.abs(x)>thr)[0];dur=(idx[-1]+1)/sr if len(idx) else 0
    head=np.max(np.abs(x[:int(.005*sr)]));tail=np.max(np.abs(x[-int(.005*sr):]))
    dc=abs(np.mean(x));act=x[:max(1,int(dur*sr))];rms=np.sqrt(np.mean(act**2))
    X=np.abs(np.fft.rfft(act*np.hanning(len(act))))**2;f=np.fft.rfftfreq(len(act),1/sr)
    cent=np.sum(f*X)/np.sum(X);hi=np.sum(X[f>6000])/np.sum(X);dom=f[np.argmax(X)]
    lo,hi_=RANGE[e]
    checks={"peak":.3<=pk_<=.6,"clip":np.max(np.abs(x))<1,"edges":head<.001 and tail<.001,"dc":dc<.001,"len":lo<=dur<=hi_+.005,"cent":cent<3000,"hf":hi<.05}
    rows.append(dict(pack=pk,ev=e+("" if e!="correct" else f"#{int(v)+1}"),peak=round(pk_,3),dur=round(dur,3),head=float(head),tail=float(tail),dc=float(dc),rms_db=round(20*np.log10(rms),2),cent=round(cent),hf=round(hi*100,2),dom=round(dom),**{"ok_"+k2:bool(v2) for k2,v2 in checks.items()}))
json.dump(rows,open('/tmp/sound.json','w'),indent=1)
for pk in ['soft','glass','simple']:
    R=[r for r in rows if r['pack']==pk]
    print(f"\n== {pk}")
    for r in R:
        bad=[k[3:] for k in r if k.startswith('ok_') and not r[k]]
        print(f"{r['ev']:10s} peak {r['peak']:.2f}  len {r['dur']*1000:4.0f}ms  rms {r['rms_db']:6.1f}dB  centroid {r['cent']:5d}Hz  >6k {r['hf']:4.1f}%  dom {r['dom']:5d}Hz  edges {r['head']:.4f}/{r['tail']:.4f}  dc {r['dc']:.5f}  {'OK' if not bad else 'FAIL '+str(bad)}")
    c=[r['rms_db'] for r in R if r['ev'].startswith('correct')]+[r['rms_db'] for r in R if r['ev'] in('wrong','streak')]
    print("RMS spread correct/wrong/streak:",round(max(c)-min(c),2),"dB (≤3)")
    dc_=min(r['dom'] for r in R if r['ev'].startswith('correct'));dw=[r['dom'] for r in R if r['ev']=='wrong'][0]
    print("dominant correct > wrong:",dc_,">",dw,dc_>dw)
