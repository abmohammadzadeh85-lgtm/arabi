/* ---------- App ---------- */
(function(){
var KEY="arabibazi:state",SKEY="arabibazi:sound",root=document.documentElement,$=function(s,r){return(r||document).querySelector(s)};
var reduced=false;try{reduced=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
if(!reduced)root.classList.add("fx");
if((navigator.hardwareConcurrency||8)<=4)root.classList.add("lite"); // FX.lite: no blur on weak devices
function rd(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v&&typeof v==="object"?v:d}catch(e){return d}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
var S=rd(KEY,null)||{};S.v=1;S.prog=S.prog||{};S.wrong=S.wrong||{};S.hist=S.hist||{};S.best=S.best||{};S.ui=S.ui||{};if(!APP.themes[S.theme])S.theme=APP.defTheme;if(S.lang!=="en")S.lang="fa";
if([10,11,12].indexOf(S.grade)<0)S.grade=null;if(typeof S.name!=="string")S.name="";if(!S.dev)S.dev=Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
function save(){wr(KEY,S)}
var SND=rd(SKEY,{on:true,pack:"soft",vol:50,tap:false,vib:true});SFX.set(SND);function saveSnd(){SFX.set(SND);wr(SKEY,SND)}
function gp(g){return S.prog[g]=S.prog[g]||{}}
function gw(g){return S.wrong[g]=S.wrong[g]||[]}
LANG=S.lang;
var GN=function(g){return t("g"+g)};
/* question loading: only the chosen grade is read */
Engine.setLoader(function(g){
 if(APP.target==="standalone"){var el=document.getElementById("q"+g);return el?JSON.parse(el.textContent):[]}
 return fetch("./q"+g+".json").then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})});
/* ---------- theme ---------- */
function nativeBar(color,light){var C=window.Capacitor,P=C&&C.Plugins&&C.Plugins.StatusBar;if(!P||!P.setBackgroundColor)return;
 try{[P.setBackgroundColor({color:color}),P.setStyle({style:light?"LIGHT":"DARK"})].forEach(function(r){r&&r.catch&&r.catch(function(){})})}catch(e){}}
function themeBar(){var th=APP.themes[S.theme]||APP.themes[APP.defTheme];if(th&&!introOn)nativeBar(th[2],th[4])}
function applyTheme(id){root.dataset.theme=id;root.dataset.light=APP.themes[id][4]?"1":"0";var m=$('meta[name="theme-color"]');if(m)m.content=APP.themes[id][2];themeBar();
 document.querySelectorAll(".th").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.id===id)})}
function setTheme(id,ev){if(!APP.themes[id])return;S.theme=id;save();var go=function(){applyTheme(id)};
 if(document.startViewTransition&&!reduced){if(ev&&ev.clientX!=null){root.style.setProperty("--vx",ev.clientX+"px");root.style.setProperty("--vy",ev.clientY+"px")}try{document.startViewTransition(go);return}catch(e){}}go()}
applyTheme(S.theme);applyI18n();
/* ---------- tiny DOM helpers ---------- */
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function rich(e,text){e.textContent="";String(text).split(/(⟪[^⟫]*⟫|＿＿＿)/).forEach(function(p){if(!p)return;
 if(p==="＿＿＿"){e.appendChild(el("span","blank","＿＿＿"))}else if(p.charAt(0)==="⟪"){e.appendChild(el("mark",null,p.slice(1,-1)))}else e.appendChild(document.createTextNode(p))});return e}
function split(q){var i=q.indexOf("\n");return i<0?[q,""]:[q.slice(0,i),q.slice(i+1)]}
var isAr=function(s){return/[ً-ْ]/.test(s)};
/* ---------- dialog (in-app; no alert/confirm) ---------- */
var dlgDone=null;
function dialog(title,msg,btns,extra){return new Promise(function(res){var d=$("#dlg"),c=$("#dlg .card");c.textContent="";c.appendChild(el("h3",null,title));if(msg)c.appendChild(el("p",null,msg));if(extra)c.appendChild(extra);
 var a=el("div","acts");btns.forEach(function(b){var x=el("button","btn"+(b.primary?"":" ghost")+" wide",b.label);x.onclick=function(){close(b.val)};a.appendChild(x)});c.appendChild(a);
 d.hidden=false;$("#dlgScrim").hidden=false;dlgDone=function(){close(null)};setTimeout(function(){var f=a.querySelector("button");f&&f.focus()},30);
 function close(v){d.hidden=true;$("#dlgScrim").hidden=true;dlgDone=null;res(v)}})}
/* ---------- screens ---------- */
var view="home",SES=null,VIEWS=["home","path","farm","league","me"];
function screen(id){["pick","main","play","result"].forEach(function(x){$("#"+x).hidden=x!==id});scrollTo(0,0)}
function boot(){loadPacks();devHash();setTimeout(function(){syncFeed(true)},3500);setTimeout(function(){autoSend("boot")},8000);if(!S.grade){buildPick();screen("pick")}else{showMain()}checkHash();intro(function(){if(S.grade&&!S.ui.tour&&$("#play").hidden)startTour()})}
/* ---------- intro: plays on every launch, 3 s, cannot be skipped (the app gets ready underneath) ---------- */
var introOn=false;
function intro(done){var o=$("#intro");if(!o){done&&done();return}introOn=true;nativeBar("#E357A8",false);o.classList.remove("out");o.hidden=false;
 setTimeout(function(){o.classList.add("out");setTimeout(function(){o.hidden=true;o.classList.remove("out");introOn=false;themeBar();done&&done()},300)},2700)}
/* ---------- first-time tour ---------- */
var TOUR=[["#gradeBadge","tour1"],['.hdr [data-act="settings"]',"tour2"],["#sheet .themes","tour3",1],["#daily","tour4"],["#lrow","tour5"],[".dock","tour6"]],TI=-1;
function startTour(){if(!S.grade||!$("#play").hidden||!$("#result").hidden)return;closeSheet();if(view!=="home")tab("home",1);TI=-1;$("#tour").hidden=false;tourNext()}
function tourNext(){TI++;var s=TOUR[TI];if(!s){endTour();return}if(s[2])openSheet();else if(!$("#sheet").hidden)closeSheet();
 var e=$(s[0]);if(!e){tourNext();return}try{e.scrollIntoView({block:"center"})}catch(x){}
 setTimeout(function(){placeTour(e,s)},s[2]&&!reduced?340:60)}
function box(e,l,tp,w,h){e.style.left=l+"px";e.style.top=tp+"px";e.style.width=Math.max(0,w)+"px";e.style.height=Math.max(0,h)+"px"}
function placeTour(e,s){var r=e.getBoundingClientRect(),W=innerWidth,H=innerHeight,p=6,x=Math.max(4,r.left-p),y=Math.max(4,r.top-p),w=Math.min(W-4,r.right+p)-x,h=Math.min(H-4,r.bottom+p)-y;
 box($("#tour .t-hole"),x,y,w,h);var B=document.querySelectorAll("#tour .t-b");box(B[0],0,0,W,y);box(B[1],0,y+h,W,H-y-h);box(B[2],0,y,x,h);box(B[3],x+w,y,W-x-w,h);
 var cv=$("#tour .t-cover");cv.hidden=!!s[2];box(cv,x,y,w,h);
 var c=$("#tour .t-card"),nb=$('#tour [data-act="tourNext"]');$("#tour .t-tx").textContent=t(s[1]);$("#tour .t-n").textContent=t("tourStep",{i:num(TI+1),n:num(TOUR.length)});
 nb.textContent=TI===TOUR.length-1?t("tourDone"):t("next");$('#tour [data-act="tourSkip"]').textContent=t("tourSkip");
 c.classList.remove("in");c.style.visibility="hidden";var ch=c.offsetHeight,cw=c.offsetWidth,top=y+h+12+ch<H-8?y+h+12:y-12-ch>=8?y-12-ch:H-8-ch;
 c.style.top=top+"px";c.style.left=Math.min(Math.max(12,x+w/2-cw/2),W-12-cw)+"px";c.style.visibility="";void c.offsetWidth;c.classList.add("in");try{nb.focus({preventScroll:true})}catch(x){}}
function endTour(){$("#tour").hidden=true;TI=-1;S.ui.tour=1;save();closeSheet()}
addEventListener("resize",function(){if(!$("#tour").hidden&&TOUR[TI]){var e=$(TOUR[TI][0]);if(e)placeTour(e,TOUR[TI])}});
function buildPick(){var c=$("#pick .gcards");c.textContent="";$("#nm").value=S.name||"";[10,11,12].forEach(function(g){var b=el("button","gcard");b.dataset.act="pickGrade";b.dataset.g=g;
 var n=el("span","gnum",num(g)),tx=el("span");tx.appendChild(el("b",null,GN(g)));tx.appendChild(el("small",null,t("g"+g+"d")));b.appendChild(n);b.appendChild(tx);c.appendChild(b)})}
function header(){$("#gradeBadge span").textContent=t("gradeOf",{g:GN(S.grade)});$("#hName").textContent=S.name||t("app");$("#ava").textContent=(S.name||"؟").trim().charAt(0);
 var n=streakNow(),k=$("#stk");k.querySelector("b").textContent=num(n);k.classList.toggle("hot",n>0);k.classList.toggle("cold",!n);k.setAttribute("aria-label",t("streakT")+": "+t("streakN",{n:num(n)}))}
