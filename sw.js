// sw.js
self.addEventListener('install', event => {
  // Immediately take control of the page
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  // Become available to all pages
  event.waitUntil(self.clients.claim());
});
