// Grade 10 — ثلاثی مزید (from the «باب‌های مزید» game data).
import {D,F,RT,SPX,VZ} from "./ar10data.mjs";
import {rng,pick,shuffle,stamp} from "./common.mjs";
export const CHAPTERS10={1:"شناخت باب فعل",2:"الگوی ماضی، مضارع، امر و مصدر",3:"فعل غریبه"};
const SRC="عربی (۱) دهم · درس ۳ و ۴ (ثلاثی مجرد و مزید)";
const L=["ماضی","مضارع","امر","مصدر"],R8=[0,1,2,3,4,5,6,7];
const vz=(p,b)=>SPX[p]||VZ[b](...RT[p])[0];
export function gen10(){const r=rng(1010),V=D.map((d,i)=>d[1].split("|").map(p=>({v:vz(p,i),b:i}))),items=[];
 // c1: verb → باب
 for(const w of V.flat()){const ids=shuffle(r,shuffle(r,R8.filter(x=>x!==w.b)).slice(0,3).concat(w.b));
  items.push({c:1,q:`این فعل از کدام باب است؟\n${w.v}`,o:ids.map(i=>`${D[i][0]} (${F[i][0]})`),a:ids.indexOf(w.b),e:`${w.v} بر وزن ${F[w.b][0]} است ← باب ${D[w.b][0]}. الگوها: ${F[w.b].join(" · ")}`})}
 // c2: باب + form → pattern
 for(const b of R8)for(let f=0;f<4;f++){const o=shuffle(r,shuffle(r,R8.filter(x=>x!==b)).slice(0,3).concat(b));
  items.push({c:2,q:`الگوی «${L[f]}» این باب کدام است؟${f?` (ماضی: ${F[b][0]})`:""}\nباب ${D[b][0]}`,o:o.map(x=>F[x][f]),a:o.indexOf(b),e:`باب ${D[b][0]}: ${F[b].join(" · ")}`})}
 // c3: odd one out (3 verbs from one باب + 1 from another)
 for(let k=0;k<96;k++){const x=R8[k%8],y=pick(r,R8.filter(z=>z!==x)),t=shuffle(r,V[x]).slice(0,3),d=pick(r,V[y]),o=shuffle(r,t.concat(d));
  items.push({c:3,q:"سه فعل از یک بابند؛ کدام غریبه است؟",o:o.map(w=>w.v),a:o.indexOf(d),e:`${d.v} از باب ${D[y][0]} است؛ بقیه (${t.map(w=>w.v).join("، ")}) از باب ${D[x][0]}.`})}
 return stamp(10,"arabic",items,{1:SRC,2:SRC,3:SRC})}