function showMain(){screen("main");header();tab(view,1);loadGrade()}
function loadGrade(){var g=S.grade,h=$("#lrow");h.textContent="";h.appendChild(el("p","muted",t("loading")));
 Engine.load(g).then(function(){if(g===S.grade){renderHome();renderCount();if(view!=="home")renderView(view);if(!S.ui.tour)setTimeout(function(){if(!S.ui.tour&&!introOn&&$("#tour").hidden&&!$("#main").hidden)startTour()},450)}})
 .catch(function(){Engine.forget(g);h.textContent="";h.appendChild(el("p","muted",t("loadErr")));var b=el("button","btn",t("retry"));b.dataset.act="retry";h.appendChild(b)})}
function chName(g,c){return(APP.chapters[g]||{})[c]||t("chapter")+" "+num(c)}
function chAr(g,c){var l=(APP.lessons[g]||{})[c];return l?l[0]:""}
function chStats(g){var pool=Engine.poolFor(g),p=gp(g);return Engine.chapters(g).map(function(ch){var d=pool.filter(function(q){return q.c===ch.c&&p[q.id]&&p[q.id][0]>0}).length;return{c:ch.c,total:ch.total,done:d,src:ch.src,pc:ch.total?Math.round(d/ch.total*100):0}})}
function bar(pc){var b=el("span","gbar"),i=el("i");b.appendChild(i);requestAnimationFrame(function(){i.style.width=pc+"%"});return b}
var CUBE='<svg class="cube" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="cA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A78BFA" stop-opacity=".9"/><stop offset="1" stop-color="#22D3EE" stop-opacity=".5"/></linearGradient><linearGradient id="cB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C3AED" stop-opacity=".7"/><stop offset="1" stop-color="#0E7490" stop-opacity=".45"/></linearGradient></defs><path d="M60 14 98 34 60 54 22 34Z" fill="url(#cA)"/><path d="M22 34 60 54V98L22 78Z" fill="url(#cB)"/><path d="M98 34 60 54V98L98 78Z" fill="url(#cA)" opacity=".7"/><path d="M60 14 98 34V78L60 98 22 78V34Z" fill="none" stroke="#fff" stroke-opacity=".45"/><path d="M84 6 104 16 84 26 64 16Z" fill="url(#cA)" opacity=".6"/><path d="M12 88 26 95 12 102-2 95Z" fill="url(#cA)" opacity=".5"/></svg>';
function renderHome(){var g=S.grade,st=chStats(g);if(!st.length)return;var last=(S.last||{})[g],cur=st.filter(function(x){return x.c===last})[0]||st.filter(function(x){return x.c!==90&&x.pc<80})[0]||st[0];
 var h=$("#cont");h.textContent="";h.insertAdjacentHTML("beforeend",CUBE);h.appendChild(el("small",null,t("cont")));h.appendChild(el("span","ttl",chName(g,cur.c)));if(chAr(g,cur.c))h.appendChild(el("span","ar",chAr(g,cur.c)));
 h.appendChild(el("span","pct",t("pct",{n:num(cur.pc)})));h.appendChild(bar(cur.pc));var rb=el("button","btn",cur.done?t("resume"):t("startFirst"));rb.dataset.act="start";rb.dataset.m="chapter";rb.dataset.c=cur.c;h.appendChild(rb);
 var d=$("#daily"),today=dayKey(Date.now()),did=(S.day||{})[today];d.textContent="";var b1=el("b",null,t("daily")+" · "),xe=el("em",null,"+"+num(Math.round(120*boostX()))+" XP");xe.dir="ltr";b1.appendChild(xe);d.appendChild(b1);d.appendChild(el("small",null,did?t("dailyDone"):t("dailySub",{x:t("xpAll",{n:num(S.xp||0)})})));
 var ht=el("span","heat");for(var i=20;i>=0;i--){var k=dayKey(Date.now()-i*864e5),v=(S.day||{})[k]||0,c=el("i",v>=100?"on":v>0?"on2":"");ht.appendChild(c)}d.appendChild(ht);
 var r=$("#lrow");r.textContent="";st.forEach(function(x){var b=el("button","glass lcard");b.dataset.act="start";b.dataset.m="chapter";b.dataset.c=x.c;
  b.appendChild(el("span","no",x.c===90?"★":num(String(x.c).padStart(2,"0"))+"."));b.appendChild(el("b",null,chName(g,x.c).replace(/^[^:]*:\s*/,"")));if(chAr(g,x.c))b.appendChild(el("span","ar",chAr(g,x.c)));b.appendChild(bar(x.pc));r.appendChild(b)});
 var m=$("#minis");m.textContent="";var wn=Engine.poolFor(g).filter(function(q){return gw(g).indexOf(q.id)>=0}).length;
 if(wn){m.appendChild(mini("↺",t("mistakes"),t("mistakesN",{n:num(wn)}),{act:"start",m:"review"}))}
 setsFor(g).forEach(function(s){m.appendChild(mini("📝",s.title||t("tSet"),t("tSetSub",{t:s.cs.map(function(c){return t("lessonOf",{n:num(c)})}).join("، "),n:num(s.n)}),{act:"set",id:s.id}))});
 var tip=$("#tip");tip.hidden=!(APP.target==="pwa"&&isIOS()&&!standalone()&&!S.ui.iosTip)}
