/* offline cache: the app is cached on first open; recorded voices are kept in their own cache */
var V = "kids-v3";
var AUDIO = "kids-audio";
var SHELL = ["./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest", "audio/index.json", "fonts/fredoka.woff2", "fonts/baloo-ar.woff2", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V && k !== AUDIO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (/\/audio\/(en1|en2|ar)\/[0-9a-f]+\.mp3$/.test(url.pathname)) {
    /* recordings never change (file name = hash of the text): cache first */
    e.respondWith(caches.open(AUDIO).then(function (c) {
      return c.match(url.pathname).then(function (hit) {
        return hit || fetch(e.request).then(function (r) { if (r.ok) c.put(url.pathname, r.clone()); return r; });
      });
    }));
    return;
  }
  /* network first so updates arrive, cache when offline */
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, {ignoreSearch: true}).then(function (r) { return r || caches.match("index.html"); });
  }));
});
