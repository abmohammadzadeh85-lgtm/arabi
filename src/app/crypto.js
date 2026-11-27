/* ---------- Locked links: reports sealed for the teacher, question packs signed by the teacher ----------
   Teacher keys never leave the teacher's device. The apps only carry the teacher's PUBLIC keys,
   so nobody else can read a report or make a question pack that students will accept. */
var AB=(function(){
 var te=new TextEncoder(),td=new TextDecoder(),S=(self.crypto||{}).subtle;
 function cat(){var n=0,i,a=arguments;for(i=0;i<a.length;i++)n+=a[i].length;var o=new Uint8Array(n),p=0;for(i=0;i<a.length;i++){o.set(a[i],p);p+=a[i].length}return o}
 function b64u(buf){var b=buf instanceof Uint8Array?buf:new Uint8Array(buf),s="";for(var i=0;i<b.length;i+=0x8000)s+=String.fromCharCode.apply(null,b.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
 function ub64(str){str=String(str).trim().replace(/-/g,"+").replace(/_/g,"/");while(str.length%4)str+="=";var s=atob(str),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return b}
 function pipe(bytes,T){return new Response(new Blob([bytes]).stream().pipeThrough(T)).arrayBuffer().then(function(x){return new Uint8Array(x)})}
 function deflate(bytes){if(typeof CompressionStream==="undefined")return Promise.resolve(null);return pipe(bytes,new CompressionStream("deflate-raw")).catch(function(){return null})}
 function inflate(bytes){return pipe(bytes,new DecompressionStream("deflate-raw"))}
 function pack(obj){var j=te.encode(JSON.stringify(obj));return deflate(j).then(function(z){return z&&z.length<j.length?cat(new Uint8Array([2]),z):cat(new Uint8Array([1]),j)})}
 function unpack(b){var body=b.slice(1);return (b[0]===2?inflate(body):Promise.resolve(body)).then(function(x){return JSON.parse(td.decode(x))})}
 var EC={name:"ECDH",namedCurve:"P-256"},DS={name:"ECDSA",namedCurve:"P-256"},INFO=te.encode("arabibazi-report-v1");
 function aesFrom(bits,salt,use){return S.importKey("raw",bits,"HKDF",false,["deriveKey"]).then(function(h){return S.deriveKey({name:"HKDF",hash:"SHA-256",salt:salt,info:INFO},h,{name:"AES-GCM",length:256},false,[use])})}
 // student → teacher: only the teacher's private key can open it
 function seal(obj,dhPubB64){var eph,ephRaw,body;return pack(obj).then(function(p){body=p;return S.importKey("raw",ub64(dhPubB64),EC,false,[])})
  .then(function(pub){return S.generateKey(EC,true,["deriveBits"]).then(function(k){eph=k;return S.deriveBits({name:"ECDH",public:pub},k.privateKey,256)})})
  .then(function(bits){return S.exportKey("raw",eph.publicKey).then(function(r){ephRaw=new Uint8Array(r);return aesFrom(bits,ephRaw,"encrypt")})})
  .then(function(key){var iv=crypto.getRandomValues(new Uint8Array(12));return S.encrypt({name:"AES-GCM",iv:iv},key,body).then(function(ct){return b64u(cat(new Uint8Array([1]),ephRaw,iv,new Uint8Array(ct)))})})}
 function open(str,dhPriv){var b=ub64(str);if(b[0]!==1||b.length<100)return Promise.reject(new Error("format"));var ephRaw=b.slice(1,66),iv=b.slice(66,78),ct=b.slice(78);
  return S.importKey("raw",ephRaw,EC,false,[]).then(function(pub){return S.deriveBits({name:"ECDH",public:pub},dhPriv,256)})
  .then(function(bits){return aesFrom(bits,ephRaw,"decrypt")}).then(function(key){return S.decrypt({name:"AES-GCM",iv:iv},key,ct)}).then(function(pt){return unpack(new Uint8Array(pt))})}
 // teacher → students: signed with the teacher's private key, checked against the public key built into the app
 function sign(obj,sigPriv){var data;return pack(obj).then(function(p){data=p;return S.sign({name:"ECDSA",hash:"SHA-256"},sigPriv,data)}).then(function(sig){return b64u(cat(new Uint8Array(sig),data))})}
 function verify(str,sigPubB64){var b=ub64(str),sig=b.slice(0,64),data=b.slice(64);
  return S.importKey("raw",ub64(sigPubB64),DS,false,["verify"]).then(function(pub){return S.verify({name:"ECDSA",hash:"SHA-256"},pub,sig,data)})
  .then(function(ok){if(!ok)throw new Error("signature");return unpack(data)})}
 function rand(n){return b64u(crypto.getRandomValues(new Uint8Array(n)))}
 return {cat:cat,b64u:b64u,ub64:ub64,pack:pack,unpack:unpack,seal:seal,open:open,sign:sign,verify:verify,rand:rand,te:te,td:td,EC:EC,DS:DS,ok:!!S}
})();