function mini(ic,title,sub,data){var b=el("button","glass mini");Object.keys(data).forEach(function(k){b.dataset[k]=data[k]});b.appendChild(el("span","ic",ic));var s=el("span");s.appendChild(el("b",null,title));s.appendChild(el("small",null,sub));b.appendChild(s);b.appendChild(el("span",null,"‹"));return b}
function isIOS(){return/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
function standalone(){try{return navigator.standalone===true||matchMedia("(display-mode: standalone)").matches}catch(e){return false}}
function renderCount(){var n=Engine.poolFor(S.grade).filter(function(q){return gw(S.grade).indexOf(q.id)>=0}).length,c=$("#rvCnt");c.hidden=!n;c.textContent=num(n);var f=$("#farmCnt"),hg=farmState().hungry;f.hidden=!hg;f.textContent="!"}
function tab(v,quiet){if(VIEWS.indexOf(v)<0)v="home";var was=view;view=v;VIEWS.forEach(function(x,i){var on=x===v,sec=$("#v-"+x);sec.hidden=!on;sec.classList.toggle("on",on);
  var b=$('.dock [data-v="'+x+'"]');if(on){b.setAttribute("aria-current","page");$(".dock .ind").style.transform="translateX("+(root.dir==="rtl"?-i:i)*100+"%)"}else b.removeAttribute("aria-current")});
 renderView(v);scrollTo(0,0)}
function renderView(v){if(!Engine.poolFor(S.grade).length&&v!=="farm")return;if(v==="home")renderHome();if(v==="path")renderPath();if(v==="farm")renderFarm();if(v==="league")renderLeague();if(v==="me")renderMe()}
function renderPath(){var g=S.grade,box=$("#v-path .path"),st=chStats(g),now=st.filter(function(x){return x.pc<80})[0];box.textContent="";$("#v-path h2").textContent=t("path")+" · "+GN(g);
 st.forEach(function(x){var b=el("button","glass pnode"+(x.pc>=80?" done":x===now?" now":""));b.dataset.act="start";b.dataset.m="chapter";b.dataset.c=x.c;
  b.appendChild(el("span","dot",x.pc>=80?"✓":x.c===90?"★":num(x.c)));var s=el("span");s.appendChild(el("b",null,chName(g,x.c)));if(chAr(g,x.c))s.appendChild(el("span","ar",chAr(g,x.c)));
  s.appendChild(bar(x.pc));s.appendChild(el("small",null,t("progressOf",{a:num(x.done),b:num(x.total)})+" · "+x.src));b.appendChild(s);box.appendChild(b)})}
function renderMe(){var g=S.grade,box=$("#v-me .sx"),p=gp(g),pool=Engine.poolFor(g),ans=0,ok=0,ml=0;box.textContent="";
 var rc=el("div","glass card rcard");rc.appendChild(el("b",null,t("myReport",{n:S.name||"…"})));rc.appendChild(el("p","muted",t("gradeOf",{g:GN(g)})+" · "+t("xpAll",{n:num(S.xp||0)})+" · 🔥"+num(streakNow())));
 var sb=el("button","btn wide",t("sendReport"));sb.dataset.act="sendReport";rc.appendChild(sb);if(SRV&&APP.teacher)rc.appendChild(el("small","muted",t("autoSent")+(S.sentAt?" · "+t("lastSent",{d:new Date(S.sentAt).toLocaleString(LANG==="fa"?"fa-IR":"en-GB",{dateStyle:"short",timeStyle:"short"})}):"")));box.appendChild(rc);
 pool.forEach(function(q){var x=p[q.id];if(x){ans+=x[0]+x[1];ok+=x[0];if(x[0]>0)ml++}});
 var hs=S.hist[g]||[],grid=el("div","stats3");[[t("stAnswered"),ans],[t("stAcc"),ans?Math.round(ok/ans*100)+"٪":"–"],[t("stBest"),S.best[g]||0]].forEach(function(x){var s=el("div","card stat"),b=el("b",null,"");countUp(b,x[1]);s.appendChild(b);s.appendChild(el("small",null,x[0]));grid.appendChild(s)});box.appendChild(grid);
 var cc=el("div","glass card chs");cc.appendChild(el("b",null,t("stMastered")+": "+num(ml)+" / "+num(pool.length)));
 chStats(g).forEach(function(x){var r=el("div","ch");r.appendChild(el("span",null,chName(g,x.c)));r.appendChild(el("span","n",num(x.done)+"/"+num(x.total)));r.appendChild(bar(x.pc));cc.appendChild(r)});box.appendChild(cc);
 var ids=gw(g),list=pool.filter(function(q){return ids.indexOf(q.id)>=0}),rv=el("div","glass card");rv.appendChild(el("b",null,t("mistakes")+" · "+num(list.length)));
 if(!list.length)rv.appendChild(el("p","muted",t("rvEmpty")));else{var pb=el("button","btn wide",t("rvPractice"));pb.dataset.act="start";pb.dataset.m="review";rv.appendChild(pb);
  list.slice(0,40).forEach(function(q){var c=el("div","rq"),s=split(q.q);c.appendChild(el("p","muted",s[0]));if(s[1])c.appendChild(rich(el("p","st"),s[1]));c.appendChild(el("p","ra","✓ "+q.o[q.a]));c.appendChild(el("p","ex",q.e));rv.appendChild(c)})}
 box.appendChild(rv);
 var hc=el("div","glass card");hc.appendChild(el("b",null,t("stLast")+" · "+t("stSessions")+": "+num(hs.length)));
 if(!hs.length)hc.appendChild(el("p","muted",t("stNone")));else{var ul=el("ul","hist");hs.slice(-10).reverse().forEach(function(h){var li=el("li");
  li.appendChild(el("span",null,new Date(h.d).toLocaleDateString(LANG==="fa"?"fa-IR":"en-GB")+" · "+(h.m==="chapter"?chName(g,h.c):h.m==="review"?t("reviewName"):h.m==="set"?t("tSet"):t("mixedName"))));
  li.appendChild(el("b",null,num(h.ok)+"/"+num(h.n)));ul.appendChild(li)});hc.appendChild(ul)}box.appendChild(hc)}
function countUp(e,v){if(typeof v!=="number"||reduced||v<2){e.textContent=typeof v==="number"?num(v):v;return}var t0=performance.now();(function f(n){var k=Math.min(1,(n-t0)/600);e.textContent=num(Math.round(v*k*(2-k)));if(k<1)requestAnimationFrame(f)})(t0)}
function toast(msg){var o=$(".toast");if(o)o.remove();var d=el("div","toast",msg);d.setAttribute("role","status");document.body.appendChild(d);setTimeout(function(){d.remove()},2200)}
/* ---------- days, streak (Fridays never break it), XP ---------- */
function dayKey(ms){var d=new Date(ms);return d.getFullYear()*1e4+(d.getMonth()+1)*100+d.getDate()}
function keyMs(k){return new Date(Math.floor(k/1e4),Math.floor(k/100)%100-1,k%100,12).getTime()}
function missed(fromK,toK){var n=0,ms=keyMs(fromK)+864e5,end=keyMs(toK);while(ms<end-36e5){if(new Date(ms).getDay()!==5)n++;ms+=864e5}return n}
function stk(){return S.stk=S.stk||{n:0,last:0,fz:0}}
function streakNow(){var s=stk();if(!s.last||!s.n)return 0;var m=missed(s.last,dayKey(Date.now()));return m<=s.fz?s.n:0}
function bumpStreak(){var s=stk(),today=dayKey(Date.now());if(s.last===today)return s.n;var m=s.last?missed(s.last,today):0;
 if(!s.last||m>s.fz){s.n=1;s.fz=s.last&&m>s.fz?0:s.fz}else{s.fz-=m;s.n++}s.last=today;if(s.n%7===0)s.fz=Math.min(2,s.fz+1);return s.n}
function boostX(){var b=S.boost;return b&&b.until>Date.now()?b.x:1}
/* ---------- practice: 10-question sprint, answers saved & locked, revealed at the end ---------- */
var LET={fa:["الف","ب","ج","د"],en:["A","B","C","D"]},tick=0;
function pickSet(g,cs,n){var pool=Engine.poolFor(g).filter(function(q){return cs.indexOf(q.c)>=0}).slice();for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),x=pool[i];pool[i]=pool[j];pool[j]=x}return pool.slice(0,n)}
function start(mode,c,set){var g=S.grade;Engine.load(g).then(function(){if(g!==S.grade)return;
 var qs=set?pickSet(g,set.cs,set.n):Engine.session(g,mode,mode==="chapter"?c:mode==="review"?gw(g):null,gp(g),null,10);if(!qs.length)return;
 if(mode==="chapter"){S.last=S.last||{};S.last[g]=c;save()}
 SES={g:g,mode:mode,c:c,set:set?set.id:null,qs:qs,i:0,ok:0,bad:0,streak:0,t0:Date.now(),answered:false,sel:null,picks:[]};screen("play");renderQ();
 clearInterval(tick);tick=setInterval(function(){if(!SES||$("#play").hidden){clearInterval(tick);return}var s=Math.round((Date.now()-SES.t0)/1000);$("#pTime").textContent="⏱ "+num(String(Math.floor(s/60)).padStart(2,"0"))+":"+num(String(s%60).padStart(2,"0"))},1000)})}
function renderQ(){var q=SES.qs[SES.i];if(!q||q.g!==S.grade||SES.g!==S.grade){SES=null;showMain();return}
 SES.answered=false;SES.sel=null;var s=split(q.q),n=SES.qs.length;$("#pT").textContent=num(String(SES.i+1).padStart(2,"0"))+"/"+num(String(n).padStart(2,"0"))+" · "+t("sprint");
 var sg=$("#pSeg");sg.style.gridTemplateColumns="repeat("+n+",1fr)";sg.textContent="";for(var k=0;k<n;k++)sg.appendChild(el("i",k<SES.i?"on":k===SES.i?"cur":""));
 $("#qTag").textContent=q.c===90?t("teacherQs"):(chName(S.grade,q.c).split(":")[0]);$("#qP").textContent=s[0];var st=rich($("#qS"),s[1]);st.hidden=!s[1];st.classList.toggle("long",s[1].length>34);
 var o=$("#qO");o.textContent="";q.o.forEach(function(x,i){var b=el("button","opt glass"+(isAr(x)?" ar":""));b.dataset.act="ans";b.dataset.i=i;b.appendChild(el("span","k",LET[LANG][i]));b.appendChild(el("span","tx",x));b.appendChild(el("span","mk",""));o.appendChild(b)});
 $("#qF").hidden=true;var nb=$("#qN");nb.disabled=false;nb.textContent=S.ui.instant?t("next"):SES.i+1<n?t("lock"):t("lockLast");nb.hidden=!!S.ui.instant;
 $("#pFoot").textContent=S.ui.instant?t("pfootI"):t("pfoot");var qt=$("#qTip");qt.hidden=!!S.ui.qtip;if(!S.ui.qtip)qt.textContent=t("qTip");$("#qC").scrollIntoView({block:"nearest"})}
function record(i){var q=SES.qs[SES.i],ok=i===q.a,g=SES.g,p=gp(g),x=p[q.id]||[0,0],w=gw(g),k=w.indexOf(q.id);x[ok?0:1]++;p[q.id]=x;
 if(ok){if(k>=0)w.splice(k,1);SES.ok++;SES.streak++;if(SES.streak>(S.best[g]||0))S.best[g]=SES.streak}else{if(k<0)w.push(q.id);SES.bad++;SES.streak=0}SES.picks[SES.i]=i;save();return ok}
function choose(i){if(!SES||SES.answered)return;var q=SES.qs[SES.i];if(q.g!==S.grade)return;if(!S.ui.qtip){S.ui.qtip=1;save();$("#qTip").hidden=true}
 if(S.ui.instant){answer(i);return}SES.sel=i;document.querySelectorAll("#qO .opt").forEach(function(b,j){b.classList.toggle("sel",j===i);b.setAttribute("aria-pressed",j===i)});SFX.play("tap")}
function lock(){if(!SES||SES.answered)return;if(S.ui.instant){next();return}if(SES.sel==null){toast(t("pickFirst"));return}SES.answered=true;record(SES.sel);$("#qN").disabled=true;SFX.play("tap");SFX.vibrate(15);
 setTimeout(function(){SES.i++;if(SES.i>=SES.qs.length)reveal();else renderQ()},reduced?0:180)}
function answer(i){var q=SES.qs[SES.i];SES.answered=true;var ok=record(i);
 document.querySelectorAll("#qO .opt").forEach(function(b,j){b.disabled=true;if(j===q.a){b.classList.add("ok");b.querySelector(".mk").textContent=t("right")}else if(j===i){b.classList.add("bad");b.querySelector(".mk").textContent=t("wrong")}else b.classList.add("dim")});
 var f=$("#qF");f.className="fb "+(ok?"ok":"bad");f.textContent="";f.appendChild(el("h3",null,ok?(SES.streak>=5&&SES.streak%5===0?t("streakMsg",{n:num(SES.streak)}):t("rightT")):t("wrongT")));
 if(!ok)f.appendChild(el("p",null,t("correctAns",{a:q.o[q.a]})));f.appendChild(el("p",null,q.e));f.appendChild(el("p","src",q.src));f.hidden=false;
 var n=$("#qN");n.textContent=SES.i+1<SES.qs.length?t("next"):t("finish");n.hidden=false;
 if(ok)SFX.play(SES.streak>=5&&SES.streak%5===0?"streak":"correct");else{SFX.play("wrong");SFX.vibrate(60)}
 setTimeout(function(){n.focus({preventScroll:true});f.scrollIntoView({block:"nearest",behavior:reduced?"auto":"smooth"})},40)}
