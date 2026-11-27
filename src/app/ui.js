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
var view="home",SES=null;
function screen(id){["pick","main","play","result"].forEach(function(x){$("#"+x).hidden=x!==id});scrollTo(0,0)}
function boot(){loadPacks();if(!S.grade){buildPick();screen("pick")}else{showMain()}checkHash();intro(function(){if(S.grade&&!S.ui.tour&&$("#play").hidden)startTour()})}
/* ---------- intro: plays on every launch, 3 s, cannot be skipped (the app gets ready underneath) ---------- */
var introOn=false;
function intro(done){var o=$("#intro");if(!o){done&&done();return}introOn=true;nativeBar("#E357A8",false);o.classList.remove("out");o.hidden=false;
 setTimeout(function(){o.classList.add("out");setTimeout(function(){o.hidden=true;o.classList.remove("out");introOn=false;themeBar();done&&done()},300)},2700)}
/* ---------- first-time tour ---------- */
var TOUR=[["#gradeBadge","tour1"],['.hdr [data-act="settings"]',"tour2"],["#sheet .themes","tour3",1],['#v-home [data-m="mixed"]',"tour4"],["#v-home .ch","tour5"],[".dock","tour6"]],TI=-1;
function startTour(){if(!S.grade||!$("#play").hidden||!$("#result").hidden)return;closeSheet();if(view!=="home")tab("home");TI=-1;$("#tour").hidden=false;tourNext()}
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
function showMain(){screen("main");$("#gradeBadge span").textContent=t("gradeOf",{g:GN(S.grade)});tab(view);loadGrade()}
function loadGrade(){var g=S.grade,h=$("#v-home .chs");h.textContent="";h.appendChild(el("p","muted",t("loading")));
 Engine.load(g).then(function(){if(g===S.grade){renderHome();renderCount();if(view==="review")renderReview();if(view==="stats")renderStats();if(!S.ui.tour)setTimeout(function(){if(!S.ui.tour&&!introOn&&$("#tour").hidden&&!$("#main").hidden)startTour()},450)}})
 .catch(function(){Engine.forget(g);h.textContent="";h.appendChild(el("p","muted",t("loadErr")));var b=el("button","btn",t("retry"));b.dataset.act="retry";h.appendChild(b)})}
function chName(g,c){return(APP.chapters[g]||{})[c]||t("chapter")+" "+num(c)}
function renderHome(){var g=S.grade,h=$("#v-home .chs"),pool=Engine.poolFor(g),p=gp(g);h.textContent="";
 $("#v-home h2").textContent=t("gradeOf",{g:GN(g)})+" · "+t("lessons");
 Engine.chapters(g).forEach(function(ch){var done=pool.filter(function(q){return q.c===ch.c&&p[q.id]&&p[q.id][0]>0}).length;
  var b=el("button","card ch");b.dataset.act="start";b.dataset.m="chapter";b.dataset.c=ch.c;
  b.appendChild(el("b",null,chName(g,ch.c)));b.appendChild(el("span","n",t("mastered",{a:num(done),b:num(ch.total)})));
  var bar=el("span","bar"),f=el("span");f.style.width=Math.round(done/ch.total*100)+"%";bar.appendChild(f);b.appendChild(bar);b.appendChild(el("small",null,ch.src));h.appendChild(b)});
 var tip=$("#tip");tip.hidden=!(APP.target==="pwa"&&isIOS()&&!standalone()&&!S.ui.iosTip)}
function isIOS(){return/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)}
function standalone(){try{return navigator.standalone===true||matchMedia("(display-mode: standalone)").matches}catch(e){return false}}
function renderCount(){var n=Engine.poolFor(S.grade).filter(function(q){return gw(S.grade).indexOf(q.id)>=0}).length,c=$("#rvCnt");c.hidden=!n;c.textContent=num(n)}
function tab(v){view=v;["home","review","stats"].forEach(function(x,i){var on=x===v;$("#v-"+x).hidden=!on;$("#v-"+x).classList.toggle("on",on);
  var b=$('.dock [data-v="'+x+'"]');if(on){b.setAttribute("aria-current","page");$(".dock .ind").style.transform="translateX("+(root.dir==="rtl"?-i:i)*100+"%)"}else b.removeAttribute("aria-current")});
 if(v==="review")renderReview();if(v==="stats")renderStats()}
