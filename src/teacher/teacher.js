/* ---------- Teacher panel ----------
   The teacher's private keys are made here, wrapped with the teacher's passphrase (PBKDF2 → AES-GCM)
   and kept only on this device. After unlocking they live in memory as non-extractable keys.
   Reports arrive sealed for these keys; question packs leave signed with them. */
(function(){
if(window.top!==window.self){document.documentElement.textContent="";return}  // never run inside someone else's frame
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var VK="arabibazi-teacher:vault",RK="arabibazi-teacher:reports",DK="arabibazi-teacher:drafts",BK="arabibazi-teacher:backupAt",FK="arabibazi-teacher:fails";
var IT=600000,KEYS=null,VAULT=null,STUD={},PEND=[],GF=0,EG=11,EDIT=null,idleT=null;
var fa=function(n){return String(n).replace(/\d/g,function(d){return"۰۱۲۳۴۵۶۷۸۹"[d]})};
var GN={10:"دهم",11:"یازدهم",12:"دوازدهم"};
function rd(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function mins(sec){var m=Math.round((+sec||0)/60);return m<1?"کمتر از ۱ دقیقه":fa(m)+" دقیقه"}
function date(ms){try{return new Date(ms).toLocaleDateString("fa-IR",{year:"numeric",month:"short",day:"numeric"})}catch(e){return""}}
function show(id){["s-setup","s-backup","s-code","s-unlock","s-dash"].forEach(function(x){$("#"+x).hidden=x!==id});$("#lockBtn").hidden=!KEYS;scrollTo(0,0)}
function msg(id,t,ok){var m=$("#"+id);m.textContent=t||"";m.classList.toggle("ok",!!ok)}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
/* ---------- dialog ---------- */
var dlgDone=null;
function dialog(title,text,btns,extra){return new Promise(function(res){var d=$("#dlg"),c=$("#dlg .card");c.textContent="";c.appendChild(el("h3",null,title));if(text)c.appendChild(el("p",null,text));if(extra)c.appendChild(extra);
 var a=el("div","acts");btns.forEach(function(b){var x=el("button","btn"+(b.primary?"":" ghost")+" wide",b.label);x.onclick=function(){close(b.val)};a.appendChild(x)});c.appendChild(a);
 d.hidden=false;$("#dlgScrim").hidden=false;dlgDone=function(){close(null)};function close(v){d.hidden=true;$("#dlgScrim").hidden=true;dlgDone=null;res(v)}})}
$("#dlgScrim").addEventListener("click",function(){dlgDone&&dlgDone()});
/* ---------- keys ---------- */
var S=crypto.subtle;
function kek(pass,salt,it){return S.importKey("raw",AB.te.encode(pass.normalize("NFC")),"PBKDF2",false,["deriveKey"]).then(function(b){return S.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:salt,iterations:it},b,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])})}
function wrap(priv,pass){var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 return kek(pass,salt,IT).then(function(k){return S.encrypt({name:"AES-GCM",iv:iv},k,AB.te.encode(JSON.stringify(priv)))}).then(function(ct){return{it:IT,salt:AB.b64u(salt),iv:AB.b64u(iv),ct:AB.b64u(ct)}})}
function unwrapPriv(v,pass){return kek(pass,AB.ub64(v.salt),v.it).then(function(k){return S.decrypt({name:"AES-GCM",iv:AB.ub64(v.iv)},k,AB.ub64(v.ct))}).then(function(pt){return JSON.parse(AB.td.decode(pt))})}
function importPriv(p){return Promise.all([S.importKey("jwk",p.sig,AB.DS,false,["sign"]),S.importKey("jwk",p.dh,AB.EC,false,["deriveBits"])]).then(function(k){return{sig:k[0],dh:k[1]}})}
function makeVault(pass){var sk,dk;return Promise.all([S.generateKey(AB.DS,true,["sign","verify"]),S.generateKey(AB.EC,true,["deriveBits"])]).then(function(k){sk=k[0];dk=k[1];
  return Promise.all([S.exportKey("jwk",sk.privateKey),S.exportKey("jwk",dk.privateKey),S.exportKey("raw",sk.publicKey),S.exportKey("raw",dk.publicKey)])})
 .then(function(x){var priv={sig:x[0],dh:x[1]},pub={sig:AB.b64u(x[2]),dh:AB.b64u(x[3])};return wrap(priv,pass).then(function(w){w.v=1;w.pub=pub;w.made=Date.now();return{vault:w,priv:priv}})})}
