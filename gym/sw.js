/* offline cache: app shell first, images and fonts cached as they load */
var V = "gym-v2";
var SHELL = ["./", "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  var shell = url.origin === location.origin && !/\/img\//.test(url.pathname);
  if (shell) {
    /* network first for the app code so updates arrive, cache as fallback offline */
    e.respondWith(fetch(e.request).then(function (r) {
      var cp = r.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); return r;
    }).catch(function () { return caches.match(e.request).then(function (r) { return r || caches.match("index.html"); }); }));
  } else {
    e.respondWith(caches.match(e.request).then(function (r) {
      return r || fetch(e.request).then(function (res) {
        if (res.ok || res.type === "opaque") { var cp = res.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); }
        return res;
      });
    }));
  }
});
