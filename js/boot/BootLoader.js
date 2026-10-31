/**
 * BootLoader — the first thing anyone sees. Shows a breathing lotus, a progress
 * bar and small relatable tips while Phaser, the fonts and every game file load.
 * Scripts load in parallel but run in order (async = false). When everything is
 * ready it starts the game; SplashScene calls BootLoader.hide() once it is drawn.
 */
class BootLoader {
  static PHASER = 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.80.1/phaser.min.js';

  static FILES = [
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

  static KID_TIPS = [
    'Wiggle your fingers while you wait.',
    'Take a big balloon breath in… and out.',
    'Can you spot something blue near you?',
    'Do a big stretch, up to the sky.',
    'Getting the bubbles ready to pop…'
  ];

  static TIPS = [
    'Unclench your jaw while you wait.',
    'Let your shoulders drop an inch.',
    'Breathe in slowly, and let it go.',
    'Your inbox can wait a minute.',
    'Soften your eyes. Nothing to read yet.',
    'Feel your feet resting on the floor.',
    'Nothing needs fixing right now.',
    'Loosen your grip on the phone a little.'
  ];

  static MIN_MS = 1800;
  static instance = null;

  static start() {
    BootLoader.instance = new BootLoader();
    BootLoader.instance.run();
  }

  /** Called by SplashScene when the first frame is on screen. */
  static hide() {
    if (BootLoader.instance) BootLoader.instance.finish();
  }

  constructor() {
    this.el = document.getElementById('loader');
    this.bar = document.getElementById('loader-bar');
    this.tipEl = document.getElementById('loader-tip');
    this.errEl = document.getElementById('loader-error');
    this.target = 0;
    this.shown = 0;
    this.phaserDone = false;
    this.failed = false;
    this.done = false;
    this.t0 = performance.now();
    // Style the loader for whoever played last, before the game code arrives.
    let profile = 'adults';
    try {
      profile = window.localStorage.getItem('still-water-profile-v1') || 'adults';
    } catch (e) {
      /* storage unavailable */
    }
    document.documentElement.dataset.profile = profile === 'kids' ? 'kids' : 'adults';
    this.tips = profile === 'kids' ? BootLoader.KID_TIPS : BootLoader.TIPS;
    this.tipIndex = Math.floor(Math.random() * this.tips.length);
  }

  /** Installable app: register the offline worker when hosted on its own (not inside a frame). */
  static registerWorker() {
    try {
      if (!('serviceWorker' in navigator) || window.self !== window.top) return;
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
      navigator.serviceWorker.register('sw.js').catch(() => {});
    } catch (e) {
      /* not available here */
    }
  }

  run() {
    BootLoader.registerWorker();
    if (this.tipEl) this.tipEl.textContent = this.tips[this.tipIndex];
    this.tipTimer = setInterval(() => this.nextTip(), 2800);
    this.loop();
    this.loadAll();
  }

  loop() {
    const step = () => {
      if (this.done) return;
      // Creep forward while the engine downloads, so the bar never looks stuck.
      if (!this.phaserDone && !this.failed) this.target = Math.min(46, this.target + 0.1);
      this.shown += (this.target - this.shown) * 0.08;
      if (this.bar) this.bar.style.width = this.shown.toFixed(1) + '%';
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  addScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load ' + src));
      document.body.appendChild(s);
    });
  }

  loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const all = Promise.all([
      document.fonts.load('40px "Marcellus"'),
      document.fonts.load('400 20px "Figtree"'),
      document.fonts.load('500 20px "Figtree"'),
      document.fonts.load('600 20px "Figtree"'),
      document.fonts.load('500 20px "Fredoka"'),
      document.fonts.load('600 20px "Fredoka"')
    ]).catch(() => {});
    return Promise.race([all, new Promise((r) => setTimeout(r, 3000))]);
  }

  async loadAll() {
    const fonts = this.loadFonts();
    const share = 44 / BootLoader.FILES.length;
    try {
      const jobs = [BootLoader.PHASER, ...BootLoader.FILES].map((src, i) =>
        this.addScript(src).then(() => {
          if (i === 0) {
            this.phaserDone = true;
            this.target = Math.max(this.target, 50);
          } else {
            this.target = Math.min(94, this.target + share);
          }
        })
      );
      await Promise.all(jobs);
      await fonts;
      const wait = BootLoader.MIN_MS - (performance.now() - this.t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.target = 100;
      StillWaterApp.start();
      // Safety net: never leave the loader up if the splash fails to report in.
      setTimeout(() => this.finish(), 8000);
    } catch (e) {
      this.fail();
    }
  }

  nextTip() {
    if (!this.tipEl || this.failed) return;
    this.tipEl.classList.add('is-fading');
    setTimeout(() => {
      this.tipIndex = (this.tipIndex + 1) % this.tips.length;
      this.tipEl.textContent = this.tips[this.tipIndex];
      this.tipEl.classList.remove('is-fading');
    }, 500);
  }

  fail() {
    this.failed = true;
    clearInterval(this.tipTimer);
    if (this.tipEl) this.tipEl.hidden = true;
    if (this.errEl) this.errEl.hidden = false;
    const retry = document.getElementById('loader-retry');
    if (retry) retry.addEventListener('click', () => window.location.reload());
  }

  finish() {
    if (this.done || !this.el) return;
    this.done = true;
    clearInterval(this.tipTimer);
    if (this.bar) this.bar.style.width = '100%';
    setTimeout(() => {
      this.el.classList.add('is-done');
      setTimeout(() => this.el.remove(), 900);
    }, 250);
  }
}

BootLoader.start();