function teacherCode(){return"AB1."+VAULT.pub.sig+"."+VAULT.pub.dh}
function backupCode(){return"ABK1."+AB.b64u(AB.te.encode(JSON.stringify(VAULT)))}
function strong(p){if(p.length<10)return"رمز باید دست‌کم ۱۰ حرف باشد.";if(/^\d+$/.test(p))return"رمز فقط عدد نباشد؛ حرف هم بگذارید.";if(new Set(p).size<5)return"رمز خیلی تکراری است.";return""}
/* ---------- screens ---------- */
function boot(){VAULT=rd(VK,null);var h=location.hash||"";if(h.indexOf("#r=")===0){PEND.push(h.slice(3));try{history.replaceState(null,"",location.pathname)}catch(e){}}
 $$(".restore").forEach(buildRestore);
 if(!VAULT){show("s-setup");if(PEND.length)msg("setupMsg","یک کارنامه رسیده؛ اول پنل را راه بیندازید.");return}
 lockScreen()}
function lockScreen(){KEYS=null;STUD={};show("s-unlock");var n=$("#pendNote");n.hidden=!PEND.length;n.textContent="یک کارنامهٔ تازه رسیده؛ بعد از ورود اضافه می‌شود.";setTimeout(function(){$("#pu").focus()},60)}
addEventListener("hashchange",function(){var h=location.hash||"";if(h.indexOf("#r=")!==0)return;var c=h.slice(3);try{history.replaceState(null,"",location.pathname)}catch(e){}
 if(KEYS)importCodes([c]).then(function(r){toastImport(r)});else{PEND.push(c);if(VAULT)lockScreen()}});
function buildRestore(box){var ta=el("textarea","inp");ta.rows=3;ta.dir="ltr";ta.placeholder="ABK1.…";var f=el("input");f.type="file";f.accept=".txt,.json,text/plain";
 var b=el("button","btn ghost wide","بازگردانی"),m=el("p","msg");box.appendChild(ta);box.appendChild(f);box.appendChild(b);box.appendChild(m);
 f.addEventListener("change",function(){var x=f.files&&f.files[0];if(x)x.text().then(function(t){ta.value=t.trim()})});
 b.onclick=function(){var t=ta.value.trim(),v=null;try{if(t.indexOf("ABK1.")!==0)throw 0;v=JSON.parse(AB.td.decode(AB.ub64(t.slice(5))));if(!v.pub||!v.ct||!v.salt)throw 0}catch(e){m.textContent="این کد پشتیبان درست نیست.";return}
  dialog("بازگردانی پنل","رمز همین پشتیبان را بزنید.",[{label:"بازگردانی",val:1,primary:true},{label:"انصراف",val:0}],passBox("rp")).then(function(ok){if(!ok)return;var p=$("#rp").value;
   unwrapPriv(v,p).then(importPriv).then(function(k){VAULT=v;wr(VK,v);wr(BK,Date.now());KEYS=k;enterDash()}).catch(function(){m.textContent="رمز با این پشتیبان نمی‌خواند."})})}}
function passBox(id){var w=el("label","fl","رمز"),i=el("input","inp");i.type="password";i.id=id;i.dir="ltr";i.autocomplete="current-password";w.appendChild(i);setTimeout(function(){i.focus()},60);return w}
/* ---------- unlock with growing wait after wrong tries ---------- */
var busy=false;
function doUnlock(){if(busy)return;var f=rd(FK,{n:0,t:0}),wait=f.n>2?Math.min(60000,1000*Math.pow(2,f.n-3)):0,left=f.t+wait-Date.now();
 if(left>0){msg("unMsg","چند ثانیه صبر کنید و دوباره امتحان کنید ("+fa(Math.ceil(left/1000))+" ثانیه).");return}
 var p=$("#pu").value;if(!p)return;busy=true;msg("unMsg","در حال باز کردن…",true);
 unwrapPriv(VAULT,p).then(importPriv).then(function(k){busy=false;wr(FK,{n:0,t:0});KEYS=k;$("#pu").value="";enterDash()})
  .catch(function(){busy=false;wr(FK,{n:f.n+1,t:Date.now()});msg("unMsg","رمز درست نیست.")})}
function enterDash(){show("s-dash");tab("rep");$("#tcode2").textContent=teacherCode();bkAge();
 loadReports().then(function(){if(PEND.length){var p=PEND.splice(0);return importCodes(p).then(toastImport)}});idle()}
