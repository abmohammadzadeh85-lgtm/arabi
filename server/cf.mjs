// Cloudflare set-up for the mailbox. Uses the API token in CLOUDFLARE_API_TOKEN (never printed).
//   node cf.mjs account     → the account id (CLOUDFLARE_ACCOUNT_ID if set, otherwise the token's only account)
//   node cf.mjs subdomain   → the account's workers.dev name (chooses one if the account has none yet)
//   node cf.mjs kv TITLE    → the id of the storage (KV namespace) called TITLE (made if missing)
const T=process.env.CLOUDFLARE_API_TOKEN||"",BASE=process.env.CF_API||"https://api.cloudflare.com/client/v4";
const die=m=>{console.error("::error::"+m);process.exit(1)};
const why=j=>(j&&Array.isArray(j.errors)?j.errors:[]).map(e=>e.code+" "+e.message).join("; ")||"no answer";
// Cloudflare's roles since September 2026: making a Worker or a storage needs "Admin" (Editor only updates what exists)
const ADMIN=" The token probably lacks the right: make it again and, where it asks for the access type, choose Admin (for Workers and for KV).";
const denied=(s,j)=>s===401||s===403||/\b(10000|9109|10001)\b/.test(why(j));
async function api(path,opt={}){for(let i=0;;i++){try{const r=await fetch(BASE+path,{...opt,headers:{authorization:"Bearer "+T,"content-type":"application/json"}});
  let j=null;try{j=await r.json()}catch(e){}if(r.status>=500&&i<2){await new Promise(z=>setTimeout(z,3000));continue}return{s:r.status,j:j||{}}}
 catch(e){if(i<2){await new Promise(z=>setTimeout(z,3000));continue}die("Cloudflare could not be reached: "+e.message)}}}
async function account(){const A=process.env.CLOUDFLARE_ACCOUNT_ID;if(A){if(!/^[0-9a-f]{32}$/.test(A))die("CLOUDFLARE_ACCOUNT_ID should be 32 letters and digits (0-9, a-f).");return A}
 const {s,j}=await api("/accounts?per_page=50");let L=s===200&&j.success?(j.result||[]).map(a=>a.id):[];
 if(!L.length){const m=await api("/memberships?per_page=50");if(m.s===200&&m.j.success)L=[...new Set((m.j.result||[]).map(x=>x.account&&x.account.id).filter(Boolean))]
  else if(s!==200)die("The token was not accepted ("+s+": "+why(j)+"). Make it again from the «Edit Cloudflare Workers» template.")}
 if(L.length!==1)die(L.length?"The token reaches "+L.length+" accounts; also add the secret CLOUDFLARE_ACCOUNT_ID.":"The token reaches no account: in «Account Resources» choose your account.");
 return L[0]}
async function subdomain(id){let {s,j}=await api(`/accounts/${id}/workers/subdomain`);if(s===200&&j.success&&j.result&&j.result.subdomain)return j.result.subdomain;
 const rnd=()=>Math.random().toString(36).slice(2,7);
 for(const name of ["arabibazi","arabibazi-"+rnd(),"arabibazi-"+rnd(),"ab"+rnd()+rnd()]){
  ({s,j}=await api(`/accounts/${id}/workers/subdomain`,{method:"PUT",body:JSON.stringify({subdomain:name})}));
  if(s===200&&j.success)return(j.result&&j.result.subdomain)||name;console.error("workers.dev name «"+name+"»: "+s+": "+why(j));if(denied(s,j))die("Cloudflare did not let the token choose a workers.dev name."+ADMIN)}
 die("No workers.dev address could be chosen. In Cloudflare open «Workers & Pages» once (it asks for a name), then run again.")}
async function kv(id,title){let {s,j}=await api(`/accounts/${id}/storage/kv/namespaces?per_page=100`);
 if(s!==200||!j.success)die("The storage list could not be read ("+s+": "+why(j)+")."+ADMIN);
 const x=(j.result||[]).find(n=>n.title===title);if(x)return x.id;
 ({s,j}=await api(`/accounts/${id}/storage/kv/namespaces`,{method:"POST",body:JSON.stringify({title})}));
 if(s===200&&j.success&&j.result)return j.result.id;die("The storage could not be made ("+s+": "+why(j)+")."+(denied(s,j)?ADMIN:""))}
const [cmd,arg]=process.argv.slice(2);
if(!T)die("CLOUDFLARE_API_TOKEN is empty.");
const id=await account();
if(cmd==="account")console.log(id);
else if(cmd==="subdomain")console.log(await subdomain(id));
else if(cmd==="kv")console.log(await kv(id,arg||"ARABIBAZI"));
else die("usage: node cf.mjs account|subdomain|kv TITLE");
