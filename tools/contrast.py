import json,sys,colorsys
def hx(c):c=c.lstrip('#');return [int(c[i:i+2],16)/255 for i in (0,2,4)]
def lum(c):
    r=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in hx(c)];return 0.2126*r[0]+0.7152*r[1]+0.0722*r[2]
def cr(a,b):la,lb=lum(a),lum(b);return (max(la,lb)+0.05)/(min(la,lb)+0.05)
T=json.load(open(sys.argv[1]))
for n,t in T.items():
    vals=dict(ink_bg=cr(t['ink'],t['bg']),ink_card=cr(t['ink'],t['card']),dim_bg=cr(t['dim'],t['bg']),dim_card=cr(t['dim'],t['card']),on_gold=cr(t['on'],t['gold']))
    for k in ('ok','bad'):
        if k in t: vals[k+'_card']=cr(t[k],t['card'])
    bad={k:round(v,2) for k,v in vals.items() if v<(3 if k in('ok_card','bad_card') else 4.5)}
    print(f"{n:12s}", "OK" if not bad else bad)
