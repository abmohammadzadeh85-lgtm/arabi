// Shared helpers for building the question banks.
export function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
export const pick=(r,a)=>a[Math.floor(r()*a.length)];
export function shuffle(r,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// Persian normalisation: Arabic ي/ك → Persian ی/ک, tidy spaces and half-spaces.
export function norm(s){return String(s).replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[ \t]+/g," ").replace(/ ?‌ ?/g,"‌").replace(/ +\n/g,"\n").replace(/\n +/g,"\n").trim()}
const pad=(n,w)=>String(n).padStart(w,"0");
// Build one bank: items = [{c, q, o:[...4], a, e}] ; returns normalised, id-stamped, de-duplicated questions.
export function stamp(g,subject,items,srcByC){const seen=new Set(),count={},out=[];
 for(const it of items){const q=norm(it.q),o=it.o.map(norm),e=norm(it.e),key=q+"|"+o[it.a];if(seen.has(key))continue;seen.add(key);
  count[it.c]=(count[it.c]||0)+1;out.push({id:`${g}-${subject}-${pad(it.c,2)}-${pad(count[it.c],3)}`,g,s:subject,c:it.c,t:"mcq",q,o,a:it.a,e,src:norm(it.src||srcByC[it.c])})}
 return out}
// Validation: stops the build on any broken question.
export function validate(bank,expectG){const errs=[],ids=new Set();
 for(const q of bank){const p=`[${q.id}]`;
  if(![10,11,12].includes(q.g))errs.push(`${p} g باید ۱۰، ۱۱ یا ۱۲ باشد (هست: ${q.g})`);
  if(expectG!=null&&q.g!==expectG)errs.push(`${p} در بانک پایهٔ ${expectG} است ولی g=${q.g}`);
  if(!String(q.id).startsWith(q.g+"-"))errs.push(`${p} پیشوند شناسه با g=${q.g} یکی نیست`);
  if(ids.has(q.id))errs.push(`${p} شناسهٔ تکراری`);ids.add(q.id);
  if(q.t!=="mcq")errs.push(`${p} نوع ناشناخته`);
  if(!Array.isArray(q.o)||q.o.length!==4)errs.push(`${p} باید ۴ گزینه داشته باشد`);
  else if(new Set(q.o).size!==4)errs.push(`${p} گزینهٔ تکراری`);
  if(!(Number.isInteger(q.a)&&q.a>=0&&q.a<(q.o||[]).length))errs.push(`${p} شمارهٔ پاسخ بیرون از گزینه‌هاست`);
  if(!q.src||!q.c)errs.push(`${p} منبع یا فصل ندارد`);
  if(!q.q||!q.e)errs.push(`${p} متن سؤال یا توضیح خالی است`);
  if(/[يك]/.test(q.q+q.o.join("")+q.e))errs.push(`${p} «ي» یا «ك» عربی نرمال نشده`)}
 return errs}
