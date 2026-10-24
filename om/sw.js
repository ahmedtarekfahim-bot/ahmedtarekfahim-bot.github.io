/* أوفلاين: الواجهة والمحتوى بيتخزنوا أول مرة، والصور بتتخزن أول ما تتفتح */
var V = "om-1.1.0-202610241100";
var IMG = "om-img";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "assets/ai.js", "assets/app.css", "assets/core.js", "assets/diagrams.js", "assets/icon.png", "assets/speech.js", "content/basics%201%20om%20fundamentals.js", "content/basics%202%20electricity.js", "content/elec%201%20lv%20distribution.js", "content/elec%202%20transformers%20mv.js", "content/elec%203%20generators.js", "content/elec%204%20ups%20batteries.js", "content/elec%205%20earthing%20lightning.js", "content/elec%206%20motors%20vfd.js", "content/elec%207%20solar%20pv.js", "content/fire%20alarm.js", "content/fire%20clean%20agent.js", "content/fire%20pumps.js", "content/fire%20sprinklers.js", "content/fm%201%20maintenance%20management.js", "content/general%201%20calcs%20paths%20glossary.js", "content/home%201%20washer%20fridge.js", "content/home%202%20cooking.js", "content/home%203%20small%20appliances.js", "content/home%204%20plumbing%20electrical.js", "content/home%205%20civil%20carpentry.js", "content/hvac%20ahu%20fcu.js", "content/hvac%20chillers.js", "content/hvac%20cooling%20towers.js", "content/hvac%20split%20dx.js", "content/hvac%20ventilation.js", "content/hvac%20vrf.js", "content/low%201%20bms.js", "content/low%202%20elv%20systems.js", "content/manifest.js", "content/plumb%20drainage.js", "content/plumb%20water%20supply.js", "content/rot%201%20pumps.js", "content/rot%202%20compressors.js", "content/rot%203%20vibration%20alignment.js", "content/rules%201%20rules%20of%20thumb.js", "content/vt%201%20elevators.js", "content/zz%20photos.js"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V && k !== IMG && k !== "om-tts"; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (/\/img\//.test(url.pathname)) {
    e.respondWith(caches.open(IMG).then(function (c) {
      return c.match(url.pathname).then(function (hit) {
        return hit || fetch(e.request).then(function (r) { if (r.ok) c.put(url.pathname, r.clone()); return r; });
      });
    }));
    return;
  }
  /* الشبكة الأول عشان التحديثات توصل، والكاش لو مفيش نت */
  e.respondWith(fetch(e.request, {cache: "no-cache"}).then(function (r) {
    if (r.ok) { var cp = r.clone(); caches.open(V).then(function (c) { c.put(e.request, cp); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, {ignoreSearch: true}).then(function (r) { return r || caches.match("index.html"); });
  }));
});
