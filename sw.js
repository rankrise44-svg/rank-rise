/* RankRise — offline cache for the expo stand.
   Only registered on a device in expo mode (see expo.js). Pages are
   network-first, so edits still arrive when there's Wi-Fi; everything else
   is cache-first. The whole site is stored on install, so if the expo
   Wi-Fi drops the stand keeps running. */
const CACHE = 'rr-expo-v1';
const CORE = [
  '/', '/index.html', '/case.html', '/expo.js', '/projects.js', '/cases.js',
  '/assets/vendor/qrcode.min.js', '/og-image.jpg', '/assets/entry-earth.jpg',
  '/assets/reel/hero-basketball.mp4', '/assets/reel/paraglide.mp4', '/assets/reel/diving.mp4',
  '/assets/reel/parkour.mp4', '/assets/reel/action.mp4', '/assets/reel/everywhere.mp4',
  '/assets/reel/poster-hero.jpg', '/assets/reel/poster-paraglide.jpg', '/assets/reel/poster-diving.jpg',
  '/assets/reel/poster-parkour.jpg', '/assets/reel/poster-action.jpg', '/assets/reel/poster-everywhere.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(CORE.map(u => c.add(u).catch(() => {})));
    /* then every image and video the portfolio and case studies point at */
    try {
      const txt = (await (await fetch('/cases.js')).text()) + (await (await fetch('/projects.js')).text()) + (await (await fetch('/index.html')).text());
      const urls = [...new Set((txt.match(/assets\/[\w\-./]+\.(?:jpe?g|png|webp|svg|mp4|webm|gif)/g) || []).map(u => '/' + u))];
      await Promise.all(urls.map(u => c.match(u).then(hit => hit || c.add(u).catch(() => {}))));
    } catch (err) {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* a stored copy that came through a redirect can't answer a page load as-is */
const clean = r => r && r.redirected ? new Response(r.body, { status: r.status, headers: r.headers }) : r;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;
  /* Safari asks for video in byte ranges: answer those from the stored file */
  if (req.headers.get('range')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(url.pathname);
      if (!hit) return fetch(req);
      const buf = await hit.arrayBuffer();
      const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range')) || [];
      const start = +m[1] || 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
      return new Response(buf.slice(start, end + 1), { status: 206, headers: {
        'Content-Type': hit.headers.get('Content-Type') || 'video/mp4',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
        'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
    })());
    return;
  }

  const isPage = req.mode === 'navigate' || /\.(html|js)$/.test(url.pathname) || url.pathname === '/';
  if (isPage && !fonts) {
    /* network first, fall back to the stored copy after 3s or when offline */
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const net = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3000))]);
        if (net && net.ok) c.put(req, net.clone());
        return net;
      } catch (err) {
        /* any stored case page can render any case: it reads the id itself */
        return clean((await c.match(req)) || (await c.match(req, { ignoreSearch: true })) || (await c.match('/')));
      }
    })());
    return;
  }
  /* everything else: cache first, fill the cache as we go */
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const net = await fetch(req);
      if (net && (net.ok || net.type === 'opaque')) c.put(req, net.clone());
      return net;
    } catch (err) {
      return Response.error();
    }
  })());
});
