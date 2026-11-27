// Grade 10 — عربی ۱، درس‌به‌درس. Lessons 3–4 (ثلاثی مزید) come from the «باب‌های مزید» game data; the rest from lessons.mjs.
import {D,F,RT,SPX,VZ} from "./ar10data.mjs";
import {rng,pick,shuffle,stamp} from "./common.mjs";
import {CHAPTERS,SRC,vocab,g10L1,g10L2,g10L5,g10L6,g10L7,g10L8} from "./lessons.mjs";
export const CHAPTERS10=CHAPTERS(10);
const L=["ماضی","مضارع","امر","مصدر"],GRP={3:[0,1,2,3],4:[4,5,6,7]},LS=b=>b<4?3:4;   // book: lesson 3 = استفعال، افتعال، انفعال، تفعّل · lesson 4 = افعال، تفعیل، مفاعله، تفاعل
const vz=(p,b)=>SPX[p]||VZ[b](...RT[p])[0];
export function gen10(){const r=rng(1010),V=D.map((d,i)=>d[1].split("|").map(p=>({v:vz(p,i),b:i}))),items=[];
 for(const w of V.flat()){const c=LS(w.b),ids=shuffle(r,GRP[c]);
  items.push({c,q:`این فعل از کدام باب است؟\n${w.v}`,o:ids.map(i=>`${D[i][0]} (${F[i][0]})`),a:ids.indexOf(w.b),e:`${w.v} بر وزن ${F[w.b][0]} است ← باب ${D[w.b][0]}. الگوها: ${F[w.b].join(" · ")}`,src:SRC(10,c)})}
 for(const c of [3,4])for(const b of GRP[c])for(let f=0;f<4;f++){const o=shuffle(r,GRP[c]);
  items.push({c,q:`الگوی «${L[f]}» این باب کدام است؟${f?` (ماضی: ${F[b][0]})`:""}\nباب ${D[b][0]}`,o:o.map(x=>F[x][f]),a:o.indexOf(b),e:`باب ${D[b][0]}: ${F[b].join(" · ")}`,src:SRC(10,c)})}
 for(let k=0;k<96;k++){const c=k%2?4:3,x=GRP[c][Math.floor(k/2)%4],y=pick(r,GRP[c].filter(z=>z!==x)),t=shuffle(r,V[x]).slice(0,3),d=pick(r,V[y]),o=shuffle(r,t.concat(d));
  items.push({c,q:"سه فعل از یک بابند؛ کدام غریبه است؟",o:o.map(w=>w.v),a:o.indexOf(d),e:`${d.v} از باب ${D[y][0]} است؛ بقیه (${t.map(w=>w.v).join("، ")}) از باب ${D[x][0]}.`,src:SRC(10,c)})}
 const r2=rng(1020);items.push(...g10L1(r2),...g10L2(r2),...g10L5(r2),...g10L6(r2),...g10L7(r2),...g10L8(r2),...vocab(10,r2));
 return stamp(10,"dars",items.sort((a,b)=>a.c-b.c),{})}
