/* ---------- Sound: three code-made packs on one pentatonic scale (C D E G A) ---------- */
var SFX=(function(){
 var N={C4:261.63,E4:329.63,G4:392,A4:440,C5:523.25,D5:587.33,E5:659.25,G5:783.99,A5:880,C6:1046.5};
 // A note: [freq, start s, length s, wave, level, glideTo]
 function packNotes(pack,ev,v){
  var soft={
   correct:[[["C5",0,.13],["E5",.09,.17]],[["D5",0,.13],["G5",.09,.17]],[["E5",0,.13],["A5",.09,.17]]],
   wrong:[[["G4",0,.19,"triangle",1.75,"E4"]]],
   streak:[[["C5",0,.15,0,.62],["E5",.095,.15,0,.62],["G5",.19,.15,0,.62],["C6",.285,.17,0,.62]]],
   end:[[["G5",0,.22,0,.85],["E5",.18,.22,0,.85],["D5",.36,.22,0,.85],["C5",.54,.3,0,.85]]],
   tap:[[["A5",0,.055,"sine",2.2]]]};
  var simple={
   correct:[[["C5",0,.07],["E5",.1,.1]],[["D5",0,.07],["G5",.1,.1]],[["E5",0,.07],["A5",.1,.1]]],
   wrong:[[["G4",0,.16,"sine",1.05,"E4"]]],
   streak:[[["C5",0,.08,0,.9],["E5",.1,.08,0,.9],["G5",.2,.08,0,.9],["C6",.3,.11,0,.9]]],
   end:[[["E5",0,.1],["D5",.25,.1],["C5",.5,.22]]],
   tap:[[["A5",0,.05,"sine",2.1]]]};
  var src=pack==="simple"?simple:soft,set=src[ev]||src.tap;return set[(v||0)%set.length]}
 var LEN={correct:.28,wrong:.22,streak:.5,end:.9,tap:.07};
 function chain(ctx,pack){
  var comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.12;
  var master=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3000;lp.Q.value=.5;
  master.connect(lp);lp.connect(comp);comp.connect(ctx.destination);
  if(pack==="glass"){var d=ctx.createDelay(.2),fb=ctx.createGain(),dl=ctx.createBiquadFilter(),wet=ctx.createGain();d.delayTime.value=.05;fb.gain.value=.25;dl.type="lowpass";dl.frequency.value=2200;wet.gain.value=.35;
   lp.connect(d);d.connect(dl);dl.connect(fb);fb.connect(d);dl.connect(wet);wet.connect(comp)}
  return {input:master,comp:comp}}
 function voice(ctx,dest,f,t,len,wave,lvl,glide,bright){
  var o=ctx.createOscillator(),g=ctx.createGain(),atk=.01,rel=Math.min(Math.max(.06,len*.6),len-atk),tau=rel/7.5,peak=(bright?.235:.36)*(lvl||1);
  o.type=wave||"sine";o.frequency.setValueAtTime(f,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+len*.8);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+atk);g.gain.setTargetAtTime(0,t+len-rel,tau);
  o.connect(g);g.connect(dest);o.start(t);o.stop(t+len+.002);
  if(bright){var o2=ctx.createOscillator(),g2=ctx.createGain();o2.type="sine";o2.frequency.setValueAtTime(f*2,t);if(glide)o2.frequency.exponentialRampToValueAtTime(glide*2,t+len*.8);
   g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(peak*.22,t+atk);g2.gain.setTargetAtTime(0,t+len-rel,tau);o2.connect(g2);g2.connect(dest);o2.start(t);o2.stop(t+len+.002)}}
 function schedule(ctx,dest,pack,ev,v,t0){var notes=packNotes(pack,ev,v),live=[];
  notes.forEach(function(n){var t=t0+n[1];live=live.filter(function(e){return e>t});if(live.length>=3)return;live.push(t+n[2]);
   voice(ctx,dest,N[n[0]],t,n[2],(n[3]||(pack==="glass"?"triangle":"sine")),n[4],n[5]&&N[n[5]],pack==="glass")})}
 var ctx=null,ch=null,chPack="",last=0,rot=0,S={on:true,pack:"soft",vol:50,tap:false,vib:true};
 function unlock(){try{if(!ctx){var C=window.AudioContext||window.webkitAudioContext;if(!C)return;ctx=new C()}if(ctx.state!=="running")ctx.resume()}catch(e){}}
 function play(ev){if(!S.on||!ctx||(ev==="tap"&&!S.tap))return;
  try{if(ctx.state!=="running"){ctx.resume();return}
   if(chPack!==S.pack){ch=chain(ctx,S.pack);chPack=S.pack}
   ch.input.gain.value=S.vol/100;var t=Math.max(ctx.currentTime+.01,last+.06);last=t;
   schedule(ctx,ch.input,S.pack,ev,ev==="correct"?rot++:0,t)}catch(e){}}
 document.addEventListener("visibilitychange",function(){try{if(!ctx)return;if(document.hidden)ctx.suspend()}catch(e){}});
 // For measurement: render one event offline and return the samples.
 function render(pack,ev,vol,v){var sr=48000,len=Math.ceil((LEN[ev]+(pack==="glass"?.35:.05))*sr),oc=new OfflineAudioContext(1,len,sr),c=chain(oc,pack);c.input.gain.value=(vol==null?100:vol)/100;
  schedule(oc,c.input,pack,ev,v||0,0);return oc.startRendering().then(function(b){return b.getChannelData(0)})}
 return {unlock:unlock,play:play,set:function(o){for(var k in o)S[k]=o[k]},get:function(){return S},render:render,LEN:LEN,
  vibrate:function(ms){try{if(S.vib&&"vibrate" in navigator)navigator.vibrate(ms)}catch(e){}}}
})();
