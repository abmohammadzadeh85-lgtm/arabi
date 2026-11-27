// A stand-in for the Cloudflare API, for tests/mailbox_ci_test.sh only.  node tests/fake_cloudflare.mjs PORT
import http from "node:http";
const ACC="0123456789abcdef0123456789abcdef",st={sub:null,kv:[],calls:[]};
const send=(res,s,o)=>{res.writeHead(s,{"content-type":"application/json"});res.end(JSON.stringify(o))};
http.createServer((req,res)=>{let b="";req.on("data",d=>b+=d).on("end",()=>{const u=new URL(req.url,"http://x"),p=u.pathname.replace(/^\/client\/v4/,"");st.calls.push(req.method+" "+p);
 if(p==="/_state")return send(res,200,st);
 const tok=(req.headers.authorization||"").replace("Bearer ","");
 if(!["test-token","member-only","editor"].includes(tok))return send(res,403,{success:false,errors:[{code:10000,message:"Authentication error"}]});
 if(p==="/accounts"&&req.method==="GET")return send(res,200,{success:true,result:tok==="member-only"?[]:[{id:ACC,name:"Test"}]});
 if(p==="/memberships"&&req.method==="GET")return send(res,200,{success:true,result:[{id:"m1",account:{id:ACC,name:"Test"}}]});
 if(tok==="editor"&&req.method!=="GET")return send(res,403,{success:false,errors:[{code:10000,message:"Authentication error"}]});
 if(p===`/accounts/${ACC}/workers/subdomain`){if(req.method==="GET")return st.sub?send(res,200,{success:true,result:{subdomain:st.sub}}):send(res,404,{success:false,errors:[{code:10007,message:"This account does not have a workers.dev subdomain"}]});
  const n=JSON.parse(b).subdomain;if(n==="arabibazi")return send(res,409,{success:false,errors:[{code:10032,message:"subdomain unavailable"}]});st.sub=n;return send(res,200,{success:true,result:{subdomain:n}})}
 if(p===`/accounts/${ACC}/storage/kv/namespaces`){if(req.method==="GET")return send(res,200,{success:true,result:st.kv});
  const t=JSON.parse(b).title,x={id:"fedcba9876543210fedcba9876543210",title:t};st.kv.push(x);return send(res,200,{success:true,result:x})}
 send(res,404,{success:false,errors:[{code:7003,message:"no route"}]})})}).listen(+process.argv[2]);