function renderReview(){var g=S.grade,box=$("#v-review .rv"),ids=gw(g),list=Engine.poolFor(g).filter(function(q){return ids.indexOf(q.id)>=0});box.textContent="";
 $("#v-review h2").textContent=t("review")+" · "+GN(g);
 if(!list.length){box.appendChild(el("p","empty card",t("rvEmpty")));return}
 box.appendChild(el("p","muted",t("rvCount",{n:num(list.length)})));var b=el("button","btn wide",t("rvPractice"));b.dataset.act="start";b.dataset.m="review";box.appendChild(b);
 list.slice(0,60).forEach(function(q){var c=el("div","card"),s=split(q.q);c.appendChild(el("p","muted",s[0]));if(s[1])c.appendChild(rich(el("p","st"),s[1]));
  c.appendChild(el("p","ans",t("correctAns",{a:"✓ "+q.o[q.a]})));c.appendChild(el("p","muted",q.e));box.appendChild(c)})}
function renderStats(){var g=S.grade,box=$("#v-stats .sx"),p=gp(g),pool=Engine.poolFor(g),ans=0,ok=0,ml=0;box.textContent="";
 var rc=el("div","card rcard");rc.appendChild(el("b",null,t("myReport",{n:S.name||"…"})));rc.appendChild(el("p","muted",t("gradeOf",{g:GN(g)})+" · "+new Date().toLocaleDateString(LANG==="fa"?"fa-IR":"en-GB")));
 var sb=el("button","btn wide",t("sendReport"));sb.dataset.act="sendReport";rc.appendChild(sb);box.appendChild(rc);
 $("#v-stats h2").textContent=t("stats")+" · "+GN(g);
 pool.forEach(function(q){var x=p[q.id];if(x){ans+=x[0]+x[1];ok+=x[0];if(x[0]>0)ml++}});
 var hs=S.hist[g]||[],grid=el("div","stats3");[[t("stAnswered"),ans],[t("stAcc"),ans?Math.round(ok/ans*100)+"٪":"–"],[t("stBest"),S.best[g]||0]].forEach(function(x){var s=el("div","card stat"),b=el("b",null,"");countUp(b,x[1]);s.appendChild(b);s.appendChild(el("small",null,x[0]));grid.appendChild(s)});box.appendChild(grid);
 var cc=el("div","card chs");cc.appendChild(el("b",null,t("stMastered")+": "+num(ml)+" / "+num(pool.length)));
 Engine.chapters(g).forEach(function(ch){var d=pool.filter(function(q){return q.c===ch.c&&p[q.id]&&p[q.id][0]>0}).length,r=el("div","ch");r.appendChild(el("span",null,chName(g,ch.c)));r.appendChild(el("span","n",num(d)+"/"+num(ch.total)));var bar=el("span","bar"),f=el("span");f.style.width=Math.round(d/ch.total*100)+"%";bar.appendChild(f);r.appendChild(bar);cc.appendChild(r)});box.appendChild(cc);
 var hc=el("div","card");hc.appendChild(el("b",null,t("stLast")+" · "+t("stSessions")+": "+num(hs.length)));
 if(!hs.length)hc.appendChild(el("p","muted",t("stNone")));else{var ul=el("ul","hist");hs.slice(-10).reverse().forEach(function(h){var li=el("li");
  li.appendChild(el("span",null,new Date(h.d).toLocaleDateString(LANG==="fa"?"fa-IR":"en-GB")+" · "+(h.m==="chapter"?chName(g,h.c):h.m==="review"?t("reviewName"):t("mixedName"))));
  li.appendChild(el("b",null,num(h.ok)+"/"+num(h.n)));ul.appendChild(li)});hc.appendChild(ul)}box.appendChild(hc)}
