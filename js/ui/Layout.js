/**
 * Layout — the two layout shapes the app is designed for, and helpers for
 * placing things in either.
 *   Portrait   720 × 1280 (phones, tablets held upright)
 *   Landscape 1280 × 720  (desktops, tablets and phones held sideways)
 *
 * Sharp rendering: the canvas itself is drawn at AppRouter.k times the layout
 * size (k = the screen's real pixels per layout pixel, 1 to 2), and every
 * camera zooms by k. Scenes keep working in layout units: use Layout.W/H for
 * the size and pointer.lx / pointer.ly for touch positions.
 */
class Layout {
  static PORTRAIT = { w: 720, h: 1280 };
  static LANDSCAPE = { w: 1280, h: 720 };

  /** The layout shape for a viewport of w × h CSS pixels. */
  static target(w, h) {
    return w > h * 1.05 ? Layout.LANDSCAPE : Layout.PORTRAIT;
  }

  static W(scene) {
    return scene.scale.width / AppRouter.k;
  }

  static H(scene) {
    return scene.scale.height / AppRouter.k;
  }

  static info(scene) {
    const W = Layout.W(scene);
    const H = Layout.H(scene);
    return { W, H, land: W > H, cx: W / 2, cy: H / 2 };
  }

  static land(scene) {
    return Layout.W(scene) > Layout.H(scene);
  }

  /** Pick a value by orientation: Layout.by(scene, portraitValue, landscapeValue). */
  static by(scene, portrait, landscape) {
    return Layout.land(scene) ? landscape : portrait;
  }

  /** Adds pointer.lx / pointer.ly: the touch position in layout units. */
  static installPointer() {
    const proto = Phaser.Input.Pointer.prototype;
    if (Object.getOwnPropertyDescriptor(proto, 'lx')) return;
    Object.defineProperty(proto, 'lx', { get() { return this.x / AppRouter.k; } });
    Object.defineProperty(proto, 'ly', { get() { return this.y / AppRouter.k; } });
  }
}
