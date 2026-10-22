const CACHE='unity-fieldwork-field-v7';const FILES=['./','./index.html','./style.css','./mobile.css','./logic.js','./app.js','./mobile.js','./field.js','./job-ui.js','./job-ui.css','./unity-logo.webp','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('unity-fieldwork-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(c=>c||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))))});

