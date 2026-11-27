// Grade-leak test: 1000 random sessions per grade in every practice mode; every question must belong to that grade
// (the grade's own bank plus the teacher's questions for that grade, never another grade's).
const fs=require("fs"),E=require("../src/app/engine.js");
const banks={};for(const g of [10,11,12])banks[g]=JSON.parse(fs.readFileSync(`dist/pwa/q${g}.json`,"utf8"));
// Hostile setup: the loader returns ALL grades mixed together for every grade, so only poolFor() stands between them.
const all=[].concat(banks[10],banks[11],banks[12]);E.setLoader(()=>all.slice());
// Teacher questions for all three grades sit in one shared list, as they do after importing a pack.
const extra=[];for(const g of [10,11,12])for(let k=0;k<30;k++)extra.push({id:`${g}-teacher-p${k%3}-${String(k).padStart(3,"0")}`,g,c:90,q:"سؤال معلم "+g+"\nمتن",o:["a","b","c","d"],a:k%4,e:"توضیح"});
E.setExtra(extra);
let total=0,leaks=0,tq=0,r=1;const rnd=()=>{r=(r*1103515245+12345)>>>0;return r/4294967296};
(async()=>{for(const g of [10,11,12]){await E.load(g);const chs=E.chapters(g).map(c=>c.c),foreign=all.concat(extra).filter(q=>q.g!==g).map(q=>q.id);
 for(let i=0;i<1000;i++){const seed=Math.floor(rnd()*4e9),m=["chapter","mixed","review"][i%3];
  // review list deliberately polluted with ids of other grades
  const ids=m==="review"?banks[g].concat(extra.filter(q=>q.g===g)).filter(()=>rnd()<.05).map(q=>q.id).concat(foreign.filter(()=>rnd()<.05)):null;
  const s=E.session(g,m,m==="chapter"?chs[i%chs.length]:ids,{},seed,10);
  for(const q of s){total++;if(q.c===90)tq++;if(q.g!==g||!q.id.startsWith(g+"-"))leaks++}}
 console.log(`پایهٔ ${g}: ۱۰۰۰ جلسه (فصل، ترکیبی، مرور) — فصل‌ها: ${chs.join(",")}`)}
 console.log(`سؤال‌های بررسی‌شده: ${total} (از جمله ${tq} سؤال معلم) · نشت: ${leaks}`);process.exit(leaks?1:0)})();