function next(){if(!SES||!SES.answered)return;SES.i++;if(SES.i>=SES.qs.length)reveal();else renderQ()}
function reveal(){var s=SES,g=s.g,ms=Date.now()-s.t0,n=s.qs.length,h=S.hist[g]=S.hist[g]||[];clearInterval(tick);
 h.push({d:Date.now(),m:s.mode,c:s.c||null,ok:s.ok,n:n,ms:ms,set:s.set||undefined});if(h.length>30)h.splice(0,h.length-30);
 var sk=bumpStreak(),base=s.ok*10,perf=s.ok===n&&n>=5?20:0,sb=Math.min(sk,7)*2,bx=boostX(),tot=Math.round((base+perf+sb)*bx),feed=s.ok+(perf?5:0),today=dayKey(Date.now());
 S.xp=(S.xp||0)+tot;S.day=S.day||{};S.day[today]=(S.day[today]||0)+tot;Object.keys(S.day).forEach(function(k){if(+k<dayKey(Date.now()-60*864e5))delete S.day[k]});
 var F=farm();F.feed+=feed;F.last=Date.now();S.mbxD=Date.now();save();
 screen("result");var pc=Math.round(s.ok/n*100),C=2*Math.PI*64,fg=$("#rR .fg");$("#rR text").textContent=num(pc)+"٪";fg.style.strokeDasharray=C;fg.style.strokeDashoffset=C;
 requestAnimationFrame(function(){requestAnimationFrame(function(){fg.style.strokeDashoffset=C*(1-pc/100)})});
 $("#rOk").textContent=num(s.ok);$("#rBad").textContent=num(s.bad);var sec=Math.round(ms/1000);$("#rT").textContent=num(Math.floor(sec/60))+":"+num(String(sec%60).padStart(2,"0"));
 var xb=$("#rXP");xb.textContent="";var row=function(a,b,c){var d=el("div",c),v=el("b",null,b);v.dir="ltr";d.appendChild(el("span",null,a));d.appendChild(v);xb.appendChild(d)};
 row(t("xpBase")+" ("+num(s.ok)+"×۱۰)","+"+num(base));if(perf)row(t("xpPerfect"),"+"+num(perf));row(t("xpStreak")+" 🔥"+num(sk),"+"+num(sb));if(bx>1)row(t("xpBoost"),"×"+num(bx));row(t("xpTotal"),"+"+num(tot)+" XP","tot");row(t("feedGot",{n:num(feed)}),"🐑","feed");
 var L=$("#rList");L.textContent="";s.qs.forEach(function(q,i){var pk=s.picks[i],ok=pk===q.a,c=el("div","glass rq "+(ok?"ok":"bad")),hd=el("div","hd"),sp=split(q.q);
  hd.appendChild(el("i",null,ok?"✓":"✗"));hd.appendChild(el("span",null,num(i+1)+". "+sp[0]));c.appendChild(hd);if(sp[1])c.appendChild(rich(el("p","st"),sp[1]));
  c.appendChild(el("p","ya",t("yourAns")+": "+(pk==null?t("noAns"):q.o[pk])));if(!ok)c.appendChild(el("p","ra",t("rightAns")+": "+q.o[q.a]));c.appendChild(el("p","ex",q.e));L.appendChild(c)});
 $("#rRv").hidden=!s.bad;SFX.play(perf?"streak":"end");header();autoSend("end")}
/* ---------- scratchpad ---------- */
var padCtx=null,padDraw=false;
function padToggle(){var p=$("#pad");p.hidden=!p.hidden;if(!p.hidden){var c=$("#padC"),r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;if(c.width!==Math.round(r.width*d)){c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);padCtx=c.getContext("2d");padCtx.scale(d,d);padCtx.lineWidth=2.6;padCtx.lineCap="round";padCtx.lineJoin="round";padCtx.strokeStyle="#1F3A9F"}}}
(function(){var c=$("#padC"),pt=function(e){var r=c.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
 c.addEventListener("pointerdown",function(e){if(!padCtx)return;padDraw=true;c.setPointerCapture(e.pointerId);var p=pt(e);padCtx.beginPath();padCtx.moveTo(p[0],p[1])});
 c.addEventListener("pointermove",function(e){if(!padDraw)return;var p=pt(e);padCtx.lineTo(p[0],p[1]);padCtx.stroke()});
 ["pointerup","pointercancel"].forEach(function(x){c.addEventListener(x,function(){padDraw=false})})})();
function padClear(){var c=$("#padC");if(padCtx)padCtx.clearRect(0,0,c.width,c.height)}
/* ---------- pixel-art farm: right answers become feed; skipped days make it wilt ---------- */
var AN=[["sheep","aSheep","🐑",1],["cow","aCow","🐄",1],["cat","aCat","🐈",1],["hen","aHen","🐓",2],["horse","aHorse","🐎",3],["peacock","aPeacock","🦚",4]];
function farm(){var F=S.farm=S.farm||{feed:5,lvl:1,an:{},ht:Date.now(),last:Date.now()};AN.forEach(function(a){if(a[3]<=F.lvl&&F.an[a[0]]==null)F.an[a[0]]=80});return F}
function farmState(){var F=farm(),now=Date.now(),d=(now-F.ht)/864e5;if(d>.04){Object.keys(F.an).forEach(function(k){F.an[k]=Math.max(0,Math.round(F.an[k]-15*d))});F.ht=now;save()}
 var idle=Math.floor((now-F.last)/864e5),hungry=Object.keys(F.an).some(function(k){return F.an[k]<40});return{F:F,idle:idle,sad:idle>=3,hungry:hungry}}
var farmRaf=0;
function renderFarm(){var st=farmState(),F=st.F,box=$("#v-farm .farm");box.textContent="";
 if(st.sad||st.hungry)box.appendChild(el("p","warn",t("farmHungry")));
 var fb=el("div","glass farmbox"),cv=el("canvas");cv.width=160;cv.height=96;fb.appendChild(cv);box.appendChild(fb);
 var inv=el("div","inv");inv.appendChild(el("span",null,t("farmFeedN",{n:num(F.feed)})));inv.appendChild(el("span",null,"🏠 "+t("farmLvl",{n:num(F.lvl)})));box.appendChild(inv);
 var list=el("div","anl");AN.filter(function(a){return a[3]<=F.lvl}).forEach(function(a){var h=F.an[a[0]],r=el("div","glass an"+(h<40?" sad":""));r.appendChild(el("span","ic",a[2]));
  var mid=el("span");mid.appendChild(el("b",null,t(a[1])));var hb=el("span","hb"),i=el("i");i.style.width=h+"%";hb.appendChild(i);mid.appendChild(hb);mid.appendChild(el("small",null,t("happy")+" "+num(h)+"٪"));r.appendChild(mid);
  var b=el("button","pill",t("farmFeed"));b.dataset.act="feed";b.dataset.a=a[0];r.appendChild(b);list.appendChild(r)});box.appendChild(list);
 var cost=30*F.lvl;if(F.lvl<4){var ub=el("button","btn ghost wide",t("farmUp",{n:num(cost)}));ub.dataset.act="farmUp";ub.disabled=F.feed<cost;ub.style.marginTop="10px";box.appendChild(ub)}
 box.appendChild(el("p","note",t("farmHow")));
 var ctx=cv.getContext("2d");cancelAnimationFrame(farmRaf);var t0=0;(function loop(ts){if($("#v-farm").hidden||!cv.isConnected)return;if(ts-t0>140||!t0){t0=ts;drawFarm(ctx,st,ts)}if(!reduced)farmRaf=requestAnimationFrame(loop)})(0)}
function drawFarm(c,st,ts){var F=st.F,sad=st.sad,P=function(x,y,w,h,col){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)},fr=Math.floor((ts||0)/420)%2;
 P(0,0,160,96,sad?"#A7B0BA":"#8FD3F4");if(!sad){P(128,8,10,10,"#FFE066");P(126,11,14,4,"#FFE066");P(131,6,4,14,"#FFE066")}else{P(110,8,30,6,"#7E8791");P(114,5,20,4,"#7E8791")}
 P(20,12,22,5,"#FFFFFF");P(24,9,12,4,"#FFFFFF");P(70,18,18,4,"#F1F7FF");
 P(0,52,160,44,sad?"#9C9A6B":"#5DBB63");P(0,50,160,3,sad?"#8A8858":"#4FA856");for(var x=4;x<160;x+=12){P(x,44,2,10,"#8B5A2B")}P(0,46,160,2,"#A0522D");P(0,50,160,1,"#A0522D");
 P(8,26,30,24,"#C0392B");for(var i=0;i<9;i++)P(8+i*2,26-i,30-i*4,1,"#922B21");P(18,36,10,14,"#F5E6D3");P(18,36,10,1,"#7B3F00");P(22,36,2,14,"#7B3F00");P(13,30,4,4,"#F5E6D3");
 for(var k=0;k<F.lvl;k++)P(10+k*4,22-1,2,2,"#FFD166");
 for(var r=0;r<3;r++)for(var s=0;s<9;s++){var cx=120+s*4,cy=62+r*9;if(sad){P(cx,cy+2,1,5,"#8D6E4A");P(cx+1,cy+2,2,1,"#8D6E4A")}else{P(cx,cy,1,6,"#6FA84F");P(cx-1,cy-2+((s+fr)%2),3,3,"#E9C46A")}}
 var spots=[[48,60],[76,70],[56,78],[96,58],[30,74],[100,78]];
 AN.filter(function(a){return a[3]<=F.lvl}).forEach(function(a,i){var h=F.an[a[0]],down=h<40||sad,b=down?0:(fr+i)%2,p=spots[i];SPR[a[0]](P,p[0],p[1]-b,down);
  if(!down&&h>85&&fr===i%2){P(p[0]+4,p[1]-9,2,2,"#FF5D8F");P(p[0]+7,p[1]-9,2,2,"#FF5D8F");P(p[0]+5,p[1]-8,3,2,"#FF5D8F")}if(down){P(p[0]+12,p[1]-8,3,1,"#FFFFFF");P(p[0]+14,p[1]-7,1,1,"#FFFFFF");P(p[0]+12,p[1]-6,3,1,"#FFFFFF")}})}
