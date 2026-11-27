// One source → three outputs: dist/standalone.html, dist/pwa/, www/ (Android).
// Usage: node build.mjs [--url=https://user.github.io/repo/] [--poison]
import fs from "node:fs";import path from "node:path";import {createRequire} from "node:module";import {createHash} from "node:crypto";
import {gen10,CHAPTERS10} from "./src/bank/gen10.mjs";import {gen11,CHAPTERS11} from "./src/bank/gen11.mjs";import {gen12,CHAPTERS12} from "./src/bank/gen12.mjs";
import {validate} from "./src/bank/common.mjs";import {LESSONS} from "./src/bank/lessons.mjs";
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const[k,v]=a.replace(/^--/,"").split("=");return[k,v??true]}));
const rd=p=>fs.readFileSync(p,"utf8"),ROOT=path.dirname(new URL(import.meta.url).pathname);
const VER=JSON.parse(rd("src/version.json")),THEMES=JSON.parse(rd("src/themes.json")),DEF="ink";
// ---------- banks ----------
let banks={10:gen10(),11:gen11(),12:gen12()};
// manual grade corrections (question id → grade, or null to hold back); applied before validation
const OV=fs.existsSync("src/overrides.json")?JSON.parse(rd("src/overrides.json")):{};
const held=[];for(const g of [10,11,12])banks[g]=banks[g].filter(q=>{if(!(q.id in OV))return true;const ng=OV[q.id];if(ng===null){held.push({...q,g:null});return false}
 if(ng!==g){q.g=ng;banks[ng].push(q);return false}return true});