function countUp(e,v){if(typeof v!=="number"||reduced||v<2){e.textContent=typeof v==="number"?num(v):v;return}var t0=performance.now();(function f(n){var k=Math.min(1,(n-t0)/600);e.textContent=num(Math.round(v*k*(2-k)));if(k<1)requestAnimationFrame(f)})(t0)}
/* ---------- practice ---------- */
function start(mode,c){var g=S.grade;Engine.load(g).then(function(){if(g!==S.grade)return;
 var qs=Engine.session(g,mode,mode==="chapter"?c:mode==="review"?gw(g):null,gp(g),null,10);if(!qs.length)return;
 SES={g:g,mode:mode,c:c,qs:qs,i:0,ok:0,bad:0,streak:0,t0:Date.now(),answered:false};screen("play");renderQ()})}
function renderQ(){var q=SES.qs[SES.i];if(!q||q.g!==S.grade||SES.g!==S.grade){SES=null;showMain();return}
 SES.answered=false;var s=split(q.q);$("#pT").textContent=t("qOf",{i:num(SES.i+1),n:num(SES.qs.length)});$("#pS").textContent=SES.streak>1?"🔥"+num(SES.streak):"";
 $("#pB").style.width=(SES.i/SES.qs.length*100)+"%";$("#qP").textContent=s[0];var st=rich($("#qS"),s[1]);st.hidden=!s[1];st.classList.toggle("long",s[1].length>34);
 var o=$("#qO");o.textContent="";q.o.forEach(function(x,i){var b=el("button","opt"+(isAr(x)?" ar":""));b.dataset.act="ans";b.dataset.i=i;b.appendChild(el("span","k",num(i+1)));b.appendChild(el("span","tx",x));b.appendChild(el("span","mk",""));o.appendChild(b)});
 $("#qF").hidden=true;$("#qN").hidden=true;var qt=$("#qTip");qt.hidden=!!S.ui.qtip;if(!S.ui.qtip)qt.textContent=t("qTip");$("#qC").scrollIntoView({block:"nearest"})}
function answer(i){if(!SES||SES.answered)return;var q=SES.qs[SES.i];if(q.g!==S.grade)return;SES.answered=true;var ok=i===q.a,g=SES.g,p=gp(g),x=p[q.id]||[0,0],w=gw(g),k=w.indexOf(q.id);
 x[ok?0:1]++;p[q.id]=x;if(!S.ui.qtip){S.ui.qtip=1;$("#qTip").hidden=true}if(ok){if(k>=0)w.splice(k,1);SES.ok++;SES.streak++;if(SES.streak>(S.best[g]||0))S.best[g]=SES.streak}else{if(k<0)w.push(q.id);SES.bad++;SES.streak=0}save();
 document.querySelectorAll("#qO .opt").forEach(function(b,j){b.disabled=true;if(j===q.a){b.classList.add("ok");b.querySelector(".mk").textContent=t("right")}else if(j===i){b.classList.add("bad");b.querySelector(".mk").textContent=t("wrong")}else b.classList.add("dim")});
 var f=$("#qF");f.className="fb "+(ok?"ok":"bad");f.textContent="";f.appendChild(el("h3",null,ok?(SES.streak>=5&&SES.streak%5===0?t("streakMsg",{n:num(SES.streak)}):t("rightT")):t("wrongT")));
 if(!ok)f.appendChild(el("p",null,t("correctAns",{a:q.o[q.a]})));f.appendChild(el("p",null,q.e));f.appendChild(el("p","src",q.src));f.hidden=false;
 var n=$("#qN");n.textContent=SES.i+1<SES.qs.length?t("next"):t("finish");n.hidden=false;$("#pS").textContent=SES.streak>1?"🔥"+num(SES.streak):"";
 if(ok)SFX.play(SES.streak>=5&&SES.streak%5===0?"streak":"correct");else{SFX.play("wrong");SFX.vibrate(60)}
 setTimeout(function(){n.focus({preventScroll:true});f.scrollIntoView({block:"nearest",behavior:reduced?"auto":"smooth"})},40)}
