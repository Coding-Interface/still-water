/**
 * AppRouter — app-wide navigation glue.
 *  - Soft fade into every scene.
 *  - Keeps the HUD informed of which scene is showing.
 *  - Orientation: switches the canvas between portrait (720 × 1280) and
 *    landscape (1280 × 720) when the device rotates or the window changes shape,
 *    then restarts the scene so it lays itself out again. Scenes may offer
 *    snapshot() to carry their level or score across the switch.
 *  - Profile: switching between Kids and Grown-ups re-themes and restarts.
 *  - Phone back button / browser back: leaving a game returns to home
 *    instead of leaving the app (one "#play" history entry while in a game).
 *  - Keyboard: Esc = home, M = sound, F = full screen.
 *  - Full screen where the browser allows it.
 */
class AppRouter {
  static game = null;
  static current = null;
  static pushed = false;
  static ignoreNext = false;
  static resizeTimer = null;
  static k = 1; // render scale: real screen pixels per layout pixel (1 to 2)
  static HOME_SCENES = ['SplashScene', 'MenuScene', 'HudScene'];

  /** The canvas shape that suits the stage element right now. */
  static targetSize() {
    const el = document.getElementById('stage');
    const w = (el && el.clientWidth) || window.innerWidth;
    const h = (el && el.clientHeight) || window.innerHeight;
    return Layout.target(w, h);
  }

  /** Render scale for a layout shape: how many real pixels each layout pixel covers. */
  static computeK(t) {
    const el = document.getElementById('stage');
    const w = (el && el.clientWidth) || window.innerWidth;
    const h = (el && el.clientHeight) || window.innerHeight;
    const fit = Math.min(w / t.w, h / t.h);
    const k = fit * (window.devicePixelRatio || 1);
    return Math.max(1, Math.min(2, Math.ceil(k * 4) / 4));
  }

  /** Every camera draws layout units at the render scale, from the top-left corner. */
  static zoomCamera(scene) {
    const cam = scene.cameras && scene.cameras.main;
    if (!cam) return;
    cam.setOrigin(0, 0);
    cam.setZoom(AppRouter.k);
  }

  static init(game) {
    AppRouter.game = game;
    if (game.scene.scenes.length) AppRouter.wire();
    else game.events.once('ready', () => AppRouter.wire());

    window.addEventListener('keydown', (e) => AppRouter.onKey(e));
    window.addEventListener('hashchange', () => AppRouter.onHash());
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((t) =>
      document.addEventListener(t, () => {
        const full = AppRouter.isFullscreen();
        game.events.emit('sw:fullscreen', full);
        if (!full) FullscreenPrompt.onExit();
        AppRouter.queueRelayout();
      })
    );
    const relayout = () => AppRouter.queueRelayout();
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', relayout);

    try {
      if (window.location.hash === '#play') history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
      /* ignore */
    }
  }

  static wire() {
    const game = AppRouter.game;
    game.scene.scenes.forEach((scene) => {
      const key = scene.sys.settings.key;
      scene.sys.events.on('create', () => AppRouter.zoomCamera(scene));
      if (key === 'HudScene') return;
      scene.sys.events.on('create', () => {
        const c = Phaser.Display.Color.IntegerToRGB(Palette.NIGHT);
        scene.cameras.main.fadeIn(280, c.r, c.g, c.b);
        AppRouter.current = key;
        game.events.emit('sw:scene', key);
        AppRouter.syncHash(key);
      });
    });
    game.scene.start('HudScene');
    const first = AppRouter.activeScene();
    if (first) AppRouter.zoomCamera(first);
    if (first && !AppRouter.current) {
      AppRouter.current = first.sys.settings.key;
      game.events.emit('sw:scene', AppRouter.current);
    }
  }

  /* ---------- orientation ---------- */

  static queueRelayout() {
    clearTimeout(AppRouter.resizeTimer);
    AppRouter.resizeTimer = setTimeout(() => AppRouter.relayout(), 220);
  }