var SPR={sheep:function(P,x,y,d){var w=d?"#C9C9C9":"#F4F4F4";P(x,y,10,6,w);P(x+1,y-1,8,1,w);P(x,y+6,10,1,w);P(x+10,y+1,3,4,"#333");P(x+11,y+2,1,1,"#FFF");[1,3,6,8].forEach(function(k){P(x+k,y+7,1,2,"#333")})},
 cow:function(P,x,y,d){var w=d?"#D6D6D6":"#FFFFFF";P(x,y,13,7,w);P(x+2,y+1,3,2,"#222");P(x+7,y+3,3,3,"#222");P(x+13,y-1,4,5,w);P(x+15,y+2,2,2,"#F2A0A0");P(x+14,y,1,1,"#000");P(x+13,y-2,1,1,"#D9C7A0");P(x+16,y-2,1,1,"#D9C7A0");[1,3,9,11].forEach(function(k){P(x+k,y+7,1,3,"#555")});P(x-1,y+1,1,4,"#555")},
 cat:function(P,x,y,d){var o=d?"#B98A5C":"#F29B38";P(x,y+2,7,4,o);P(x+7,y,4,4,o);P(x+7,y-1,1,1,o);P(x+10,y-1,1,1,o);P(x+9,y+1,1,1,"#000");P(x+2,y+2,1,4,"#C46F1B");P(x+4,y+2,1,4,"#C46F1B");P(x-1,y-1,1,4,o);[0,2,5,6].forEach(function(k){P(x+k,y+6,1,2,o)})},
 hen:function(P,x,y,d){P(x,y,6,5,d?"#D8D8D8":"#FFFFFF");P(x+5,y-2,3,3,d?"#D8D8D8":"#FFFFFF");P(x+6,y-3,2,1,"#E63946");P(x+8,y-1,1,1,"#F4A261");P(x+6,y-1,1,1,"#000");P(x+2,y+5,1,2,"#F4A261");P(x+4,y+5,1,2,"#F4A261")},
 horse:function(P,x,y,d){var b=d?"#8E7A66":"#8B5A2B";P(x,y,13,6,b);P(x+11,y-4,3,5,b);P(x+12,y-6,5,3,b);P(x+13,y-5,1,1,"#000");P(x+10,y-5,2,6,"#3E2412");[1,3,9,11].forEach(function(k){P(x+k,y+6,1,5,b)});P(x-1,y+1,1,5,"#3E2412")},
 peacock:function(P,x,y,d){var cs=d?["#7D8B8F","#9AA4A8"]:["#1B998B","#2EC4B6","#3A86FF"];for(var i=0;i<7;i++){P(x-4+i*2,y-8+Math.abs(3-i),2,9-Math.abs(3-i),cs[i%cs.length]);P(x-4+i*2,y-8+Math.abs(3-i),2,1,d?"#9AA4A8":"#FFD166")}P(x+2,y,5,4,d?"#5C6B70":"#1D4ED8");P(x+6,y-3,2,4,d?"#5C6B70":"#1D4ED8");P(x+7,y-4,1,1,"#FFD166")}};
function feed(a){var F=farm();if(F.feed<1){toast(t("farmNoFeed"));return}F.feed--;F.an[a]=Math.min(100,(F.an[a]||0)+20);save();SFX.play("correct");var x=AN.filter(function(z){return z[0]===a})[0];toast(t("fedMsg",{a:t(x[1])}));renderFarm();renderCount()}
function farmUp(){var F=farm(),cost=30*F.lvl;if(F.feed<cost||F.lvl>=4)return;F.feed-=cost;F.lvl++;farm();save();SFX.play("streak");var nw=AN.filter(function(a){return a[3]===F.lvl})[0];if(nw)toast(t("farmNew",{a:t(nw[1])+" "+nw[2]}));renderFarm()}
/* ---------- streak, chart and the teacher's league ---------- */
function renderLeague(){var g=S.grade,box=$("#v-league .lg");box.textContent="";var s=stk(),n=streakNow();
 var sc=el("div","glass bigstk");sc.appendChild(el("span","f",n?"🔥":"🪵"));sc.appendChild(el("b",null,t("streakT")+": "+t("streakN",{n:num(n)})));sc.appendChild(el("small",null,t("streakSub")));sc.appendChild(el("small",null,t("freezes",{n:num(s.fz||0)})+" · "+t("freezeHow")));box.appendChild(sc);
 var ch=el("div","glass chart");ch.appendChild(el("b",null,t("chartT")));ch.insertAdjacentHTML("beforeend",chartSVG());ch.appendChild(el("small","muted",t("xpAll",{n:num(S.xp||0)})));box.appendChild(ch);
 if(boostX()>1){var bt=el("span","boost",t("lgBoost",{x:num(boostX()),d:new Date(S.boost.until).toLocaleDateString(LANG==="fa"?"fa-IR":"en-GB")}));box.appendChild(bt)}
 var L=(S.lg||{})[g],lc=el("div","glass card");lc.style.marginTop="12px";lc.appendChild(el("b",null,t("lgSeason",{g:GN(g)})));
 if(!L){lc.appendChild(el("p","muted",t("lgNone")))}else{var left=L.e-Date.now();lc.appendChild(el("p","muted",left>0?t("lgEnds",{d:num(Math.floor(left/864e5)),h:num(Math.floor(left%864e5/36e5))}):t("lgEnded")));
  var me=-1,tb=el("div","lgt");L.rows.slice(0,20).forEach(function(r,i){var you=mine(r),row=el("div","lgr"+(you?" me":""));if(you)me=i;row.appendChild(el("span","rk",["🥇","🥈","🥉"][i]||num(i+1)));
   row.appendChild(el("span",null,r[0]+(you?" ("+t("lgYou")+")":"")));row.appendChild(el("b",null,num(r[1])+" XP"));tb.appendChild(row)});lc.appendChild(tb);
  if(me<0){L.rows.forEach(function(r,i){if(mine(r))me=i})}if(me>=0)lc.appendChild(el("p","muted",t("lgRank",{r:num(me+1),n:num(L.rows.length)})));lc.appendChild(el("small","muted",t("lgAt",{d:new Date(L.at).toLocaleDateString(LANG==="fa"?"fa-IR":"en-GB")})))}
 var pr=el("div","link"),pi=el("input","inp");pi.id="lgIn";pi.placeholder=t("lgPaste");pi.dir="ltr";var pb=el("button","btn ghost",t("add"));pb.dataset.act="addLeague";pr.appendChild(pi);pr.appendChild(pb);pr.style.marginTop="10px";lc.appendChild(pr);box.appendChild(lc)}
var WD={fa:["ی","د","س","چ","پ","ج","ش"],en:["S","M","T","W","T","F","S"]};
function chartSVG(){var W=320,H=150,px=18,days=[],mx=0;for(var i=13;i>=0;i--){var ms=Date.now()-i*864e5,v=(S.day||{})[dayKey(ms)]||0;days.push([ms,v]);if(v>mx)mx=v}
 var sx=function(i){return px+i*(W-2*px)/13},sy=function(v){return H-30-(mx?v/mx*(H-62):0)},pts=days.map(function(d,i){return[sx(i),sy(d[1])]});
 var o='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+t("chartT")+'"><defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#7C3AED"/><stop offset="1" stop-color="#22D3EE"/></linearGradient></defs>';
 o+='<path class="ln" d="M'+pts.map(function(p){return p[0].toFixed(1)+" "+p[1].toFixed(1)}).join(" L")+'"/>';
 days.forEach(function(d,i){var p=pts[i],v=d[1],prev=i?days[i-1][1]:0,nx=i<13?days[i+1][1]:0,ic="";
  o+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(v?3:2)+'" fill="'+(v?"#22D3EE":"#5B5B7A")+'"/>';
  if(v&&v===mx)ic='<text class="pbt" x="'+p[0]+'" y="'+(p[1]-22)+'" text-anchor="middle">★ '+t("pb")+'</text>';
  else if(v&&i>=2&&v>prev&&prev>days[i-2][1]&&!(nx>v))ic='<text class="ic" x="'+p[0]+'" y="'+(p[1]-8)+'" text-anchor="middle">🚀</text>';
  else if(!v&&prev&&nx)ic='<text class="ic" x="'+p[0]+'" y="'+(p[1]-6)+'" text-anchor="middle">😵‍💫</text>';
  else if(v>=100)ic='<text class="ic" x="'+p[0]+'" y="'+(p[1]-8)+'" text-anchor="middle">🏅</text>';
  o+=ic+'<text x="'+p[0]+'" y="'+(H-8)+'" text-anchor="middle">'+WD[LANG][new Date(d[0]).getDay()]+'</text>'});
 return o+"</svg>"}
function setsFor(g){var o=S.sets||{};return Object.keys(o).map(function(k){return o[k]}).filter(function(s){return s.g===g}).sort(function(a,b){return b.at-a.at}).slice(0,3)}

