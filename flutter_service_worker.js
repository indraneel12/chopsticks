'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';
const RESOURCES = {
  "assets/AssetManifest.json": "23982392b912059085a05df07c610443",
"assets/assets/fonts/google_fonts/CaveatBrush-Regular.ttf": "91a4b7550bea09847dec3314935df7fa",
"assets/assets/fonts/google_fonts/GochiHand-Regular.ttf": "319efb23a00725e69f7cc0ae75c93644",
"assets/assets/fonts/google_fonts/RubikPuddles-Regular.ttf": "440d6b492309c75ef08b849dd5ce66b5",
"assets/assets/fonts/google_fonts/TitanOne-Regular.ttf": "b75cef631740a9d35337319918e98779",
"assets/assets/icons/bots/indrubot.png": "1f7a838be04b07b9d70b36a9d7c21c31",
"assets/assets/icons/draw-by-moves.png": "6c34ebdc1880dcc650cf9a970a8faa76",
"assets/assets/icons/draw-by-repetitions.png": "9dea4786f56e57e6e386a5a6e2f760c6",
"assets/assets/icons/hint.png": "8c24dd57e9bc2fde8e4f522531aa1e88",
"assets/assets/icons/logo.png": "5c4afd0db0086b1d40869d4bdc28ea45",
"assets/assets/icons/players/bot.png": "5f019cf702a25c2a787ec29803c6cb63",
"assets/assets/icons/players/human.png": "2b82e001c0c892e629cd468ea3bb73d4",
"assets/assets/icons/play_from_position.png": "e8c88f21679d2ea882930a153dfd875f",
"assets/assets/icons/redo.png": "682a891d6b72956b0bcbfe80003874b7",
"assets/assets/icons/restart.png": "a04fa21cd0886ece77bca50ecb88dc25",
"assets/assets/icons/undo.png": "23ccce241ed88e5e2b8225a5bc8183e3",
"assets/assets/images/author.jpg": "a3f00314dc53aec06bd2042efa9ca403",
"assets/assets/images/chat_bubble.png": "fc721b583e9c86c19da57c3f55f4850c",
"assets/assets/images/logo.png": "5c4afd0db0086b1d40869d4bdc28ea45",
"assets/FontManifest.json": "14245cfe911b03e5000bc4231a8f49d2",
"assets/fonts/MaterialIcons-Regular.otf": "7e7a6cccddf6d7b20012a548461d5d81",
"assets/NOTICES": "d56737ffac193e868fb3d1b205a2e47d",
"favicon.ico": "9e7fc03d4a74aa2340223b2f4a548db4",
"index.html": "44c00c4a4de9abd2153e596a5981dab2",
"/": "44c00c4a4de9abd2153e596a5981dab2",
"main.dart.js": "225033899ed02b60ed00b6ff17225618",
"manifest.json": "8ab03dbea48dcf99db093b167581da6f",
"version.json": "9512cfcd629b40d10eb23bd08614bcf4"
};

// The application shell files that are downloaded before a service worker can
// start.
const CORE = [
  "/",
"main.dart.js",
"index.html",
"assets/NOTICES",
"assets/AssetManifest.json",
"assets/FontManifest.json"];
// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});

// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});

// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache.
        return response || fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
    })
  );
});

self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});

// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}

// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