function next(){if(!SES||!SES.answered)return;SES.i++;if(SES.i>=SES.qs.length)result();else renderQ()}
function result(){var s=SES,g=s.g,ms=Date.now()-s.t0,h=S.hist[g]=S.hist[g]||[];h.push({d:Date.now(),m:s.mode,c:s.c||null,ok:s.ok,n:s.qs.length,ms:ms});if(h.length>30)h.splice(0,h.length-30);save();
 screen("result");var pc=Math.round(s.ok/s.qs.length*100),C=2*Math.PI*64,fg=$("#rR .fg");$("#rR text").textContent=num(pc)+"٪";fg.style.strokeDasharray=C;fg.style.strokeDashoffset=C;
 requestAnimationFrame(function(){requestAnimationFrame(function(){fg.style.strokeDashoffset=C*(1-pc/100)})});
 $("#rOk").textContent=num(s.ok);$("#rBad").textContent=num(s.bad);var sec=Math.round(ms/1000);$("#rT").textContent=num(Math.floor(sec/60))+":"+num(String(sec%60).padStart(2,"0"));
 $("#rRv").hidden=!s.bad;SFX.play("end")}

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
  return {v:1,t:"r",id:S.dev,n:S.name,g:S.grade,at:Date.now(),ver:APP.version,gr:gr}})}
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
 ensureName().then(function(n){if(!n)return;sendingReport=true;return buildReport().then(function(r){return AB.seal(r,APP.teacher.dh)})
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
 return AB.verify(code,APP.teacher.sig).then(function(p){if(!p||p.t!=="p"||typeof p.id!=="string"||!/^[A-Za-z0-9_-]{4,24}$/.test(p.id)||!Array.isArray(p.qs))throw new Error("shape");
  var qs=p.qs.slice(0,600).map(function(q){return okQ(q,p.id)}).filter(Boolean);if(!qs.length)throw new Error("empty");
  var P=rd(PKEY,{});P[p.id]={at:+p.at||Date.now(),title:String(p.title||"").slice(0,80),qs:qs};wr(PKEY,P);loadPacks();
  var mine=qs.filter(function(q){return q.g===S.grade}).length;return{mine:mine,other:qs.length-mine}})}
function packResult(r){var msg=t("packOk",{n:num(r.mine),g:GN(S.grade)})+(r.other?" "+t("packOther"):"");
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
 [["snd","on"],["tapS","tap"],["vibS","vib"]].forEach(function(x){var b=$("#sw-"+x[0]);if(b)b.setAttribute("aria-checked",!!SND[x[1]])});
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
 case"ans":SFX.play("tap");answer(+b.dataset.i);break;
 case"next":next();break;
 case"quit":dialog(t("quitQ"),t("quitMsg"),[{label:t("yesQuit"),val:1,primary:true},{label:t("stay"),val:0}]).then(function(v){if(v){SES=null;showMain()}});break;
 case"again":start(SES.mode,SES.c);break;case"toReview":SES=null;view="review";showMain();break;case"home":SES=null;view="home";showMain();break;
 case"retry":loadGrade();break;
 case"setGrade":var g=+b.dataset.g;if(g!==S.grade)dialog(t("changeGrade"),t("changeGradeMsg"),[{label:GN(g),val:g,primary:true},{label:t("cancel"),val:null}]).then(function(v){if(v)setGrade(v)});break;
 case"th":setTheme(b.dataset.id,ev);break;
 case"lang":S.lang=LANG=b.dataset.l;save();applyI18n();built=false;$("#sheet .body").textContent="";buildSheet();refreshSheet();if(S.grade){$("#gradeBadge span").textContent=t("gradeOf",{g:GN(S.grade)});renderHome();tab(view)}else buildPick();break;
 case"snd":SND.on=!SND.on;saveSnd();refreshSheet();break;case"tapS":SND.tap=!SND.tap;saveSnd();refreshSheet();break;case"vibS":SND.vib=!SND.vib;saveSnd();refreshSheet();if(SND.vib)SFX.vibrate(40);break;
 case"pack":SND.pack=b.dataset.p;saveSnd();refreshSheet();SFX.play("correct");break;
 case"playEv":var on=SND.on,tp=SND.tap;SND.on=true;SND.tap=true;SFX.set(SND);SFX.play(b.dataset.e);SND.on=on;SND.tap=tp;SFX.set(SND);break;
 case"reset":dialog(t("reset"),t("resetQ"),[{label:t("resetGrade",{g:GN(S.grade)}),val:"g",primary:true},{label:t("resetAll"),val:"a",primary:true},{label:t("cancel"),val:null}]).then(function(v){
   if(!v)return;if(v==="g"){[S.prog,S.wrong,S.hist,S.best].forEach(function(o){delete o[S.grade]})}else{S.prog={};S.wrong={};S.hist={};S.best={};S.ui={}}save();renderHome();renderCount();tab(view)});break;
 case"copyLink":copyInto(b,$("#sheet .link code").textContent,$("#sheet .link code"));break;
 case"sendReport":sendReport();break;
 case"saveName":var nv=$("#nmEdit").value.trim().replace(/\s+/g," ").slice(0,40);if(nv.length>=2){S.name=nv;save();b.textContent=t("saved")}break;
 case"addPack":var pc=packCode($("#tqIn").value);if(!pc){packFail();break}$("#tqIn").value="";importPack(pc).then(packResult,packFail);break;
 case"tourNext":tourNext();break;case"tourSkip":endTour();break;
 case"replay":closeSheet();S.ui.tour=0;S.ui.qtip=0;save();view="home";intro(function(){startTour()});showMain();break;
 case"tipClose":S.ui.iosTip=1;save();$("#tip").hidden=true;break;
 case"upd":window.__wantReload=true;if(window.__reg&&window.__reg.waiting)window.__reg.waiting.postMessage("skip");break;
 }});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){if(!$("#tour").hidden)endTour();else if(dlgDone)dlgDone();else if(!$("#sheet").hidden)closeSheet();return}
 if(!$("#play").hidden&&!dlgDone){var n=+e.key;if(n>=1&&n<=4&&!(SES&&SES.answered)){e.preventDefault();SFX.unlock();answer(n-1)}else if(e.key==="Enter"&&SES&&SES.answered&&document.activeElement===document.body){next()}}});
/* ---------- back button (Android) / back swipe: close the top layer instead of leaving the app ---------- */
var guard=false,skipPop=false;
function topLayer(){if(!$("#dlg").hidden)return"dlg";if(!$("#tour").hidden)return"tour";if(!$("#sheet").hidden)return"sheet";if(!$("#play").hidden)return"play";if(!$("#result").hidden)return"result";if(!$("#main").hidden&&view!=="home")return"view";return null}
function syncBack(){var L=topLayer();try{if(L&&!guard){history.pushState({ab:1},"");guard=true}else if(!L&&guard){guard=false;skipPop=true;history.back()}}catch(e){}}
addEventListener("popstate",function(){if(skipPop){skipPop=false;return}guard=false;backStep();setTimeout(syncBack,0)});
function backStep(){var L=topLayer();
 if(L==="dlg"){dlgDone&&dlgDone()}else if(L==="tour"){endTour()}else if(L==="sheet"){closeSheet()}
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
window.__app={S:S,setGrade:setGrade,start:start,answer:answer,next:next,ses:function(){return SES},screen:function(){return["pick","main","play","result"].filter(function(x){return!$("#"+x).hidden})[0]}};
boot();
})();
