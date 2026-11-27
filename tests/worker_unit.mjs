// The mailbox Worker against an in-memory KV (no Cloudflare account needed):  node tests/worker_unit.mjs
import fs from "node:fs";import vm from "node:vm";
globalThis.self=globalThis;vm.runInThisContext(fs.readFileSync(new URL("../src/app/crypto.js",import.meta.url),"utf8")+";globalThis.AB=AB;");
const W=(await import("../server/worker.js")).default,S=crypto.subtle;
class KV{constructor(lim){this.m=new Map();this.lim=lim;this.hide=new Set();this.n={get:0,put:0,list:0,del:0}}
 async get(k,t){this.n.get++;const v=this.m.get(k);if(!v||this.hide.has(k))return null;return t==="json"?JSON.parse(v.v):v.v}
 async put(k,v,o){this.n.put++;this.m.set(k,{v:String(v),md:o&&o.metadata})}
 async delete(k){this.n.del++;this.m.delete(k)}
 async list({prefix="",cursor}={}){this.n.list++;const ks=[...this.m.keys()].filter(k=>k.startsWith(prefix)).sort(),st=cursor?+cursor:0,sl=ks.slice(st,st+this.lim);
  return{keys:sl.map(n=>({name:n,metadata:this.m.get(n).md})),list_complete:st+this.lim>=ks.length,cursor:String(st+this.lim)}}}
const gen=()=>S.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
const T=await gen(),X=await gen(),pub=AB.b64u(new Uint8Array(await S.exportKey("raw",T.publicKey)));
const kv=new KV(3),env={KV:kv,TEACHER_SIG:pub,FEED_PAGE:"2",REP_PAGE:"2"};
const call=(m,path,b,raw)=>W.fetch(new Request("https://mbx.test"+path,{method:m,headers:{"content-type":"text/plain;charset=UTF-8"},body:raw!=null?raw:b?JSON.stringify(b):undefined}),env)
 .then(async r=>({s:r.status,h:r.headers,j:await r.json().catch(()=>null)}));
let bad=0;const ok=(c,m)=>{console.log((c?"✓ ":"✗ ")+m);if(!c)bad++};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rep=n=>"R"+String(n).repeat(130).slice(0,130);            // stands in for a sealed report (the server cannot read it anyway)
const sign=(o,k=T)=>AB.sign(o,k.privateKey);

