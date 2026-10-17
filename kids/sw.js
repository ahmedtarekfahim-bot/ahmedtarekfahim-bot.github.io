/* offline cache: the whole app is cached on first open so it works without internet */
var V = "kids-v1";
var SHELL = ["./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest", "fonts/fredoka.woff2", "fonts/baloo-ar.woff2", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  /* network first so updates arrive, cache when offline */
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, {ignoreSearch: true}).then(function (r) { return r || caches.match("index.html"); });
  }));
});
