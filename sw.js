const CACHE = "2fakss-v3";
const LOCAL = ["./", "index.html", "manifest.json", "my-list.js", "icon-192.png", "icon-512.png"];
const REMOTE = ["https://cdn.tailwindcss.com/", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(LOCAL);
    await Promise.allSettled(REMOTE.map(async u => c.put(u, await fetch(u, { mode: "no-cors" }))));
  }).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const save = (req, res) => {
  if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
};

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).pathname.endsWith("/my-list.js")) {
    // الشبكة أولاً حتى تظهر الإضافات الجديدة
    e.respondWith(fetch(req, { cache: "no-cache" }).then(r => save(req, r)).catch(() => caches.match(req)));
  } else if (req.mode === "navigate") {
    // الشبكة أولاً لتصل التحديثات، والنسخة المحفوظة عند انقطاع الإنترنت
    e.respondWith(fetch(req).then(r => save(req, r)).catch(async () => (await caches.match(req)) || caches.match("index.html")));
  } else {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => save(req, r))));
  }
});