/* ---------- mailbox: report cards go to the teacher by themselves; the teacher's questions, league and tests arrive by themselves ---------- */
var SRV=APP.server||null,feedBusy=false,sendBusy=false;
function devHash(){if(S.devh||!window.crypto||!crypto.subtle)return;crypto.subtle.digest("SHA-256",AB.te.encode("arabibazi:"+S.dev)).then(function(b){S.devh=AB.b64u(b).slice(0,16);save()}).catch(function(){})}
function mine(r){return!!r&&(r[2]===S.devh||r[2]===S.dev)}
// text/plain: no extra "preflight" round trip, and it still goes out while the app is closing (keepalive)
function post(path,o,keep){return fetch(SRV+path,{method:"POST",headers:{"content-type":"text/plain;charset=UTF-8"},body:JSON.stringify(o),keepalive:!!keep}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})}
function srvSend(keep){if(!SRV||!APP.teacher||!AB.ok||!S.name)return Promise.reject(new Error("off"));if(!S.mbx){S.mbx=AB.rand(18);save()}var t0=Date.now();sendBusy=true;
 return buildReport().then(function(r){return AB.seal(r,APP.teacher.dh)}).then(function(c){return post("r",{s:S.mbx,c:c},keep)})
  .then(function(){sendBusy=false;S.sentAt=t0;save();return true},function(e){sendBusy=false;throw e})}
// sent by itself after a sprint (at most every 20 min) and when the app is closed or opened (at most every 3 min), only if there is new progress
function unsent(){return(S.mbxD||0)>(S.sentAt||0)||(!S.sentAt&&(S.xp||0)>0)}
function autoSend(why){if(!SRV||!APP.teacher||!AB.ok||!S.name||sendBusy||!unsent())return;if(Date.now()-(S.sentAt||0)<(why==="end"?12e5:18e4))return;
 srvSend(why==="hide").then(function(){if(view==="me"&&!document.hidden)renderMe()}).catch(function(){})}
