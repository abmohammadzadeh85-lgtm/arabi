// عربی‌بازی — a tiny mailbox between the students and the teacher (Cloudflare Worker + KV).
// It holds no secret and cannot read anything:
//  • report cards arrive already sealed for the teacher's key; only her panel can open them;
//  • the feed accepts only packs signed with the teacher's key (TEACHER_SIG is her PUBLIC key), and the apps check again;
//  • each phone writes its report under SHA-256(its own secret), so nobody can overwrite someone else's report.
// Storage (KV):  "r:<hash>" newest sealed report of one phone (metadata.at)
//                "f:<id>"   one signed pack of the teacher;  "fi" the list of packs [{id,t,gs,at,z}]
// Made for the free plan: one write per report, small pages, nothing big is parsed per request.
const H={"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type","access-control-max-age":"86400"};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...H,"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const ub64=s=>{s=String(s).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
const b64u=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const CODE=/^[A-Za-z0-9_-]+$/,GR=[10,11,12];
const KEEP={l:3,s:8};               // newest league tables / tests kept for each grade
const P_MAX=300,P_BYTES=12e6;       // question packs are all kept, up to these caps
const FRESH=5*60e3;                 // a just-written value may not be readable everywhere yet
class Bad extends Error{}
async function unpack(b){const body=b.slice(1);if(b[0]===1)return JSON.parse(new TextDecoder().decode(body));if(b[0]!==2)throw new Bad("format");
 const raw=await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();return JSON.parse(new TextDecoder().decode(raw))}
async function verify(code,pub){let b;try{b=ub64(code)}catch(e){throw new Bad("code")}if(b.length<72)throw new Bad("short");
 const key=await crypto.subtle.importKey("raw",ub64(pub),{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
 if(!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,b.slice(0,64),b.slice(64)))throw new Bad("signature");return unpack(b.slice(64))}
async function body(req,max){const t=await req.text();if(t.length>max)throw new Bad("too big");try{return JSON.parse(t)}catch(e){throw new Bad("json")}}
// a page of items (oldest first); stops before a value that is not readable here yet, so `since` never skips it
async function page(list,n,get){list.sort((a,b)=>a.at-b.at);const top=list.slice(0,n),vals=await Promise.all(top.map(get)),out=[],now=Date.now();
 for(let i=0;i<top.length;i++){if(vals[i]){out.push(vals[i]);continue}if(now-top[i].at<FRESH)return{items:out,more:true}}
 return{items:out,more:list.length>top.length}}
const index=async env=>(await env.KV.get("fi","json"))||[];
export default{async fetch(req,env){const u=new URL(req.url),p=u.pathname.replace(/\/+$/,"")||"/";
 if(req.method==="OPTIONS")return new Response(null,{headers:H});
 try{
  if(p==="/"||p==="/ping")return J({ok:true,app:"arabibazi"});
  // student → teacher: the newest sealed report of each phone
  if(p==="/r"&&req.method==="POST"){const b=await body(req,30000),s=String(b.s||""),c=String(b.c||"");
   if(!/^[A-Za-z0-9_-]{16,64}$/.test(s)||!CODE.test(c)||c.length<120||c.length>24000)return J({error:"bad"},400);
   const k="r:"+b64u(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))).slice(0,22),at=Date.now();
   await env.KV.put(k,c,{metadata:{at}});return J({ok:true,at})}
  // teacher's panel: sealed reports newer than ?since, a page at a time
  if(p==="/r"&&req.method==="GET"){const since=+u.searchParams.get("since")||0,list=[];let cur;
   do{const l=await env.KV.list({prefix:"r:",cursor:cur});for(const k of l.keys){const at=(k.metadata&&k.metadata.at)||0;if(at>since)list.push({k:k.name,at})}cur=l.list_complete?null:l.cursor}while(cur);
   return J(await page(list,+env.REP_PAGE||100,async x=>{const c=await env.KV.get(x.k);return c?{at:x.at,c}:null}))}
  // teacher → students: signed questions (p), league tables (l) and tests (s) of one grade, newer than ?since
  if(p==="/f"&&req.method==="GET"){const since=+u.searchParams.get("since")||0,g=+u.searchParams.get("g")||0;
   const list=(await index(env)).filter(x=>x.at>since&&(!g||x.gs.includes(g)));
   return J(await page(list,+env.FEED_PAGE||30,async x=>{const c=await env.KV.get("f:"+x.id);return c?{id:x.id,t:x.t,at:x.at,c}:null}))}
  if(p==="/f"&&req.method==="POST"){const b=await body(req,1500000),c=String(b.c||"");if(!CODE.test(c))return J({error:"bad"},400);
   const pk=await verify(c,env.TEACHER_SIG),id=String(pk&&pk.id||"");
   if(!pk||!/^[pls]$/.test(pk.t)||!/^[A-Za-z0-9_-]{2,32}$/.test(id))return J({error:"shape"},400);
   const gs=pk.t==="p"?[...new Set((Array.isArray(pk.qs)?pk.qs:[]).map(q=>q&&q.g))].filter(g=>GR.includes(g)):GR.includes(pk.g)?[pk.g]:[];
   if(!gs.length)return J({error:"grade"},400);
   const all=(await index(env)).filter(x=>x.id!==id);all.push({id,t:pk.t,gs,at:Date.now(),z:c.length});
   const keep=[],drop=[],seen={};let pn=0,pz=0;
   for(const x of all.sort((a,b)=>b.at-a.at)){let out=false;            // newest first
    if(x.t==="p"){pn++;pz+=x.z;out=pn>P_MAX||pz>P_BYTES}else{const k=x.t+x.gs[0];seen[k]=(seen[k]||0)+1;out=seen[k]>KEEP[x.t]}
    (out?drop:keep).push(x)}
   await env.KV.put("f:"+id,c);await env.KV.put("fi",JSON.stringify(keep.reverse()));
   await Promise.all(drop.map(x=>env.KV.delete("f:"+x.id)));
   return J({ok:true,n:keep.length})}
  return J({error:"not found"},404)}
 catch(e){return J({error:String(e&&e.message||e).slice(0,60)},e instanceof Bad||e instanceof SyntaxError?400:503)}}};