ok((await call("GET","/ping")).j.ok===true,"ping");
const o=await W.fetch(new Request("https://mbx.test/r",{method:"OPTIONS"}),env);ok(o.status===200&&o.headers.get("access-control-allow-origin")==="*","CORS for any page");
// ---- reports
ok((await call("POST","/r",{s:"short",c:rep(1)})).s===400,"report: secret too short → refused");
ok((await call("POST","/r",{s:"A".repeat(24),c:"bad code!"+rep(1)})).s===400,"report: not a code → refused");
ok((await call("POST","/r",null,"{not json")).s===400,"report: broken JSON → refused (400, not a server error)");
ok((await call("POST","/r",{s:"A".repeat(24),c:"x".repeat(25000)})).s===400,"report: too long → refused");
for(const [s,c] of [["A",1],["B",2],["A",3],["C",4],["D",5]]){ok((await call("POST","/r",{s:s.repeat(24),c:rep(c)})).s===200,"report from phone "+s);await sleep(3)}
ok([...kv.m.keys()].filter(k=>k.startsWith("r:")).length===4,"one place per phone: the newest report replaces the old one (4 phones)");
let since=0,seen=[],pages=0;for(;;){const r=(await call("GET","/r?since="+since)).j;pages++;r.items.forEach(x=>{seen.push(x.c);since=Math.max(since,x.at)});if(!r.more||!r.items.length)break}
ok(seen.join()==[rep(2),rep(3),rep(4),rep(5)].join()&&pages===2,"teacher reads them oldest first, 2 per page (pages: "+pages+")");
ok((await call("GET","/r?since="+since)).j.items.length===0,"nothing newer than the last one");
// a report that is listed but not readable here yet: the page stops before it, so it is not skipped
await call("POST","/r",{s:"E".repeat(24),c:rep(6)});await sleep(3);await call("POST","/r",{s:"F".repeat(24),c:rep(7)});
const kE=[...kv.m.keys()].find(k=>kv.m.get(k).v===rep(6));kv.hide.add(kE);
let r1=(await call("GET","/r?since="+since)).j;ok(r1.items.length===0&&r1.more===true,"a just-written report not readable yet → page stops (more=true, nothing skipped)");
kv.hide.delete(kE);r1=(await call("GET","/r?since="+since)).j;ok(r1.items.map(x=>x.c).join()==[rep(6),rep(7)].join(),"…and arrives on the next try");
kv.hide.add(kE);kv.m.get(kE).md.at-=10*60e3;r1=(await call("GET","/r?since=0")).j;ok(!r1.items.some(x=>x.c===rep(6)),"an old unreadable one is skipped instead of blocking the rest");kv.hide.delete(kE);
// ---- feed
const P1=await sign({v:1,t:"p",id:"pk1",at:1,qs:[{g:10,q:"a"},{g:11,q:"b"}]});
ok((await call("POST","/f",{c:await sign({v:1,t:"p",id:"pk0",qs:[{g:10}]},X)})).s===400,"feed: pack signed by someone else → refused");
ok((await call("POST","/f",{c:"AAAA"+P1.slice(4)})).s===400,"feed: changed pack → refused");
ok((await call("POST","/f",{c:"@@"})).s===400,"feed: garbage → refused");
ok((await call("POST","/f",{c:await sign({v:1,t:"z",id:"zz1"})})).s===400,"feed: unknown kind → refused");
ok((await call("POST","/f",{c:await sign({v:1,t:"s",id:"s00",g:9})})).s===400,"feed: unknown grade → refused");
ok((await call("POST","/f",{c:P1})).s===200,"feed: teacher's questions (grades 10 and 11) accepted");
const big={v:1,t:"p",id:"pk2",qs:Array.from({length:400},(_,i)=>({g:12,q:"سؤال شمارهٔ "+i,o:["الف","ب","ج","د"],a:i%4,e:"توضیح"}))};
const P2=await sign(big);ok(AB.ub64(P2)[64]===2,"a big pack travels compressed");ok((await call("POST","/f",{c:P2})).s===200,"feed: compressed pack accepted");
const ix=await kv.get("fi","json");ok(JSON.stringify(ix.map(x=>[x.id,x.gs]))==='[["pk1",[10,11]],["pk2",[12]]]',"index knows the grades of each pack");
const feed=async(g,s0=0)=>{let s=s0,out=[],n=0;for(;;){const r=(await call("GET","/f?g="+g+"&since="+s)).j;n++;r.items.forEach(x=>{out.push(x);s=Math.max(s,x.at)});if(!r.more||!r.items.length)break}return{out,s,n}};
ok((await feed(12)).out.map(x=>x.id).join()==="pk2"&&(await feed(11)).out.map(x=>x.id).join()==="pk1","a student gets only the packs of their own grade");
const f10=await feed(10);ok(f10.out.length===1&&f10.out[0].c===P1,"the pack arrives exactly as signed");
for(let i=1;i<=5;i++){await sleep(3);ok((await call("POST","/f",{c:await sign({v:1,t:"l",id:"L"+i+"10",g:10,rows:[["سارا م.",10*i,"h"]]})})).s===200,"league table "+i+" of grade 10")}
await sleep(3);await call("POST","/f",{c:await sign({v:1,t:"l",id:"L111",g:11,rows:[]})});
const L10=(await kv.get("fi","json")).filter(x=>x.t==="l"&&x.gs[0]===10).map(x=>x.id);
ok(L10.join()==="L310,L410,L510","only the newest 3 league tables of a grade are kept");ok(!kv.m.has("f:L110")&&!kv.m.has("f:L210")&&kv.m.has("f:L111"),"old tables are deleted; other grades keep theirs");
const g10=await feed(10,f10.s);ok(g10.out.map(x=>x.id).join()==="L310,L410,L510"&&g10.n===2,"grade 10 gets the new tables, 2 per page (pages: "+g10.n+")");
await sleep(3);await call("POST","/f",{c:await sign({v:1,t:"l",id:"L410",g:10,rows:[["سارا م.",99,"h"]]})});
const again=await feed(10,g10.s);ok(again.out.length===1&&again.out[0].id==="L410","publishing the same table again sends only that one again");
ok((await kv.get("fi","json")).filter(x=>x.id==="L410").length===1,"…and keeps one copy");
for(let i=1;i<=10;i++)await call("POST","/f",{c:await sign({v:1,t:"s",id:"S"+i,g:11,cs:[1],n:10,title:"آزمون "+i})});
ok((await kv.get("fi","json")).filter(x=>x.t==="s").length===8,"the newest 8 tests of a grade are kept");
ok((await kv.get("fi","json")).filter(x=>x.t==="p").length===2,"question packs are all kept");
// a pack just listed but not readable yet stops the page instead of being skipped
await sleep(3);const P3=await sign({v:1,t:"p",id:"pk3",qs:[{g:12}]});await call("POST","/f",{c:P3});kv.hide.add("f:pk3");
const s12=(await feed(12)).s;let r2=(await call("GET","/f?g=12&since="+s12)).j;ok(r2.items.length===0&&r2.more,"a fresh pack not readable here yet is not skipped");kv.hide.delete("f:pk3");
r2=(await call("GET","/f?g=12&since="+s12)).j;ok(r2.items.map(x=>x.id).join()==="pk3","…it arrives next time");
ok((await call("GET","/nothing")).s===404,"unknown address → 404");
console.log("KV use:",JSON.stringify(kv.n));
if(bad){console.log(bad+" failed");process.exit(1)}console.log("all passed");
