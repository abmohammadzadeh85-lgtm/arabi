/* ---------- Engine: the grade lock. Only poolFor() reads the question bank. ---------- */
var Engine=(function(){
 var BANK={},EXTRA=[],loader=null;
 function setLoader(f){loader=f}
 function load(g){if(BANK[g])return Promise.resolve(BANK[g]);
  return Promise.resolve(loader(g)).then(function(list){BANK[g]=Array.isArray(list)?list:[];return BANK[g]})}
 // The single gate to the bank: returns only questions whose g equals the requested grade.
 function poolFor(g){var b=(BANK[g]||[]).concat(EXTRA),out=[];for(var i=0;i<b.length;i++)if(b[i]&&b[i].g===g)out.push(b[i]);return out}
 // teacher questions (already checked: signed by the teacher, valid shape) join the bank behind the same gate
 function setExtra(list){EXTRA=Array.isArray(list)?list.slice():[]}
 function rnd(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
 function shuffle(r,a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),x=a[i];a[i]=a[j];a[j]=x}return a}
 // mode: "chapter" (arg=c), "mixed", "review" (arg=list of ids). prog = {id:[right,wrong]} for this grade only.
 function session(g,mode,arg,prog,seed,n){n=n||10;var r=rnd(seed==null?(Date.now()>>>0):seed),pool=poolFor(g),list;
  if(mode==="chapter")list=pool.filter(function(q){return q.c===arg});
  else if(mode==="review"){var want={};(arg||[]).forEach(function(id){want[id]=1});list=pool.filter(function(q){return want[q.id]})}
  else list=pool;
  prog=prog||{};list=shuffle(r,list);
  // questions not yet answered correctly come first
  list.sort(function(a,b){var pa=prog[a.id],pb=prog[b.id];return (pa&&pa[0]?1:0)-(pb&&pb[0]?1:0)});
  if(mode==="mixed"){var byC={},out=[];list.forEach(function(q){(byC[q.c]=byC[q.c]||[]).push(q)});var cs=Object.keys(byC);
   for(var i=0;out.length<n&&i<list.length;i++){var c=cs[i%cs.length];if(byC[c].length)out.push(byC[c].shift())}return shuffle(r,out)}
  return list.slice(0,n)}
 function chapters(g){var m={};poolFor(g).forEach(function(q){var x=m[q.c]=m[q.c]||{c:q.c,total:0,src:q.src};x.total++});return Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return a.c-b.c})}
 function forget(g){delete BANK[g]}
 return {setLoader:setLoader,setExtra:setExtra,load:load,poolFor:poolFor,session:session,chapters:chapters,forget:forget,_bank:BANK}
})();
if(typeof module!=="undefined")module.exports=Engine;
