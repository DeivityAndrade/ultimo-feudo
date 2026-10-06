/* Service worker: permite jogar offline e instalar como aplicativo.
   Código (html/js/css) vem da rede primeiro, para receber atualizações;
   modelos 3D e bibliotecas vêm do cache primeiro (são grandes e não mudam). */
const CACHE = 'ultimo-feudo-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  // pedidos parciais (músicas em streaming) vão direto para a rede: o cache não aceita respostas 206
  if (req.headers.has('range')) return;
  const url = new URL(req.url);
  const heavy = url.pathname.includes('/assets/') || url.pathname.includes('/js/vendor/');
  if (heavy) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.status === 200) c.put(req, res.clone());
      return res;
    }));
  } else {
    e.respondWith(fetch(req).then((res) => {
      if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
  }
});
