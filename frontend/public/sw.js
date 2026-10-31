// Minimal service worker so browsers offer "Install app". No caching on purpose:
// the inbox and campaign data must always be live.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
