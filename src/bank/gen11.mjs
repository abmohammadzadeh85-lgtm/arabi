// Grade 11 — انواع فعل، ترجمه، انواع «لا» (بدون لای نفی جنس که مفهوم دوازدهم است)، فعل مناسب.
import {VB,AR,ARP,FAP,TY,CF,ALL,AL,al,SN,PR,CL,VOC,CP,JAV} from "./ar11core.mjs";
import {rng,pick,shuffle,stamp} from "./common.mjs";
import {CHAPTERS,SRC as LSRC,vocab,g11L1,g11L2,g11L3,g11L4,g11L5,g11L6,g11L7} from "./lessons.mjs";
export const CHAPTERS11=CHAPTERS(11);
// book lessons: 5 = أَنْ/كَيْ/حَتّیٰ/لِـ/لَنْ + مضارع · 6 = لَمْ، لام امر، لای نهی (+ انواع «لا») · 8 = مرور انواع فعل (جزوهٔ کلاس)
const LT=t=>t==="lan"?5:(t==="negPast"||t==="nahy"||t==="amr")?6:8;
const SRC={5:LSRC(11,5),6:LSRC(11,6),8:LSRC(11,8)};
const fa=n=>String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
const T1=["past","pres","naqli","baid","qadPres","fut","lan","negPast","negPres","pastP","presP"],T2=Object.keys(TY);
function pickD(ck,lists,n=3){const out=[],seen=new Set([ck]);for(const[l,q]of lists){let k=0;for(const[x,key]of l){if(out.length>=n||k>=q)break;if(seen.has(key)||seen.has(x))continue;seen.add(key);seen.add(x);out.push(x);k++}}return out}
export const LT11={jav:["لای جواب","در پاسخ سؤال ← «نه»"],nafy:["لای نفی","لا + مضارع ← «نمی…»"],nahy:["لای نهی","لا + مخاطب ← «نـ…»"],amr:["لای امر غایب/متکلم","لا + غایب/متکلم ← «نباید»"]};
export function gen11(){const r=rng(1111),items=[],pv=t=>pick(r,t==="pastP"||t==="presP"?VB.filter(v=>v.pv):VB);
 // c1
 for(let k=0;k<154;k++){const t=T1[k%T1.length],v=pv(t),s=pick(r,al(t)),ar=ARP(v,t,s,r()<.5),tr=FAP(v,t,s);
  const ds=shuffle(r,CF[t].filter(x=>T1.includes(x))).slice(0,2);for(const x of shuffle(r,T1))if(ds.length<3&&x!==t&&!ds.includes(x))ds.push(x);const ids=shuffle(r,[t,...ds]);
  items.push({c:LT(t),q:`این فعل از چه نوعی است؟\n${ar}`,o:ids.map(x=>`${TY[x][0]} · ${TY[x][1]}`),a:ids.indexOf(t),e:`${ar} ← ${TY[t][0]} (${TY[t][1]}) · ترجمه: «${tr}»`})}
 // c2
 for(let k=0;k<169;k++){const t=T2[k%T2.length],v=pv(t),s=pick(r,al(t)),alt=r()<.5,ar=ARP(v,t,s,alt),c=FAP(v,t,s);
  const ok=x=>al(x).includes(s)&&(!(x==="pastP"||x==="presP")||v.pv);
  const L1=shuffle(r,CF[t].filter(ok)).map(x=>[FAP(v,x,s),x]),L2=shuffle(r,al(t).filter(p=>p!==s&&ARP(v,t,p,alt)!==ar)).map(p=>[FAP(v,t,p),"p"+p]),L3=shuffle(r,T2.filter(x=>x!==t&&ok(x))).map(x=>[FAP(v,x,s),x]);
  const ops=shuffle(r,[c,...pickD(c,[[L1,2],[L2,1],[L3,3]])]);
  items.push({c:LT(t),q:`ترجمهٔ درست کدام است؟\n${ar}`,o:ops,a:ops.indexOf(c),e:`${TY[t][0]} (${TY[t][1]}) ← «${c}»`})}
 // c3 (4 kinds; fixed option order)
 const LK=Object.keys(LT11),opts=LK.map(x=>`${LT11[x][0]} · ${LT11[x][1]}`),push3=(k,st,tr,ex)=>items.push({c:6,q:`این «لا» از کدام نوع است؟\n${st}`,o:opts,a:LK.indexOf(k),e:`${LT11[k][0]}: ${ex} · «${tr}»`});
 for(const x of JAV)push3("jav",x[0].replace("@","⟪لا⟫"),x[1],"«لا» در جواب سؤال آمده و معنی «نه» می‌دهد");
 for(let k=0;k<36;k++){let v=pick(r,VB),s=pick(r,ALL.filter(p=>p!==5&&p!==11)),cl=s>=6&&s<=10&&r()<.5?pick(r,VOC(s)).replace(" @",""):r()<.5?PR[s]:"";
  push3("nafy",(cl?cl+" ":"")+"⟪لا⟫ "+AR(v,"ind",s),FAP(v,"negPres",s),"آخر فعل تغییر نکرده ← مضارع منفی");
  v=pick(r,VB);s=pick(r,AL.nahy);push3("nahy",pick(r,VOC(s)).replace(" @","")+" ⟪لا⟫ "+AR(v,"jus",s),FAP(v,"nahy",s),"فعل مخاطب است و آخرش ساکن شده یا نونش حذف شده ← امر منفی");
  v=pick(r,VB);s=pick(r,AL.amr);push3("amr","⟪لا⟫ "+AR(v,"jus",s),FAP(v,"amr",s),`فعل ${s>11?"متکلم":"غایب"} است و آخرش ساکن شده یا نونش حذف شده ← «نباید»`)}
 // c4
 const TN=["past","pres","fut"],TL=["ماضی","مضارع","مستقبل"],TW=[["أَمْسِ"],["الْيَوْمَ","الْآنَ"],["غَداً"]];
 for(let k=0;k<154;k++){const s=k%14,v=pick(r,VB),tn=Math.floor(r()*3),alt=r()<.5,F=(t,p)=>ARP(v,TN[t],p,alt),c=F(tn,s),tw=pick(r,TW[tn]),cl=pick(r,CL[s]);
  const ot=shuffle(r,[0,1,2].filter(x=>x!==tn)),cp=shuffle(r,CP[s]),m=x=>[x,x];
  const ds=pickD(c,[[[m(F(ot[0],s))],1],[cp.map(p=>m(F(tn,p))),1],[cp.map(p=>m(F(ot[1],p))),1],[[m(F(ot[1],s))],1],[shuffle(r,ALL.flatMap(p=>[0,1,2].map(t=>m(F(t,p))))),3]]);
  const ops=shuffle(r,[c,...ds]),hint=cl.replace(/،? ?@ ?/,"").trim();
  items.push({c:8,q:`فعل مناسب جای خالی کدام است؟\n${cl.replace("@","＿＿＿")} ${tw}.`,o:ops,a:ops.indexOf(c),e:`«${hint}» ← صیغهٔ ${fa(s+1)} (${SN[s]}) · «${tw}» ← ${TL[tn]} · ${c} = «${FAP(v,TN[tn],s)}»`})}
 const r2=rng(1120);items.push(...g11L1(r2),...g11L2(r2),...g11L3(r2),...g11L4(r2),...g11L5(r2),...g11L6(r2),...g11L7(r2),...vocab(11,r2));
 return stamp(11,"dars",items.sort((a,b)=>a.c-b.c),SRC)}
