/* Service worker: caches the app; each grade's questions are cached when first asked for. */
var V="2.0.3",PRE="arabibazi-v",CACHE=PRE+V;
var CORE=["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./icons/apple-touch-icon.png","./fonts/vazirmatn-Regular.woff2","./fonts/vazirmatn-Bold.woff2","./fonts/playpen-arabic.woff2"];
var isBank=function(u){return/\/q1[012]\.json$/.test(new URL(u,self.location).pathname)};
self.addEventListener("install",function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE).then(function(){
 // carry over the grades this device already uses, fresh from the network
 return caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf(PRE)===0&&k!==CACHE}).map(function(k){return caches.open(k).then(function(o){return o.keys()}).then(function(rs){
  return Promise.all(rs.filter(function(r){return isBank(r.url)}).map(function(r){return fetch(r.url,{cache:"reload"}).then(function(x){if(x.ok)return c.put(r.url,x)}).catch(function(){})}))})}))})})}))});
self.addEventListener("activate",function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k.indexOf(PRE)===0&&k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener("message",function(e){if(e.data==="skip")self.skipWaiting()});
self.addEventListener("fetch",function(e){var r=e.request;if(r.method!=="GET"||new URL(r.url).origin!==self.location.origin)return;
 if(r.mode==="navigate"){var path=new URL(r.url).pathname,root=new URL("./",self.location).pathname;
  // only the student app itself is served from the cache; other pages (the teacher panel) go to the network first
  if(path===root||path===root+"index.html"){e.respondWith(caches.match("./index.html").then(function(m){return m||fetch(r)}).catch(function(){return fetch(r)}));return}
  e.respondWith(fetch(r).then(function(x){if(x.ok){var cp=x.clone();caches.open(CACHE).then(function(c){c.put(r,cp)})}return x}).catch(function(){return caches.match(r,{ignoreSearch:true})}));return}
 e.respondWith(caches.open(CACHE).then(function(c){return c.match(r,{ignoreSearch:true}).then(function(m){if(m)return m;
  return fetch(r).then(function(x){if(x.ok&&isBank(r.url))c.put(r,x.clone());return x})})}))});