function idle(){clearTimeout(idleT);idleT=setTimeout(function(){if(KEYS)lockScreen()},20*60*1000)}
["click","keydown","touchstart"].forEach(function(ev){addEventListener(ev,function(){if(KEYS)idle()},{passive:true})});
function bkAge(){var t=rd(BK,0);$("#bkAge").textContent=t?"آخرین پشتیبان: "+date(t):"هنوز پشتیبان نگرفته‌اید!"}
/* ---------- reports ---------- */
function clampReport(r){if(!r||r.t!=="r"||typeof r.id!=="string")return null;var g=+r.g;if([10,11,12].indexOf(g)<0)return null;
 var out={id:String(r.id).slice(0,40),n:String(r.n||"بی‌نام").slice(0,40),g:g,at:+r.at||0,ver:String(r.ver||"").slice(0,12),gr:{}};
 Object.keys(r.gr||{}).forEach(function(k){var x=r.gr[k],gg=+k;if([10,11,12].indexOf(gg)<0||!x)return;var ch={};Object.keys(x.ch||{}).forEach(function(c){var v=x.ch[c];if(Array.isArray(v)&&v.length===4)ch[+c]=v.map(function(z){return Math.max(0,Math.min(1e6,+z||0))})});
  out.gr[gg]={ch:ch,ans:+x.ans||0,ok:+x.ok||0,ses:+x.ses||0,best:+x.best||0,wr:+x.wr||0,last:Array.isArray(x.last)?x.last.slice(-10):[]}});
 out.xp=Math.max(0,Math.min(1e7,+r.xp||0));out.stk=Math.max(0,Math.min(9999,+r.stk||0));out.day=(Array.isArray(r.day)?r.day:[]).slice(-90).filter(function(d){return Array.isArray(d)&&d[0]>20200101&&d[0]<21000101}).map(function(d){return[+d[0],Math.max(0,Math.min(5000,+d[1]||0))]});return out}
