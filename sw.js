/**
 * Still Water service worker — makes the app installable and playable offline
 * when it is hosted on its own site. (It is not used inside the Claude viewer.)
 * Strategy: app files are cached on install and served cache-first; the game
 * engine and fonts are cached the first time they load.
 */
const CACHE = 'still-water-v6';
const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'js/boot/BootLoader.js',
  'js/config/Palette.js',
  'js/config/Theme.js',
  'js/system/BestScores.js',
  'js/config/PracticeLibrary.js',
  'js/config/GameLibrary.js',
  'js/config/MoodLibrary.js',
  'js/system/SoundBowl.js',
  'js/system/WakeKeeper.js',
  'js/system/ProgressStore.js',
  'js/ui/Layout.js',
  'js/ui/UIKit.js',
  'js/ui/Glyphs.js',
  'js/system/EyeRest.js',
  'js/system/Burst.js',
  'js/system/FullscreenPrompt.js',
  'js/system/AppRouter.js',
  'js/objects/NightSky.js',
  'js/objects/Lotus.js',
  'js/objects/Balloon.js',
  'js/objects/ThoughtCloud.js',
  'js/objects/Koi.js',
  'js/scenes/SplashScene.js',
  'js/scenes/HudScene.js',
  'js/scenes/MenuScene.js',
  'js/scenes/SmashScene.js',
  'js/scenes/SliceScene.js',
  'js/scenes/BreakerScene.js',
  'js/scenes/TossScene.js',
  'js/scenes/LanternScene.js',
  'js/scenes/TangleScene.js',
  'js/scenes/BubbleScene.js',
  'js/scenes/MandalaScene.js',
  'js/scenes/SandScene.js',
  'js/scenes/KoiScene.js',
  'js/scenes/FlowScene.js',
  'js/scenes/CairnScene.js',
  'js/scenes/RiverScene.js',
  'js/scenes/FeastScene.js',
  'js/scenes/BreathScene.js',
  'js/scenes/CloudScene.js',
  'js/scenes/MalaScene.js',
  'js/scenes/EndScene.js',
  'js/main.js'
];
const RUNTIME_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !RUNTIME_HOSTS.includes(url.hostname)) return;
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
