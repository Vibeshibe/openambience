const CACHE = 'openambience-shell-0.4.0-alpha.5';
const FILES = ['./', './index.html', './styles.css', './app.js', './js/state.js', './js/audio.js', './js/media-session.js', './js/media-transport.js', './js/catalog.js', './js/storage.js', './js/categories.js', './js/radio.js', './audio/credits.json', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('./audio/credits.json', { cache: 'reload' });
    if (!response.ok) throw new Error('The sound catalog is unavailable.');
    const catalog = await response.json();
    const cache = await caches.open(CACHE);
    await cache.addAll([...FILES, ...catalog.sounds.map(sound => sound.url)]);
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('openambience-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    return cached || fetch(event.request);
  }));
});