function addReport(r){var s=STUD[r.id];if(!s)s=STUD[r.id]={id:r.id,list:[]};if(s.list.some(function(x){return x.at===r.at}))return false;s.list.push(r);s.list.sort(function(a,b){return a.at-b.at});s.last=s.list[s.list.length-1];return true}
function loadReports(){STUD={};var all=rd(RK,[]);return Promise.all(all.map(function(x){return AB.open(x.c,KEYS.dh).then(clampReport).catch(function(){return null})})).then(function(rs){rs.forEach(function(r){if(r)addReport(r)});renderList()})}
function codesIn(text){var out=[],re=/#r=([A-Za-z0-9_-]{60,})/g,m;while((m=re.exec(text)))out.push(m[1]);if(!out.length){String(text).split(/\s+/).forEach(function(t){if(/^[A-Za-z0-9_-]{120,}$/.test(t))out.push(t)})}return out}
function importCodes(codes){var all=rd(RK,[]),have=new Set(all.map(function(x){return x.c})),res={added:0,dup:0,bad:0,names:[]};
 return codes.reduce(function(p,c){return p.then(function(){if(have.has(c)){res.dup++;return}return AB.open(c,KEYS.dh).then(function(r){r=clampReport(r);if(!r){res.bad++;return}
   if(addReport(r)){all.push({c:c,r:Date.now()});have.add(c);res.added++;res.names.push(r.n+" ("+GN[r.g]+")")}else res.dup++}).catch(function(){res.bad++})})},Promise.resolve())
 .then(function(){wr(RK,all);renderList();return res})}
function toastImport(r){var t=[];if(r.added)t.push("✓ "+fa(r.added)+" کارنامه اضافه شد: "+r.names.slice(0,5).join("، ")+(r.names.length>5?"…":""));if(r.dup)t.push(fa(r.dup)+" تکراری بود.");if(r.bad)t.push(fa(r.bad)+" باز نشد (مال این پنل نیست یا خراب است).");
 msg("impMsg",t.join(" ")||"لینکی پیدا نشد.",r.added>0);if(r.added&&!$("#s-dash").hidden)tab("rep")}
function summary(s,g){var x=s.last.gr[g]||{ch:{}},m=0,tot=0;Object.keys(x.ch).forEach(function(c){m+=x.ch[c][0];tot+=x.ch[c][1]});return{acc:x.ans?Math.round(x.ok/x.ans*100):null,m:m,tot:tot,ses:x.ses||0,ans:x.ans||0,wr:x.wr||0}}
function renderList(){renderClass();var box=$("#stList");if(!box)return;box.textContent="";var q=($("#q").value||"").trim(),list=Object.keys(STUD).map(function(k){return STUD[k]});
 $$("#gf button").forEach(function(b){b.setAttribute("aria-pressed",+b.dataset.g===GF)});
 if(!list.length){box.appendChild(el("p","empty card","هنوز کارنامه‌ای نرسیده. وقتی دانش‌آموزها از بخش «آمار» کارنامه بفرستند، اینجا به ترتیب پایه و اسم دیده می‌شوند."));return}
 var names={};list.forEach(function(s){var k=s.last.n.trim();names[k]=(names[k]||0)+1});
 [10,11,12].forEach(function(g){if(GF&&GF!==g)return;var L=list.filter(function(s){return s.last.g===g&&(!q||s.last.n.indexOf(q)>=0)}).sort(function(a,b){return a.last.n.localeCompare(b.last.n,"fa")});
  if(!L.length)return;var h=el("h2",null,"پایهٔ "+GN[g]+" · "+fa(L.length)+" دانش‌آموز");box.appendChild(h);
  var acc=L.map(function(s){return summary(s,g).acc}).filter(function(a){return a!=null});if(acc.length)box.appendChild(el("p","note","میانگین درستی کلاس: "+fa(Math.round(acc.reduce(function(a,b){return a+b},0)/acc.length))+"٪"));
  L.forEach(function(s){var sm=summary(s,g),b=el("button","card st");b.dataset.act="stu";b.dataset.id=s.id;var top=el("div","st-top");top.appendChild(el("b",null,s.last.n+(names[s.last.n.trim()]>1?" · "+s.id.slice(0,4):"")));
   top.appendChild(el("span","pill",sm.acc==null?"–":fa(sm.acc)+"٪"));b.appendChild(top);var bar=el("span","bar"),f=el("span");f.style.width=(sm.tot?Math.round(sm.m/sm.tot*100):0)+"%";bar.appendChild(f);b.appendChild(bar);
   b.appendChild(el("small",null,"یادگرفته "+fa(sm.m)+" از "+fa(sm.tot)+" · "+fa(sm.ses)+" جلسه · آخرین کارنامه "+date(s.last.at)));box.appendChild(b)})})}
var CH=APP.chapters;function chName(g,c){return(CH[g]||{})[c]||("فصل "+fa(c))}
function showStudent(id){var s=STUD[id];if(!s)return;var r=s.last,box=el("div","stud");
 box.appendChild(el("p","note","پایهٔ "+GN[r.g]+" · آخرین کارنامه "+date(r.at)+" · "+fa(s.list.length)+" کارنامه · کد دستگاه "+s.id.slice(0,6)));
 Object.keys(r.gr).map(Number).sort().forEach(function(g){var x=r.gr[g];box.appendChild(el("b",null,"پایهٔ "+GN[g]+(g!==r.g?" (پایهٔ قبلی)":"")));
  var tb=el("table"),hr=el("tr");["درس","یادگرفته","درست","غلط"].forEach(function(t){hr.appendChild(el("th",null,t))});tb.appendChild(hr);
  Object.keys(x.ch).map(Number).sort(function(a,b){return a-b}).forEach(function(c){var v=x.ch[c],tr=el("tr");tr.appendChild(el("td",null,chName(g,c)));tr.appendChild(el("td",null,fa(v[0])+"/"+fa(v[1])));tr.appendChild(el("td",null,fa(v[2])));tr.appendChild(el("td",null,fa(v[3])));tb.appendChild(tr)});
  box.appendChild(tb);box.appendChild(el("p","note","درصد درستی: "+(x.ans?fa(Math.round(x.ok/x.ans*100))+"٪":"–")+" · بهترین ردیف درست: "+fa(x.best)+" · غلط‌های مانده برای مرور: "+fa(x.wr)));
  if(x.last.length){var ul=el("ul","hist");x.last.slice().reverse().forEach(function(h){var li=el("li");var what=h[1]==="m"?"ترکیبی":h[1]==="r"?"مرور غلط‌ها":chName(g,h[1]);
   li.appendChild(el("span",null,date(h[0])+" · "+what));li.appendChild(el("b",null,fa(h[2])+"/"+fa(h[3])+" · "+mins(h[4])));ul.appendChild(li)});box.appendChild(ul)}});
 if(s.list.length>1){var tr=s.list.map(function(z){var x=z.gr[z.g]||{};return x.ans?Math.round(x.ok/x.ans*100):null}).filter(function(a){return a!=null});if(tr.length>1)box.appendChild(el("p","note","روند درصد درستی: "+tr.map(fa).join(" ← ")+"٪"))}
 dialog("🎓 "+r.n,null,[{label:"بستن",val:0,primary:true},{label:"حذف این دانش‌آموز",val:"del"}],box).then(function(v){if(v!=="del")return;
  dialog("حذف کارنامه‌ها","همهٔ کارنامه‌های «"+r.n+"» از این پنل پاک شود؟",[{label:"بله، حذف",val:1,primary:true},{label:"انصراف",val:0}]).then(function(ok){if(!ok)return;
   var all=rd(RK,[]);Promise.all(all.map(function(x){return AB.open(x.c,KEYS.dh).then(function(z){return z&&z.id===id}).catch(function(){return false})})).then(function(m){wr(RK,all.filter(function(_,i){return!m[i]}));delete STUD[id];renderList()})})})}
function csv(){var rows=[["پایه","نام","کد دستگاه","آخرین کارنامه","پاسخ‌ها","درصد درستی","یادگرفته","کل سؤال‌ها","جلسه‌ها"]],chs={};
 Object.keys(STUD).forEach(function(k){var s=STUD[k],g=s.last.g,sm=summary(s,g),x=s.last.gr[g]||{ch:{}},r=[GN[g],s.last.n,s.id.slice(0,6),date(s.last.at),sm.ans,sm.acc==null?"":sm.acc,sm.m,sm.tot,sm.ses];
  Object.keys(x.ch).forEach(function(c){r.push(chName(g,c)+": "+x.ch[c][0]+"/"+x.ch[c][1])});rows.push(r)});
 var t="﻿"+rows.map(function(r){return r.map(function(v){v=String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(",")}).join("\n");
 download("karnameh-"+new Date().toISOString().slice(0,10)+".csv",t,"text/csv")}
function download(name,text,type){try{var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:(type||"text/plain")+";charset=utf-8"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},2000)}catch(e){}}
function copy(text,btn,node){function legacy(){try{var ta=document.createElement("textarea");ta.value=text;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none";document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,text.length);var ok=document.execCommand("copy");ta.remove();return ok}catch(e){return false}}
 var p;try{p=navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(text).then(function(){return true},function(){return legacy()}):Promise.resolve(legacy())}catch(e){p=Promise.resolve(legacy())}
 p.then(function(ok){if(!btn)return;var o=btn.dataset.l||(btn.dataset.l=btn.textContent);if(!ok&&node){try{var r=document.createRange();r.selectNodeContents(node);var sel=getSelection();sel.removeAllRanges();sel.addRange(r)}catch(e){}}
  btn.textContent=ok?"کپی شد ✓":node?"انتخاب شد؛ نگه دارید و کپی کنید":"کپی نشد؛ «دانلود» را بزنید";setTimeout(function(){btn.textContent=o},2200)})}
/* ---------- question editor ---------- */
var AR=/[يك]/g,norm=function(s){return String(s||"").replace(AR,function(c){return c==="ي"?"ی":"ک"}).replace(/[ \t]+/g," ").trim()};
function drafts(){return rd(DK,[])}
function setEG(g){EG=g;$$("#eg button").forEach(function(b){b.setAttribute("aria-pressed",+b.dataset.g===g)})}
function clearForm(){EDIT=null;["eq","es","eo0","eo1","eo2","eo3","ee","esrc"].forEach(function(id){$("#"+id).value=""});$$('input[name="ea"]').forEach(function(r){r.checked=false});$("#edTitle").textContent="سؤال تازه";msg("edMsg","")}
function readForm(){var q={g:EG,q:norm($("#eq").value),s:norm($("#es").value),o:[0,1,2,3].map(function(i){return norm($("#eo"+i).value)}),e:norm($("#ee").value),src:norm($("#esrc").value)||"سؤال معلم"},ch=$('input[name="ea"]:checked');
 q.a=ch?+ch.value:-1;if(!q.q)return"صورت سؤال را بنویسید.";if(q.o.some(function(x){return!x}))return"هر چهار گزینه را بنویسید.";if(new Set(q.o).size<4)return"گزینه‌ها نباید تکراری باشند.";if(q.a<0)return"گزینهٔ درست را با دایرهٔ کنارش مشخص کنید.";if(!q.e)return"توضیح جواب را بنویسید؛ دانش‌آموز بعد از جواب دادن آن را می‌بیند.";return q}
function saveForm(){var q=readForm();if(typeof q==="string"){msg("edMsg",q);return}var L=drafts();if(EDIT){var i=L.findIndex(function(x){return x.k===EDIT});if(i>=0){q.k=EDIT;q.pub=null;L[i]=q}}else{q.k=AB.rand(6);q.pub=null;L.push(q)}
 wr(DK,L);clearForm();msg("edMsg","✓ به فهرست اضافه شد.",true);renderDrafts()}
function renderDrafts(){var box=$("#dList");box.textContent="";var L=drafts();if(!L.length){box.appendChild(el("p","note","فهرست سؤال‌های شما خالی است."));return}
 [10,11,12].forEach(function(g){var G=L.filter(function(x){return x.g===g});if(!G.length)return;box.appendChild(el("h2",null,"پایهٔ "+GN[g]+" · "+fa(G.length)+" سؤال"));
  G.forEach(function(x){var c=el("div","card dq"),t=el("p",null,x.q);c.appendChild(t);if(x.s){var a=el("p","ar",x.s);a.dir="rtl";c.appendChild(a)}c.appendChild(el("p","note","✓ "+x.o[x.a]+" · "+(x.pub?"فرستاده شده":"تازه")));
   var r=el("div","row2"),e=el("button","btn ghost","ویرایش"),d=el("button","btn ghost","حذف");e.dataset.act="editQ";e.dataset.k=x.k;d.dataset.act="delQ";d.dataset.k=x.k;r.appendChild(e);r.appendChild(d);c.appendChild(r);box.appendChild(c)})})}
function editQ(k){var x=drafts().find(function(z){return z.k===k});if(!x)return;EDIT=k;setEG(x.g);$("#eq").value=x.q;$("#es").value=x.s;x.o.forEach(function(o,i){$("#eo"+i).value=o});$('input[name="ea"][value="'+x.a+'"]').checked=true;$("#ee").value=x.e;$("#esrc").value=x.src;$("#edTitle").textContent="ویرایش سؤال";$("#ed").scrollIntoView({block:"start"})}
function publish(){var L=drafts(),todo=L.filter(function(x){return!x.pub});if(!todo.length){msg("edMsg","سؤال تازه‌ای در فهرست نیست.");$("#pubOut").textContent="";return}
 var pid=AB.rand(6),n={},qs=todo.map(function(x){n[x.g]=(n[x.g]||0)+1;return{id:x.g+"-teacher-"+pid+"-"+String(n[x.g]).padStart(3,"0"),g:x.g,s:"arabic",c:90,t:"mcq",q:x.q+(x.s?"\n"+x.s:""),o:x.o,a:x.a,e:x.e,src:x.src}});
 AB.sign({v:1,t:"p",id:pid,at:Date.now(),qs:qs},KEYS.sig).then(function(code){todo.forEach(function(x){x.pub=pid});wr(DK,L);renderDrafts();
  var url=APP.site+"#p="+code,out=$("#pubOut");out.textContent="";out.appendChild(el("p","note","✓ لینک "+fa(qs.length)+" سؤال آماده است ("+[10,11,12].filter(function(g){return n[g]}).map(function(g){return GN[g]+": "+fa(n[g])}).join("، ")+"). این لینک را در گروه کلاس بفرستید. دانش‌آموزی که اپ را روی صفحهٔ گوشی نصب کرده، لینک را کپی کند و در اپ: تنظیمات ← سؤال‌های معلم بچسباند."));
  var cd=el("code","codebox",url.length>400?url.slice(0,160)+"…":url);cd.dir="ltr";out.appendChild(cd);var r=el("div","row2"),cb=el("button","btn","کپی لینک"),sb=el("button","btn ghost","فرستادن");
  cb.onclick=function(){copy(url,cb,url.length>400?null:out.querySelector("code"))};sb.onclick=function(){if(navigator.share)navigator.share({title:"سؤال‌های تازهٔ معلم",text:"سؤال‌های تازهٔ معلم برای عربی‌بازی",url:url}).catch(function(){});else copy(url,sb)};r.appendChild(cb);r.appendChild(sb);out.appendChild(r);
  var fb=el("button","btn ghost wide","دانلود به‌صورت فایل");fb.onclick=function(){download("soal-moalem-"+pid+".txt",url)};out.appendChild(fb);
  if(url.length>6000)out.appendChild(el("p","note","این لینک بلند است؛ اگر پیام‌رسان آن را کوتاه کرد، فایل را بفرستید و دانش‌آموزها از «تنظیمات ← سؤال‌های معلم ← از فایل» واردش کنند."))})}
function linkOut(box,url,file,title,help){box.textContent="";box.appendChild(el("p","note",help));var cd=el("code","codebox",url.length>400?url.slice(0,160)+"…":url);cd.dir="ltr";box.appendChild(cd);
 var r=el("div","row2"),cb=el("button","btn","کپی لینک"),sb=el("button","btn ghost","فرستادن");cb.onclick=function(){copy(url,cb,url.length>400?null:box.querySelector("code"))};
 sb.onclick=function(){if(navigator.share)navigator.share({title:title,text:title,url:url}).catch(function(){});else copy(url,sb)};r.appendChild(cb);r.appendChild(sb);box.appendChild(r);
 var fb=el("button","btn ghost wide","دانلود به‌صورت فایل");fb.onclick=function(){download(file,url)};box.appendChild(fb)}
/* ---------- class progress by lesson ---------- */
function renderClass(){var box=$("#cls");if(!box)return;box.textContent="";var list=Object.keys(STUD).map(function(k){return STUD[k]});if(!list.length)return;
 [10,11,12].forEach(function(g){if(GF&&GF!==g)return;var L=list.filter(function(s){return s.last.g===g&&s.last.gr[g]});if(!L.length)return;var c=el("div","card tbox cls");c.appendChild(el("b","","📊 پیشرفت کلاس به تفکیک درس · "+GN[g]+" ("+fa(L.length)+" نفر)"));
  Object.keys(CH[g]||{}).map(Number).filter(function(x){return x!==90}).forEach(function(ch){var sum=0,n=0,act=0;L.forEach(function(s){var v=s.last.gr[g].ch[ch];if(!v||!v[1])return;sum+=v[0]/v[1];n++;if(v[2]+v[3]>0)act++});
   var pc=n?Math.round(sum/n*100):0,r=el("div","cr");r.appendChild(el("span","",chName(g,ch)));r.appendChild(el("span","n",fa(pc)+"٪ · "+fa(act)+" نفر تمرین کرده"));var b=el("span","cb"),i=el("i");i.style.width=pc+"%";b.appendChild(i);r.appendChild(b);c.appendChild(r)});box.appendChild(c)})}
/* ---------- two-week league (built from the XP in reports) and teacher test sets ---------- */
var LG=10,TS=10;
function dk(ms){var d=new Date(ms);return d.getFullYear()*1e4+(d.getMonth()+1)*100+d.getDate()}
function lgRange(){var v=$("#lgS").value,s=v?new Date(v+"T00:00:00").getTime():Date.now()-13*864e5;return[s,s+14*864e5]}
function lgRows(){var r=lgRange(),a=dk(r[0]),b=dk(r[1]-1);return Object.keys(STUD).map(function(k){return STUD[k]}).filter(function(s){return s.last.g===LG}).map(function(s){var xp=0;
  (s.last.day||[]).forEach(function(d){if(d[0]>=a&&d[0]<=b)xp+=d[1]});return[s.last.n,xp,s.id]}).sort(function(x,y){return y[1]-x[1]||x[0].localeCompare(y[0],"fa")})}
function renderLg(){$$("#lgG button").forEach(function(b){b.setAttribute("aria-pressed",+b.dataset.g===LG)});if(!$("#lgS").value){var d=new Date(Date.now()-13*864e5);$("#lgS").value=d.toISOString().slice(0,10)}
 var box=$("#lgT"),rows=lgRows(),r=lgRange();box.textContent="";box.appendChild(el("p","note","از "+date(r[0])+" تا "+date(r[1]-864e5)+(Date.now()>=r[1]?" · فصل تمام شده":" · "+fa(Math.ceil((r[1]-Date.now())/864e5))+" روز مانده")));
 if(!rows.length){box.appendChild(el("p","note","هنوز کارنامه‌ای از این پایه نرسیده."));return}
 rows.slice(0,20).forEach(function(x,i){var d=el("div","cr lgr");d.appendChild(el("span","",(["🥇","🥈","🥉"][i]||fa(i+1)+".")+" "+x[0]));d.appendChild(el("span","n",fa(x[1])+" امتیاز"));box.appendChild(d)})}
function lgPub(){var rows=lgRows(),r=lgRange();if(!rows.length){$("#lgOut").textContent="هنوز کارنامه‌ای از این پایه نرسیده.";return}var id=AB.rand(6);
 AB.sign({v:1,t:"l",id:"L"+dk(r[0])+LG,g:LG,s:r[0],e:r[1],at:Date.now(),rows:rows.slice(0,40)},KEYS.sig).then(function(code){var url=APP.site+"#p="+code;
  linkOut($("#lgOut"),url,"league-"+LG+"-"+id+".txt","جدول لیگ "+GN[LG],"✓ لینک جدول لیگ "+GN[LG]+" آماده است. در گروه کلاس بفرستید؛ دانش‌آموز با باز کردن لینک (یا چسباندنش در بخش «لیگ» اپ) جدول را می‌بیند.")})}
function renderTs(){$$("#tsG button").forEach(function(b){b.setAttribute("aria-pressed",+b.dataset.g===TS)});var box=$("#tsL");box.textContent="";
 Object.keys((APP.lessons||{})[TS]||{}).forEach(function(c){var l=el("label","chk"),i=el("input");i.type="checkbox";i.value=c;l.appendChild(i);l.appendChild(el("span","",chName(TS,+c)));box.appendChild(l)})}
function tsPub(){var cs=$$("#tsL input:checked").map(function(i){return+i.value});if(!cs.length){$("#tsOut").textContent="دست‌کم یک درس را انتخاب کنید.";return}var id=AB.rand(6),title=($("#tsT").value||"").trim()||"آزمون معلم",n=+$("#tsN").value||10;
 AB.sign({v:1,t:"s",id:id,g:TS,cs:cs,n:n,title:title,at:Date.now()},KEYS.sig).then(function(code){var url=APP.site+"#p="+code;
  linkOut($("#tsOut"),url,"azmoon-"+id+".txt",title,"✓ لینک «"+title+"» ("+GN[TS]+"، "+fa(n)+" سؤال) آماده است. دانش‌آموز با باز کردن لینک، آزمون را در صفحهٔ اول اپ می‌بیند.")})}
/* ---------- tabs and actions ---------- */
function tab(v){["rep","qs","lg","set"].forEach(function(x){$("#v-"+x).hidden=x!==v});if(v==="lg"){renderLg();renderTs()}$$(".tabs button").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.v===v)});if(v==="qs"){setEG(EG);renderDrafts()}if(v==="rep")renderList()}
document.addEventListener("click",function(ev){var b=ev.target.closest("[data-act]");if(!b)return;var a=b.dataset.act;switch(a){
 case"create":var p1=$("#p1").value,p2=$("#p2").value,w=strong(p1);if(w)return msg("setupMsg",w);if(p1!==p2)return msg("setupMsg","دو رمز یکی نیستند.");
  msg("setupMsg","در حال ساختن کلید…",true);makeVault(p1).then(function(x){VAULT=x.vault;wr(VK,VAULT);return importPriv(x.priv)}).then(function(k){KEYS=k;$("#p1").value="";$("#p2").value="";$("#bk").textContent=backupCode();show("s-backup")}).catch(function(){msg("setupMsg","این مرورگر کلید نساخت؛ مرورگر را به‌روز کنید.")});break;
 case"copyBk":copy(backupCode(),b,$("#bk"));wr(BK,Date.now());bkAge();break;
 case"dlBk":download("arabibazi-teacher-backup.txt",backupCode());wr(BK,Date.now());bkAge();break;
 case"bkNext":if(!$("#bkOk").checked){dialog("پشتیبان","اول کد پشتیبان را کپی یا دانلود کنید و جای امنی نگه دارید، بعد تیک را بزنید.",[{label:"باشه",val:1,primary:true}]);break}$("#tcode").textContent=teacherCode();show("s-code");break;
 case"copyCode":copy(teacherCode(),b,$("#tcode").offsetParent?$("#tcode"):$("#tcode2"));break;
 case"shareCode":if(navigator.share)navigator.share({title:"کد معلم عربی‌بازی",text:teacherCode()}).catch(function(){});else copy(teacherCode(),b);break;
 case"codeNext":enterDash();break;
 case"unlock":doUnlock();break;
 case"lock":lockScreen();break;
 case"tab":tab(b.dataset.v);break;
 case"gf":GF=+b.dataset.g;renderList();break;
 case"lgG":LG=+b.dataset.g;renderLg();break;case"lgPub":lgPub();break;case"tsG":TS=+b.dataset.g;renderTs();break;case"tsPub":tsPub();break;
 case"stu":showStudent(b.dataset.id);break;
 case"import":var cs=codesIn($("#imp").value);if(!cs.length){msg("impMsg","لینک کارنامه‌ای پیدا نشد.");break}importCodes(cs).then(function(r){$("#imp").value="";toastImport(r)});break;
 case"csv":csv();break;
 case"eg":setEG(+b.dataset.g);break;
 case"saveQ":saveForm();break;case"clearQ":clearForm();break;
 case"editQ":editQ(b.dataset.k);break;
 case"delQ":dialog("حذف سؤال","این سؤال از فهرست شما پاک شود؟ (سؤالی که قبلاً فرستاده‌اید در گوشی دانش‌آموزها می‌ماند.)",[{label:"حذف",val:1,primary:true},{label:"انصراف",val:0}]).then(function(ok){if(ok){wr(DK,drafts().filter(function(x){return x.k!==b.dataset.k}));renderDrafts()}});break;
 case"publish":publish();break;
 case"chpass":var c0=$("#c0").value,c1=$("#c1").value,c2=$("#c2").value,w2=strong(c1);if(w2)return msg("chMsg",w2);if(c1!==c2)return msg("chMsg","دو رمز تازه یکی نیستند.");
  msg("chMsg","در حال عوض کردن…",true);unwrapPriv(VAULT,c0).then(function(priv){return wrap(priv,c1)}).then(function(w){w.v=1;w.pub=VAULT.pub;w.made=VAULT.made;VAULT=w;wr(VK,VAULT);wr(BK,0);bkAge();["c0","c1","c2"].forEach(function(i){$("#"+i).value=""});msg("chMsg","✓ رمز عوض شد. حالا یک کد پشتیبان تازه بگیرید.",true)}).catch(function(){msg("chMsg","رمز فعلی درست نیست.")});break;
 case"wipe":dialog("پاک کردن پنل","کلید معلم از این دستگاه پاک می‌شود. فقط اگر کد پشتیبان و رمز را دارید ادامه دهید. برای اطمینان، کلمهٔ «پاک» را بنویسید.",[{label:"پاک کن",val:1,primary:true},{label:"انصراف",val:0}],(function(){var i=el("input","inp");i.id="wipeIn";return i})()).then(function(ok){
   if(ok&&$("#wipeIn")&&$("#wipeIn").value.trim()==="پاک"){[VK,RK,DK,BK,FK].forEach(function(k){try{localStorage.removeItem(k)}catch(e){}});KEYS=null;VAULT=null;STUD={};show("s-setup")}});break;
}});
$("#impFile").addEventListener("change",function(){var fs=Array.prototype.slice.call(this.files||[]);Promise.all(fs.map(function(f){return f.text()})).then(function(ts){var cs=[];ts.forEach(function(t){cs=cs.concat(codesIn(t))});$("#impFile").value="";if(!cs.length)return msg("impMsg","در فایل لینکی پیدا نشد.");importCodes(cs).then(toastImport)})});
$("#q").addEventListener("input",renderList);
$("#pu").addEventListener("keydown",function(e){if(e.key==="Enter")doUnlock()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&dlgDone)dlgDone()});
if(!AB.ok){show("s-setup");msg("setupMsg","این مرورگر قفل‌های امن را پشتیبانی نمی‌کند؛ پنل را در Chrome یا Safari تازه باز کنید.")}else boot();
window.__teacher={codesIn:codesIn,stud:function(){return STUD},unlocked:function(){return!!KEYS}};
})();