if(args.poison){banks[10].push({...banks[11][0],g:10})} // test: an id/grade mismatch must stop the build
const errs=[10,11,12].flatMap(g=>validate(banks[g],g));
if(errs.length){console.error("✗ ساخت متوقف شد — بانک سؤال مشکل دارد:\n"+errs.slice(0,20).join("\n"));process.exit(1)}
// ---------- pieces ----------
const themeCSS=Object.entries(THEMES).map(([id,t])=>`${id===DEF?":root,":""}:root[data-theme="${id}"]{--bg:${t.bg};--bg2:${t.bg2};--card:${t.card};--ink:${t.ink};--ink-dim:${t.dim};--line:${t.line};--gold:${t.gold};--sage:${t.sage};--rust:${t.rust};--on-accent:${t.on};--radius:${t.r}px;--ok:${t.ok};--bad:${t.bad}}`).join("\n");
const fontCSS=(pre="./")=>`@font-face{font-family:Vazirmatn;src:url(${pre}fonts/vazirmatn-Regular.woff2) format("woff2");font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url(${pre}fonts/vazirmatn-Bold.woff2) format("woff2");font-weight:700;font-display:swap}@font-face{font-family:"Playpen Sans Arabic";src:url(${pre}fonts/playpen-arabic.woff2) format("woff2");font-weight:400 700;font-display:swap;unicode-range:U+0600-06FF,U+200C}`;
const strip=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\n\s*/g,"\n");
// Older Android WebViews (Chrome < 87) ignore inset/margin-inline/padding-inline/dvh: add plain fallbacks in front.
const one=v=>{let d=0;for(const ch of v.trim()){if(ch==="(")d++;else if(ch===")")d--;else if(/\s/.test(ch)&&!d)return false}return true};
const FB={"inset":v=>`top:${v};right:${v};bottom:${v};left:${v}`,"inset-inline":v=>`left:${v};right:${v}`,"inset-block":v=>`top:${v};bottom:${v}`,"margin-inline":v=>`margin-left:${v};margin-right:${v}`,"padding-inline":v=>`padding-left:${v};padding-right:${v}`};
const compat=c=>c.replace(/([;{\s])(inset|inset-inline|inset-block|margin-inline|padding-inline):([^;}]+)/g,(m,pre,prop,val)=>one(val)&&!/!important/.test(val)?`${pre}${FB[prop](val.trim())};${prop}:${val}`:m)
 .replace(/([;{\s])(min-height|height):100dvh/g,"$1$2:100vh;$2:100dvh");
const css=(withFont,pre="./",extra="")=>compat((withFont?fontCSS(pre)+"\n":"")+themeCSS+"\n"+strip(rd("src/app/style.css"))+(extra?"\n"+strip(extra):""));
const MASCOT=rd("src/mascot.svg.txt").trim();
const LOGO=`<span class="logo">${MASCOT}</span>`;
const LETTERS="ا ب ت ث ج ح خ د ر س ص ع ق ک ل م ن ه".split(" ");
const INTRO=`<span class="logo i-logo">${MASCOT}</span>`+LETTERS.map(l=>`<b class="lt">${l}</b>`).join("");
const FAV=`data:image/svg+xml,${encodeURIComponent(MASCOT.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace('aria-hidden="true">','><defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A5C"/><stop offset="1" stop-color="#FF4F9A"/></linearGradient></defs><rect x="6" y="6" width="54" height="54" rx="16" fill="url(#f)"/>'))}`;
// the teacher's PUBLIC keys (safe to publish); null until the teacher sets up the panel
const TEACHER=(()=>{try{const t=JSON.parse(rd("src/teacher.json"));const m=String(t.code||"").match(/^AB1\.([A-Za-z0-9_-]{80,90})\.([A-Za-z0-9_-]{80,90})$/);return m?{sig:m[1],dh:m[2]}:null}catch(e){return null}})();
const SITE="https://abmohammadzadeh85-lgtm.github.io/arabi/";
// The Android download link appears in the app only once a release signed with the permanent key exists (src/apk.json → {"ready":true}).
const APK=(()=>{try{return JSON.parse(rd("src/apk.json")).ready?"https://github.com/abmohammadzadeh85-lgtm/arabi/releases/latest/download/arabibazi.apk":null}catch(e){return null}})();
const TCH="سؤال‌های معلم",CHS={10:{...CHAPTERS10,90:TCH},11:{...CHAPTERS11,90:TCH},12:{...CHAPTERS12,90:TCH}};
const APPDATA=target=>({version:VER.version,target,site:SITE,apk:APK,teacher:TEACHER,defTheme:DEF,themes:Object.fromEntries(Object.entries(THEMES).map(([id,t])=>[id,[t.name[0],t.name[1],t.bg,t.gold,t.light]])),lessons:LESSONS,chapters:CHS});
const js=target=>`var APP=${JSON.stringify(APPDATA(target)).replace(/</g,"\\u003c")};\n`+["i18n","engine","sound","crypto","ui"].map(f=>rd(`src/app/${f}.js`)).join("\n");
function teacherPage(){const app={version:VER.version,site:SITE,chapters:CHS,lessons:LESSONS};
 return lockCSP(rd("src/teacher/index.html").replace("{{THEME}}",DEF).replace("{{LIGHT}}",THEMES[DEF].light?"1":"0").replace("{{THEMECOLOR}}",THEMES[DEF].bg).split("{{LOGO}}").join(LOGO)
  .replace("{{CSS}}",()=>css(true,"../",rd("src/teacher/teacher.css"))).replace("{{JS}}",()=>`var APP=${JSON.stringify(app)};\n`+rd("src/app/crypto.js")+"\n"+rd("src/teacher/teacher.js")))}
// Lock the page's CSP to the exact inline script(s) it ships: injected markup can't run code even if it ever got in.
// The Android build keeps 'unsafe-inline' because Capacitor adds its own bridge script to the page.
function lockCSP(html){const hs=[];html.replace(/<script>([\s\S]*?)<\/script>/g,(m,c)=>{if(/\r/.test(c))throw new Error("CR in inline script");hs.push(`'sha256-${createHash("sha256").update(c,"utf8").digest("base64")}'`);return m});
 if(!hs.length||!html.includes("script-src 'unsafe-inline'"))throw new Error("CSP lock failed");return html.replace("script-src 'unsafe-inline'","script-src "+hs.join(" "))}
const jsonTag=(id,data)=>`<script type="application/json" id="${id}">${JSON.stringify(data).replace(/</g,"\\u003c")}</script>`;
function page(target){const html=page0(target);return target==="apk"?html:lockCSP(html)}
function page0(target){const pwa=target!=="standalone";
 const head=pwa?`<link rel="manifest" href="./manifest.webmanifest">\n<link rel="icon" href="./icons/icon-192.png">\n<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">\n<link rel="preload" href="./fonts/vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="./fonts/vazirmatn-Bold.woff2" as="font" type="font/woff2" crossorigin>`:`<link rel="icon" href="${FAV}">`;
 return rd("src/app/index.html").replace("{{THEME}}",DEF).replace("{{LIGHT}}",THEMES[DEF].light?"1":"0").replace("{{INTRO}}",INTRO).replace("{{THEMECOLOR}}",THEMES[DEF].bg).replace("{{HEAD}}",head).replace("{{CSS}}",()=>css(pwa))
  .split("{{LOGO}}").join(LOGO).replace("{{BANKS}}",()=>pwa?"":[10,11,12].map(g=>jsonTag("q"+g,banks[g])).join("\n")).replace("{{JS}}",()=>js(target))}
// ---------- write ----------
const rm=p=>fs.rmSync(p,{recursive:true,force:true}),mk=p=>fs.mkdirSync(p,{recursive:true});
rm("dist");mk("dist/pwa/icons");mk("dist/pwa/fonts");
fs.writeFileSync("dist/standalone.html",page("standalone"));
function webapp(dir,target){mk(dir+"/icons");mk(dir+"/fonts");fs.writeFileSync(dir+"/index.html",page(target));
 for(const g of [10,11,12])fs.writeFileSync(`${dir}/q${g}.json`,JSON.stringify(banks[g]));
 for(const f of fs.readdirSync("src/icons"))fs.copyFileSync("src/icons/"+f,`${dir}/icons/${f}`);
 for(const f of fs.readdirSync("src/fonts"))fs.copyFileSync("src/fonts/"+f,`${dir}/fonts/${f}`);
 fs.writeFileSync(dir+"/manifest.webmanifest",JSON.stringify({name:"عربی‌بازی — تمرین قواعد عربی",short_name:"عربی‌بازی",id:"./",start_url:"./",scope:"./",display:"standalone",lang:"fa",dir:"rtl",theme_color:THEMES[DEF].bg,background_color:THEMES[DEF].bg,
  icons:[{src:"./icons/icon-192.png",sizes:"192x192",type:"image/png"},{src:"./icons/icon-512.png",sizes:"512x512",type:"image/png"},{src:"./icons/maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]},null,1));
 if(target==="pwa"){fs.writeFileSync(dir+"/sw.js",rd("src/app/sw.js").replace("{{VERSION}}",VER.version))}}
webapp("dist/pwa","pwa");rm("android/www");webapp("android/www","apk");
mk("dist/pwa/t");fs.writeFileSync("dist/pwa/t/index.html",teacherPage());
fs.writeFileSync("dist/pwa/t/manifest.webmanifest",JSON.stringify({name:"پنل معلم عربی‌بازی",short_name:"پنل معلم",id:"./",start_url:"./",scope:"./",display:"standalone",lang:"fa",dir:"rtl",theme_color:THEMES[DEF].bg,background_color:THEMES[DEF].bg,
 icons:[{src:"../icons/icon-192.png",sizes:"192x192",type:"image/png"},{src:"../icons/icon-512.png",sizes:"512x512",type:"image/png"},{src:"../icons/maskable-512.png",sizes:"512x512",type:"image/png",purpose:"maskable"}]},null,1));
fs.writeFileSync("android/version.json",JSON.stringify(VER));
if(held.length)fs.writeFileSync("dist/quarantine.json",JSON.stringify(held,null,1));
// ---------- QR + student guide (needs the final link) ----------
if(args.url){const require=createRequire(import.meta.url),qrcode=require(path.join(ROOT,"tools/node_modules/qrcode-generator"));
 const q=qrcode(0,"M");q.addData(String(args.url));q.make();fs.writeFileSync("dist/qr.svg",q.createSvgTag({cellSize:8,margin:4,scalable:true}));}
// ---------- report sizes ----------
const kb=n=>(n/1024).toFixed(1)+" KB",size=p=>fs.statSync(p).size;
const appOnly=t=>Buffer.byteLength(page(t).replace(/<script type="application\/json"[\s\S]*?<\/script>/g,""));
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
console.log(`✓ نسخهٔ ${VER.version} (کد ${VER.code}) ساخته شد. سؤال‌ها: دهم ${banks[10].length} · یازدهم ${banks[11].length} · دوازدهم ${banks[12].length}${held.length?` · قرنطینه ${held.length}`:""}`);
console.log("خود اپ (بدون سؤال‌ها):",kb(appOnly("pwa")),"/ سقف 150 KB");
console.log("dist/standalone.html:",kb(size("dist/standalone.html")));
for(const f of walk("dist/pwa"))console.log(f.padEnd(40),kb(size(f)));
console.log("android/www:",kb(walk("android/www").reduce((a,f)=>a+size(f),0)));