  static relayout() {
    const game = AppRouter.game;
    if (!game) return;
    const t = AppRouter.targetSize();
    const curW = game.scale.width / AppRouter.k;
    const curH = game.scale.height / AppRouter.k;
    const newK = AppRouter.computeK(t);
    const shapeChanged = Math.round(curW) !== t.w || Math.round(curH) !== t.h;
    // Small window resizes keep the current sharpness so play is not interrupted.
    if (!shapeChanged && Math.abs(newK - AppRouter.k) < 0.5) {
      game.scale.refresh();
      return;
    }
    AppRouter.k = newK;
    game.scale.setGameSize(Math.round(t.w * newK), Math.round(t.h * newK));
    AppRouter.restartAll();
  }

  /** Restart the visible scene (keeping what it can) and the HUD. */
  static restartAll() {
    const game = AppRouter.game;
    const s = AppRouter.activeScene();
    if (s) {
      let data = Object.assign({}, s.sys.settings.data || {});
      if (typeof s.snapshot === 'function') {
        try {
          data = Object.assign(data, s.snapshot());
        } catch (e) {
          /* keep going without it */
        }
      }
      s.scene.restart(data);
    }
    const hud = game.scene.getScene('HudScene');
    if (hud && hud.sys.isActive()) hud.scene.restart();
  }

  /* ---------- profile ---------- */

  static setProfile(profile) {
    Theme.apply(profile);
    Theme.save(profile);
    AppRouter.restartAll();
  }

  /* ---------- history ---------- */

  static inGame(key = AppRouter.current) {
    return !!key && !AppRouter.HOME_SCENES.includes(key);
  }

  static syncHash(key) {
    try {
      if (AppRouter.inGame(key)) {
        if (window.location.hash !== '#play') {
          window.location.hash = 'play';
          AppRouter.pushed = true;
        }
      } else if (AppRouter.pushed && window.location.hash === '#play') {
        AppRouter.pushed = false;
        AppRouter.ignoreNext = true;
        history.back();
      }
    } catch (e) {
      /* history unavailable in this frame */
    }
  }

  static onHash() {
    if (AppRouter.ignoreNext) {
      AppRouter.ignoreNext = false;
      return;
    }
    if (window.location.hash !== '#play' && AppRouter.inGame()) {
      AppRouter.pushed = false;
      AppRouter.home();
    }
  }

  static activeScene() {
    if (!AppRouter.game) return null;
    return AppRouter.game.scene.getScenes(true).find((s) => s.sys.settings.key !== 'HudScene') || null;
  }

  static home() {
    const s = AppRouter.activeScene();
    if (!s || !AppRouter.inGame(s.sys.settings.key)) return;
    WakeKeeper.release();
    s.scene.start('MenuScene');
  }

  /* ---------- keys, sound, full screen ---------- */

  static onKey(e) {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if (e.key === 'Escape') AppRouter.home();
    else if (e.key === 'm' || e.key === 'M') AppRouter.toggleSound();
    else if ((e.key === 'f' || e.key === 'F') && AppRouter.canFullscreen()) AppRouter.toggleFullscreen();
  }

  static toggleSound() {
    const game = AppRouter.game;
    if (!game) return;
    const bowl = game.registry.get('bowl');
    bowl.unlock();
    bowl.setMuted(!bowl.muted);
    if (!bowl.muted) setTimeout(() => bowl.tick(), 30);
    game.events.emit('sw:sound', bowl.muted);
  }

  static isIPhone() {
    return /iPhone|iPod/.test(navigator.userAgent || '');
  }

  static canFullscreen() {
    const d = document;
    if (AppRouter.isIPhone()) return false;
    return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  }

  static isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  /** Installed to the home screen and opened like an app. */
  static isStandalone() {
    try {
      return (
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: standalone)').matches ||
        navigator.standalone === true
      );
    } catch (e) {
      return false;
    }
  }

  /** Returns a promise that resolves to true when full screen was entered or left. */
  static toggleFullscreen() {
    const d = document;
    const el = d.documentElement;
    try {
      if (AppRouter.isFullscreen()) {
        const p = (d.exitFullscreen || d.webkitExitFullscreen).call(d);
        return Promise.resolve(p).then(() => true, () => false);
      }
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) return Promise.resolve(false);
      const p = req.call(el, { navigationUI: 'hide' });
      return Promise.resolve(p).then(
        () => {
          try {
            if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
          } catch (e) {
            /* ignore */
          }
          return true;
        },
        () => false
      );
    } catch (e) {
      return Promise.resolve(false);
    }
  }
}