function syncFeed(force){if(!SRV||!APP.teacher||!AB.ok||feedBusy||!S.grade)return;if(!force&&Date.now()-(S.feedAt||0)<90000)return;feedBusy=true;
 var g=S.grade,fs=S.fsv||{},since=+fs[g]||0,all=[],pages=0;
 function more(){return fetch(SRV+"f?g="+g+"&since="+since,{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(o){var L=o&&Array.isArray(o.items)?o.items:[];
   L.forEach(function(x){if(x&&+x.at>since)since=+x.at;all.push(x)});if(o&&o.more&&L.length&&++pages<10)return more()})}
 more().then(function(){var seen=S.feedSeen||[],todo=all.filter(function(x){return x&&x.c&&seen.indexOf(x.id+":"+x.at)<0});
  return todo.reduce(function(p,x){return p.then(function(acc){return importPack(String(x.c)).then(function(r){acc.push(r);return acc},function(){return acc})})},Promise.resolve([])).then(function(rs){
   todo.forEach(function(x){seen.push(x.id+":"+x.at)});S.feedSeen=seen.slice(-200);fs[g]=since;S.fsv=fs;S.feedAt=Date.now();save();var q=0,parts=[];
   rs.forEach(function(r){q+=r.mine||0;if(r.set===S.grade&&parts.indexOf(t("tSet"))<0)parts.push(t("tSet"));if(r.league===S.grade&&parts.indexOf(t("league"))<0)parts.push(t("league"))});if(q)parts.unshift(t("feedQ",{n:num(q)}));
   if(parts.length){toast("📬 "+t("feedNew")+": "+parts.join("، "));renderHome();renderCount();if(view!=="home")renderView(view)}})})
 .catch(function(){}).then(function(){feedBusy=false})}
document.addEventListener("visibilitychange",function(){if(document.hidden)autoSend("hide");else syncFeed(false)});
addEventListener("pagehide",function(){autoSend("hide")});
/* ---------- report card for the teacher (sealed: only the teacher panel can open it) ---------- */
function ensureName(){if(S.name)return Promise.resolve(S.name);var box=el("label","namebox"),inp=el("input");inp.maxLength=40;inp.placeholder=t("namePh");box.appendChild(inp);
 setTimeout(function(){inp.focus()},60);return dialog(t("nameSec"),t("nameNeed"),[{label:t("save"),val:1,primary:true},{label:t("cancel"),val:0}],box).then(function(v){var n=inp.value.trim().replace(/\s+/g," ").slice(0,40);if(!v||n.length<2)return"";S.name=n;save();return n})}
function buildReport(){var gs=[10,11,12].filter(function(g){return g===S.grade||Object.keys(S.prog[g]||{}).length||(S.hist[g]||[]).length});
 return Promise.all(gs.map(function(g){return Engine.load(g).catch(function(){})})).then(function(){var gr={};
  gs.forEach(function(g){var p=gp(g),pool=Engine.poolFor(g),ch={},ans=0,ok=0;
   Engine.chapters(g).forEach(function(c){ch[c.c]=[0,c.total,0,0]});
   pool.forEach(function(q){var x=p[q.id],r=ch[q.c];if(!x||!r)return;if(x[0]>0)r[0]++;r[2]+=x[0];r[3]+=x[1];ans+=x[0]+x[1];ok+=x[0]});
   gr[g]={ch:ch,ans:ans,ok:ok,ses:(S.hist[g]||[]).length,best:S.best[g]||0,wr:gw(g).length,
    last:(S.hist[g]||[]).slice(-10).map(function(h){return[h.d,h.m==="chapter"?h.c:h.m==="review"?"r":"m",h.ok,h.n,Math.round(h.ms/1000)]})}});
  return {v:1,t:"r",id:S.dev,n:S.name,g:S.grade,at:Date.now(),ver:APP.version,gr:gr,xp:S.xp||0,stk:streakNow(),day:Object.keys(S.day||{}).map(function(k){return[+k,S.day[k]]})}})}
function shareLink(title,url){var C=window.Capacitor,P=C&&C.Plugins&&C.Plugins.Share;
 if(P&&P.share)return P.share({title:title,text:title,url:url,dialogTitle:title}).catch(function(){showLink(url)});
 if(navigator.share)return navigator.share({title:title,text:title,url:url}).catch(function(e){if(!e||e.name!=="AbortError")showLink(url)});
 showLink(url)}
function copyText(s){function legacy(){try{var ta=document.createElement("textarea");ta.value=s;ta.setAttribute("readonly","");ta.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none";document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,s.length);var ok=document.execCommand("copy");ta.remove();return ok}catch(e){return false}}
 try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(s).then(function(){return true},function(){return legacy()})}catch(e){}return Promise.resolve(legacy())}
function copyInto(btn,text,node){copyText(text).then(function(ok){if(ok){btn.textContent=t("copied");return}if(node){try{var r=document.createRange();r.selectNodeContents(node);var sel=getSelection();sel.removeAllRanges();sel.addRange(r)}catch(e){}}btn.textContent=t("copyManual")})}
function showLink(url){var box=el("div","link"),cd=el("code",null,url),cb=el("button","btn",t("copy"));cb.onclick=function(){copyInto(cb,url,cd)};
 box.appendChild(cd);box.appendChild(cb);dialog(t("linkReady"),t("linkHelp"),[{label:t("close"),val:1}],box)}
var sendingReport=false;
function sendReport(){if(sendingReport)return;if(!APP.teacher||!AB.ok){dialog(t("noTeacherT"),t("noTeacherM"),[{label:t("ok2"),val:1,primary:true}]);return}
 if(SRV){ensureName().then(function(n){if(!n)return;sendingReport=true;return srvSend(false).then(function(){sendingReport=false;dialog(t("sentT"),t("sentOk"),[{label:t("ok2"),val:1,primary:true}]);if(view==="me")renderMe()},function(){sendingReport=false;linkReport()})});return}
 linkReport()}
function linkReport(){ensureName().then(function(n){if(!n)return;sendingReport=true;return buildReport().then(function(r){return AB.seal(r,APP.teacher.dh)})
  .then(function(code){sendingReport=false;shareLink(t("reportShareT",{n:S.name,g:GN(S.grade)}),APP.site+"t/#r="+code)})}).catch(function(){sendingReport=false})}
/* ---------- teacher question packs: accepted only if signed with the teacher's key ---------- */
var PKEY="arabibazi:packs";
function okQ(q,pid){var ar=/[يك]/g;if(!q||typeof q!=="object")return null;var g=q.g;if([10,11,12].indexOf(g)<0)return null;
 if(typeof q.id!=="string"||q.id.indexOf(g+"-teacher-"+pid+"-")!==0)return null;if(!Array.isArray(q.o)||q.o.length!==4)return null;
 var o=q.o.map(function(x){return String(x).replace(ar,function(c){return c==="ي"?"ی":"ک"}).slice(0,200)});if(new Set(o).size!==4)return null;
 if(!(q.a>=0&&q.a<4&&Math.floor(q.a)===q.a))return null;var tx=function(v,n){return String(v||"").replace(ar,function(c){return c==="ي"?"ی":"ک"}).slice(0,n)};
 var qq=tx(q.q,600),e=tx(q.e,600),src=tx(q.src,120);if(!qq.trim()||!e.trim()||!src.trim())return null;
 return {id:q.id,g:g,s:"arabic",c:90,t:"mcq",q:qq,o:o,a:q.a,e:e,src:src}}
function loadPacks(){var P=rd(PKEY,{}),all=[];Object.keys(P).forEach(function(k){(P[k].qs||[]).forEach(function(q){all.push(q)})});Engine.setExtra(all)}
function packCode(text){var m=String(text).match(/#p=([A-Za-z0-9_-]+)/);if(m)return m[1];var t2=String(text).trim();return/^[A-Za-z0-9_-]{100,}$/.test(t2)?t2:null}
function importPack(code){if(!APP.teacher||!AB.ok)return Promise.reject(new Error("noteacher"));
 return AB.verify(code,APP.teacher.sig).then(function(p){if(p&&p.t==="l")return importLeague(p);if(p&&p.t==="s")return importSet(p);
  if(!p||p.t!=="p"||typeof p.id!=="string"||!/^[A-Za-z0-9_-]{4,24}$/.test(p.id)||!Array.isArray(p.qs))throw new Error("shape");
  var qs=p.qs.slice(0,600).map(function(q){return okQ(q,p.id)}).filter(Boolean);if(!qs.length)throw new Error("empty");
  var P=rd(PKEY,{});P[p.id]={at:+p.at||Date.now(),title:String(p.title||"").slice(0,80),qs:qs};wr(PKEY,P);loadPacks();
  var mine=qs.filter(function(q){return q.g===S.grade}).length;return{mine:mine,other:qs.length-mine}})}
function importLeague(p){var g=+p.g;if([10,11,12].indexOf(g)<0||!Array.isArray(p.rows)||!(p.e>p.s))throw new Error("shape");
 var rows=p.rows.slice(0,60).map(function(r){return[String(r[0]||"").slice(0,40),Math.max(0,Math.round(+r[1]||0)),String(r[2]||"").slice(0,24)]});S.lg=S.lg||{};S.lg[g]={s:+p.s,e:+p.e,at:+p.at||Date.now(),rows:rows,sid:String(p.id||"").slice(0,24)};
 var rk=-1;rows.forEach(function(r,i){if(mine(r)&&rk<0)rk=i});var sid=S.lg[g].sid;
 if(g===S.grade&&rk>=0&&rk<3&&Date.now()>=p.e&&S.lgGot!==sid){S.boost={x:[1.5,1.3,1.2][rk],until:Date.now()+[3,2,1][rk]*864e5,sid:sid};S.lgGot=sid}save();return{league:g}}
function importSet(p){var g=+p.g,cs=(p.cs||[]).map(Number).filter(function(c){return c>0&&c<100});if([10,11,12].indexOf(g)<0||!cs.length||!/^[A-Za-z0-9_-]{4,24}$/.test(p.id||""))throw new Error("shape");
 S.sets=S.sets||{};S.sets[p.id]={id:p.id,g:g,cs:cs,n:Math.min(30,Math.max(5,+p.n||10)),title:String(p.title||"").slice(0,60),at:+p.at||Date.now()};save();return{set:g}}
function packResult(r){if(r.league){dialog(t("league"),t("lgOk",{g:GN(r.league)}),[{label:t("ok2"),val:1,primary:true}]);if(S.grade&&view==="league")renderLeague();return}
 if(r.set){dialog(t("tSet"),t("tSet")+" ✓ "+GN(r.set),[{label:t("ok2"),val:1,primary:true}]);if(S.grade)renderHome();return}
 var msg=t("packOk",{n:num(r.mine),g:GN(S.grade)})+(r.other?" "+t("packOther"):"");
 if(APP.target==="pwa"&&isIOS()&&!standalone())msg+="\n\n"+t("packIOS");dialog(t("teacherQs"),msg,[{label:t("ok2"),val:1,primary:true}]);if(S.grade){renderHome();if(built)refreshTQ()}}
function packFail(){dialog(t("teacherQs"),t("packBad"),[{label:t("ok2"),val:1,primary:true}])}
function checkHash(){var h=location.hash||"";if(h.indexOf("#p=")!==0)return;var code=h.slice(3);try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
 importPack(code).then(packResult,packFail)}
addEventListener("hashchange",checkHash);
function refreshTQ(){var x=$("#tqCount");if(!x)return;var n=Engine.poolFor(S.grade).filter(function(q){return q.c===90}).length;x.textContent=n?t("tqCount",{n:num(n),g:GN(S.grade)}):t("tqNone")}
/* ---------- settings sheet (built on first open) ---------- */
var built=false;
function openSheet(){if(!built)buildSheet();refreshSheet();$("#sheet").hidden=false;$("#scrim").hidden=false;setTimeout(function(){$("#sheet .icon").focus()},30)}
function closeSheet(){$("#sheet").hidden=true;$("#scrim").hidden=true}
function buildSheet(){built=true;var s=$("#sheet .body"),sec=function(k){var d=el("div","sec");d.appendChild(el("h3",null,t(k)));s.appendChild(d);return d};
 var g=sec("grade"),sg=el("div","seg");[10,11,12].forEach(function(x){var b=el("button",null,GN(x));b.dataset.act="setGrade";b.dataset.g=x;sg.appendChild(b)});g.appendChild(sg);
 var th=sec("theme"),tl=el("div","themes");Object.keys(APP.themes).forEach(function(id){var T=APP.themes[id],b=el("button","th");b.dataset.act="th";b.dataset.id=id;b.title=T[LANG==="fa"?1:0];
  var i=el("i");i.style.background="linear-gradient(135deg,"+T[2]+" 50%,"+T[3]+" 50%)";b.appendChild(i);b.appendChild(el("span",null,T[LANG==="fa"?1:0]));tl.appendChild(b)});th.appendChild(tl);
 var lg=sec("lang"),sl=el("div","seg");[["fa","فارسی"],["en","English"]].forEach(function(x){var b=el("button",null,x[1]);b.dataset.act="lang";b.dataset.l=x[0];sl.appendChild(b)});lg.appendChild(sl);
 var pr=sec("practice");pr.appendChild(swRow("instant","inst"));
 var sd=sec("sound");sd.appendChild(swRow("soundOn","snd"));
 sd.appendChild(el("p","note",t("pack")));var sp=el("div","seg");[["soft","packSoft"],["glass","packGlass"],["simple","packSimple"]].forEach(function(x){var b=el("button",null,t(x[1]));b.dataset.act="pack";b.dataset.p=x[0];sp.appendChild(b)});sd.appendChild(sp);
 var pl=el("div","plays");["Correct","Wrong","Streak","End","Tap"].forEach(function(x){var b=el("button",null,t("ev"+x));b.dataset.act="playEv";b.dataset.e=x.toLowerCase();pl.appendChild(b)});sd.appendChild(pl);
 var vr=el("div","srow"),vl=el("label",null,t("vol"));vl.htmlFor="vol";var vi=el("input");vi.type="range";vi.id="vol";vi.min=0;vi.max=100;vi.step=5;vr.appendChild(vl);vr.appendChild(el("b","",""));sd.appendChild(vr);sd.appendChild(vi);
 sd.appendChild(swRow("tapSound","tapS"));if("vibrate" in navigator)sd.appendChild(swRow("vib","vibS"));sd.appendChild(el("p","note",t("muteNote")));sd.appendChild(el("p","note",t("deviceNote")));
 if(/^https?:/.test(location.protocol)){var ln=sec("share"),lr=el("div","link"),cd=el("code",null,location.origin+location.pathname.replace(/index\.html$/,""));var cb=el("button","btn ghost",t("copy"));cb.dataset.act="copyLink";lr.appendChild(cd);lr.appendChild(cb);ln.appendChild(lr)}
 var ns=sec("nameSec"),nr=el("div","link"),ni=el("input","inp");ni.id="nmEdit";ni.maxLength=40;ni.placeholder=t("namePh");var nsb=el("button","btn ghost",t("save"));nsb.dataset.act="saveName";nr.appendChild(ni);nr.appendChild(nsb);ns.appendChild(nr);
 var tq=sec("teacherQs"),tqc=el("p","note");tqc.id="tqCount";tq.appendChild(tqc);var tr=el("div","link"),ti=el("input","inp");ti.id="tqIn";ti.placeholder=t("pastePh");ti.dir="ltr";var tb=el("button","btn ghost",t("add"));tb.dataset.act="addPack";tr.appendChild(ti);tr.appendChild(tb);tq.appendChild(tr);
 var tfl=el("label","btn ghost wide",t("fromFile")),tf=el("input");tf.type="file";tf.accept=".txt,.json,.arabi,text/plain";tf.hidden=true;tfl.appendChild(tf);tfl.style.marginTop="8px";tq.appendChild(tfl);
 tf.addEventListener("change",function(){var f=tf.files&&tf.files[0];if(!f)return;f.text().then(function(x){var c=packCode(x);tf.value="";if(!c)return packFail();importPack(c).then(packResult,packFail)})});
 if(APP.target!=="apk"&&APP.apk){var an=sec("android"),al=el("a","btn ghost wide",t("apkDl"));al.href=APP.apk;al.rel="noopener";an.appendChild(al)}
 var hp=sec("help"),hb=el("button","btn ghost wide",t("replay"));hb.dataset.act="replay";hp.appendChild(hb);
 var rs=sec("reset"),rb=el("button","btn ghost wide",t("reset"));rb.dataset.act="reset";rs.appendChild(rb);
 s.appendChild(el("p","ver",t("version",{v:APP.version})));
 vi.addEventListener("input",function(){SND.vol=+vi.value;vr.querySelector("b").textContent=num(SND.vol)+"٪";saveSnd()});
 vi.addEventListener("change",function(){SFX.unlock();SFX.play("correct")})}
function swRow(k,act){var r=el("div","srow"),l=el("label",null,t(k)),b=el("button","sw");b.setAttribute("role","switch");b.dataset.act=act;b.id="sw-"+act;l.htmlFor=b.id;b.setAttribute("aria-label",t(k));r.appendChild(l);r.appendChild(b);return r}
function refreshSheet(){var ne=$("#nmEdit");if(ne)ne.value=S.name||"";refreshTQ();document.querySelectorAll('[data-act="setGrade"]').forEach(function(b){b.setAttribute("aria-pressed",+b.dataset.g===S.grade)});
 document.querySelectorAll('[data-act="lang"]').forEach(function(b){b.setAttribute("aria-pressed",b.dataset.l===LANG)});
 document.querySelectorAll('[data-act="pack"]').forEach(function(b){b.setAttribute("aria-pressed",b.dataset.p===SND.pack)});
 [["snd","on"],["tapS","tap"],["vibS","vib"]].forEach(function(x){var b=$("#sw-"+x[0]);if(b)b.setAttribute("aria-checked",!!SND[x[1]])});var ib=$("#sw-inst");if(ib)ib.setAttribute("aria-checked",!!S.ui.instant);
 var v=$("#vol");if(v){v.value=SND.vol;v.parentNode.querySelector&&($("#sheet .srow b").textContent=num(SND.vol)+"٪")}applyTheme(S.theme)}
/* ---------- grade change ---------- */
function askGrade(){dialog(t("changeGrade"),t("changeGradeMsg"),[10,11,12].filter(function(g){return g!==S.grade}).map(function(g){return{label:GN(g),val:g,primary:true}}).concat([{label:t("cancel"),val:null}])).then(function(g){if(g)setGrade(g)})}
function setGrade(g){if(g===S.grade)return;S.grade=g;save();SES=null;closeSheet();view="home";showMain()}
/* ---------- events: one listener ---------- */
document.addEventListener("click",function(ev){var b=ev.target.closest("[data-act]");if(!b)return;var a=b.dataset.act;SFX.unlock();
 switch(a){
 case"pickGrade":var nmv=$("#nm").value.trim().replace(/\s+/g," ").slice(0,40);if(nmv.length<2){var nbx=$("#nb");nbx.classList.remove("er");void nbx.offsetWidth;nbx.classList.add("er");$("#nm").focus();break}S.name=nmv;S.grade=+b.dataset.g;save();setTimeout(showMain,0);break;
 case"grade":askGrade();break;
 case"settings":openSheet();break;case"closeSheet":closeSheet();break;
 case"tab":tab(b.dataset.v);break;
 case"start":start(b.dataset.m,+b.dataset.c||null);break;
 case"ans":choose(+b.dataset.i);break;
 case"next":next();break;case"lock":lock();break;case"pad":padToggle();break;case"padClear":padClear();break;
 case"feed":feed(b.dataset.a);break;case"farmUp":farmUp();break;case"set":var st0=(S.sets||{})[b.dataset.id];if(st0)start("set",null,st0);break;
 case"addLeague":var lc0=packCode($("#lgIn").value);if(!lc0){packFail();break}$("#lgIn").value="";importPack(lc0).then(packResult,packFail);break;
 case"inst":S.ui.instant=!S.ui.instant;save();refreshSheet();break;
 case"quit":dialog(t("quitQ"),t("quitMsg"),[{label:t("yesQuit"),val:1,primary:true},{label:t("stay"),val:0}]).then(function(v){if(v){SES=null;showMain()}});break;
 case"again":start(SES.mode,SES.c,SES.set?(S.sets||{})[SES.set]:null);break;case"toReview":SES=null;view="me";showMain();break;case"home":SES=null;view="home";showMain();break;
 case"retry":loadGrade();break;
 case"setGrade":var g=+b.dataset.g;if(g!==S.grade)dialog(t("changeGrade"),t("changeGradeMsg"),[{label:GN(g),val:g,primary:true},{label:t("cancel"),val:null}]).then(function(v){if(v)setGrade(v)});break;
 case"th":setTheme(b.dataset.id,ev);break;
 case"lang":S.lang=LANG=b.dataset.l;save();applyI18n();built=false;$("#sheet .body").textContent="";buildSheet();refreshSheet();if(S.grade){header();renderHome();tab(view,1)}else buildPick();break;
 case"snd":SND.on=!SND.on;saveSnd();refreshSheet();break;case"tapS":SND.tap=!SND.tap;saveSnd();refreshSheet();break;case"vibS":SND.vib=!SND.vib;saveSnd();refreshSheet();if(SND.vib)SFX.vibrate(40);break;
 case"pack":SND.pack=b.dataset.p;saveSnd();refreshSheet();SFX.play("correct");break;
 case"playEv":var on=SND.on,tp=SND.tap;SND.on=true;SND.tap=true;SFX.set(SND);SFX.play(b.dataset.e);SND.on=on;SND.tap=tp;SFX.set(SND);break;
 case"reset":dialog(t("reset"),t("resetQ"),[{label:t("resetGrade",{g:GN(S.grade)}),val:"g",primary:true},{label:t("resetAll"),val:"a",primary:true},{label:t("cancel"),val:null}]).then(function(v){
   if(!v)return;if(v==="g"){[S.prog,S.wrong,S.hist,S.best].forEach(function(o){delete o[S.grade]})}else{S.prog={};S.wrong={};S.hist={};S.best={};S.ui={};S.xp=0;S.day={};S.stk=null;S.farm=null;S.boost=null;S.lg={};S.last={}}save();header();renderHome();renderCount();tab(view,1)});break;
 case"copyLink":copyInto(b,$("#sheet .link code").textContent,$("#sheet .link code"));break;
 case"sendReport":sendReport();break;
 case"saveName":var nv=$("#nmEdit").value.trim().replace(/\s+/g," ").slice(0,40);if(nv.length>=2){S.name=nv;save();b.textContent=t("saved");header()}break;
 case"addPack":var pc=packCode($("#tqIn").value);if(!pc){packFail();break}$("#tqIn").value="";importPack(pc).then(packResult,packFail);break;
 case"tourNext":tourNext();break;case"tourSkip":endTour();break;
 case"replay":closeSheet();S.ui.tour=0;S.ui.qtip=0;save();view="home";intro(function(){startTour()});showMain();break;
 case"tipClose":S.ui.iosTip=1;save();$("#tip").hidden=true;break;
 case"upd":window.__wantReload=true;if(window.__reg&&window.__reg.waiting)window.__reg.waiting.postMessage("skip");break;
 }});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){if(!$("#tour").hidden)endTour();else if(dlgDone)dlgDone();else if(!$("#sheet").hidden)closeSheet();return}
 if(!$("#play").hidden&&!dlgDone&&$("#pad").hidden){var n=+e.key;if(n>=1&&n<=4&&!(SES&&SES.answered)){e.preventDefault();SFX.unlock();choose(n-1)}else if(e.key==="Enter"&&SES&&(document.activeElement===document.body||document.activeElement.classList.contains("opt"))){e.preventDefault();if(S.ui.instant){if(SES.answered)next()}else lock()}}});
/* ---------- back button (Android) / back swipe: close the top layer instead of leaving the app ---------- */
var guard=false,skipPop=false;
function topLayer(){if(!$("#dlg").hidden)return"dlg";if(!$("#tour").hidden)return"tour";if(!$("#sheet").hidden)return"sheet";if(!$("#pad").hidden)return"pad";if(!$("#play").hidden)return"play";if(!$("#result").hidden)return"result";if(!$("#main").hidden&&view!=="home")return"view";return null}
function syncBack(){var L=topLayer();try{if(L&&!guard){history.pushState({ab:1},"");guard=true}else if(!L&&guard){guard=false;skipPop=true;history.back()}}catch(e){}}
addEventListener("popstate",function(){if(skipPop){skipPop=false;return}guard=false;backStep();setTimeout(syncBack,0)});
function backStep(){var L=topLayer();
 if(L==="dlg"){dlgDone&&dlgDone()}else if(L==="tour"){endTour()}else if(L==="sheet"){closeSheet()}else if(L==="pad"){padToggle()}
 else if(L==="play"){dialog(t("quitQ"),t("quitMsg"),[{label:t("yesQuit"),val:1,primary:true},{label:t("stay"),val:0}]).then(function(v){if(v){SES=null;showMain()}})}
 else if(L==="result"){SES=null;view="home";showMain()}else if(L==="view"){tab("home")}}
if(APP.target==="apk")document.addEventListener("backbutton",function(){if(introOn)return;
 if(guard){history.back();return}if(topLayer()){backStep();return}
 var C=window.Capacitor,A=C&&C.Plugins&&C.Plugins.App;if(A&&A.minimizeApp){var r=A.minimizeApp();r&&r.catch&&r.catch(function(){})}});
var syncT=0;new MutationObserver(function(){clearTimeout(syncT);syncT=setTimeout(syncBack,0)}).observe(document.body,{subtree:true,attributes:true,attributeFilter:["hidden"]});
$("#scrim").addEventListener("click",closeSheet);$("#dlgScrim").addEventListener("click",function(){dlgDone&&dlgDone()});
/* ---------- service worker (web app only): never reload by itself ---------- */
if(APP.target==="pwa"&&"serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1")){
 try{var reloading=false;navigator.serviceWorker.addEventListener("controllerchange",function(){if(reloading||!window.__wantReload)return;reloading=true;location.reload()});
  navigator.serviceWorker.register("./sw.js").then(function(reg){window.__reg=reg;var show=function(){$("#upd").hidden=false};
   if(reg.waiting&&navigator.serviceWorker.controller)show();
   reg.addEventListener("updatefound",function(){var w=reg.installing;w&&w.addEventListener("statechange",function(){if(w.state==="installed"&&navigator.serviceWorker.controller)show()})});
   document.addEventListener("visibilitychange",function(){if(!document.hidden)reg.update().catch(function(){})})}).catch(function(){})}catch(e){}}
window.__app={S:S,setGrade:setGrade,start:start,answer:function(i){choose(i);if(!S.ui.instant)lock()},choose:choose,lock:lock,next:next,tab:tab,ses:function(){return SES},screen:function(){return["pick","main","play","result"].filter(function(x){return!$("#"+x).hidden})[0]}};
boot();
})();
