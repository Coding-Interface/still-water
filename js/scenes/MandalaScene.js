/**
 * MandalaScene — Mandala (Grown-ups) / Colour Garden (Kids).
 * Every mandala is generated: a seed picks the symmetry (5- to 12-fold), how
 * many rings there are, how wide each one is, and which shape fills it —
 * petals, lotus petals, teardrops, leaves, spikes, scallops, arches, stars,
 * dots and bands (and hearts for Kids). "New design" deals a fresh one; the
 * design number lets the same seed come back after a rotation.
 *
 * Pick a colour, tap a shape. With Mirror on (the default) every matching shape
 * in that ring fills at once; turn it off to colour shape by shape. Each ring
 * plays its own note. "Surprise me" fills the whole mandala with a harmonious set.
 */
class MandalaScene extends Phaser.Scene {
  static ADULT_COLORS = [0xc56f8a, 0xe8a5b5, 0xe8ae4c, 0xd98b5f, 0x6fae8c, 0x3f7a5f, 0x5b8a9a, 0x9b8fd6, 0xe9e4d6, 0x2b3a4a];
  static KID_COLORS = [0xff6fa8, 0xffc533, 0xff8a3d, 0x5fd38a, 0x4fb6ff, 0xa77bff, 0xff4f6a, 0xffffff];
  static NOTES = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];

  static ADULT_KINDS = ['petal', 'lotus', 'drop', 'leaf', 'spike', 'scallop', 'arch', 'dot', 'band', 'star'];
  static KID_KINDS = ['petal', 'heart', 'star', 'drop', 'scallop', 'dot', 'band', 'lotus'];

  constructor() {
    super('MandalaScene');
  }

  init(data) {
    this.seed = (data && data.seed) || MandalaScene.newSeed();
    this.fills = (data && data.fills) || null;
    this.colorIndex = (data && data.colorIndex) || 0;
    this.mirror = data && data.mirror != null ? data.mirror : true;
    this.done = false;
  }

  snapshot() {
    return { seed: this.seed, fills: this.fills, colorIndex: this.colorIndex, mirror: this.mirror };
  }

  static newSeed() {
    return Phaser.Math.Between(1000, 99999);
  }

  /** A small seeded random generator (mulberry32), so a design number always draws the same mandala. */
  static rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Build a design: [kind, inner, outer (fractions of R), count, angle offset in sectors].
   * Rings are kept wide enough to tap, and shapes are kept large enough to see.
   */
  static design(seed, kids, R) {
    const rnd = MandalaScene.rng(seed);
    const pick = (list) => list[Math.floor(rnd() * list.length)];
    const order = kids ? pick([5, 6, 6, 8]) : pick([6, 8, 8, 10, 12]);
    const ringCount = kids ? 4 + Math.floor(rnd() * 2) : 6 + Math.floor(rnd() * 3);
    const core = kids ? 0.14 + rnd() * 0.05 : 0.08 + rnd() * 0.06;
    const rings = [['disc', 0, core, 1, 0]];

    // widths of the remaining rings, randomly weighted
    const weights = [];
    for (let i = 1; i < ringCount; i++) weights.push(0.6 + rnd() * 0.9);
    const total = weights.reduce((a, b) => a + b, 0);
    let r0 = core;
    const kinds = kids ? MandalaScene.KID_KINDS : MandalaScene.ADULT_KINDS;
    let last = 'disc';
    weights.forEach((w, i) => {
      const r1 = i === weights.length - 1 ? 1 : r0 + ((1 - core) * w) / total;
      let kind = pick(kinds);
      let guard = 0;
      while ((kind === last || (kind === 'band' && r1 - r0 > 0.2)) && guard++ < 8) kind = pick(kinds);
      // a thin ring reads best as a band or dots
      if (r1 - r0 < 0.07) kind = rnd() < 0.5 ? 'band' : 'dot';
      const mid = ((r0 + r1) / 2) * R;
      let mult = pick(kind === 'band' || kind === 'dot' ? [1, 2, 2, 3] : [1, 1, 2]);
      if (i === 0) mult = 1;
      // keep each shape at least ~34 px across so a finger can hit it
      while (mult > 1 && (2 * Math.PI * mid) / (order * mult) < 34) mult -= 1;
      const count = Math.max(order, order * mult);
      const off = rnd() < 0.5 ? 0 : 0.5;
      rings.push([kind, r0, r1, count, off]);
      last = kind;
      r0 = r1;
    });
    return rings;
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.land = land;
    this.W = W;
    this.bowl = this.registry.get('bowl');
    this.colors = Theme.kids ? MandalaScene.KID_COLORS : MandalaScene.ADULT_COLORS;

    const bg = this.add.graphics();
    bg.fillGradientStyle(Palette.BG_TOP, Palette.BG_TOP, Palette.BG_BOTTOM, Palette.BG_BOTTOM, 1);
    bg.fillRect(0, 0, W, H);

    this.cx = land ? W * 0.36 : W / 2;
    this.cy = land ? H / 2 + 20 : 560;
    this.R = land ? 290 : 310;

    const halo = this.add.circle(this.cx, this.cy, this.R + 26, Theme.kids ? 0xffffff : Palette.MOON, Theme.kids ? 0.22 : 0.05);
    halo.setStrokeStyle(2, Theme.kids ? 0xffffff : Palette.MOON, Theme.kids ? 0.6 : 0.14);
    this.board = this.add.container(this.cx, this.cy);

    UIKit.leave(this);
    UIKit.text(this, W - 160, 62, GameLibrary.get('mandala').title, { display: true, size: 38, ox: 1, align: 'right' });
    const px = land ? W - 230 : W / 2;
    this.progressText = UIKit.text(this, px, land ? 136 : 150, '', { size: 21, weight: '600', color: Palette.css(Palette.SAFFRON) });
    this.designText = UIKit.text(this, px, land ? 168 : 182, '', { size: 18, color: Palette.css(Palette.MIST) });

    this.buildDesign(false);
    this.makeSwatches(land, W, H);
    this.makeButtons(land, W, H);

    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open) return;
      this.bowl.unlock();
      this.tapAt(p.lx, p.ly);
    });

    this.rest = new EyeRest(this);
    if (!this.fills.some((r) => r.some((c) => c != null))) UIKit.toast(this, GameLibrary.get('mandala').hint, land ? 140 : 220, 3400);
    WakeKeeper.hold();
  }

  /* ---------- design ---------- */

  buildDesign(fresh) {
    this.rings = MandalaScene.design(this.seed, Theme.kids, this.R);
    if (fresh || !this.fills || this.fills.length !== this.rings.length || this.fills.some((f, i) => f.length !== this.rings[i][3])) {
      this.fills = this.rings.map((r) => new Array(r[3]).fill(null));
    }
    this.done = false;
    this.cancelPending();
    this.tweens.killTweensOf(this.board);
    this.board.angle = 0;
    this.board.removeAll(true);
    this.buildShapes();
    this.designText.setText(`${Theme.pick('Design', 'Flower')} #${this.seed}  ·  ${this.rings.length} ${Theme.pick('rings', 'rings')}`);
    this.updateProgress(true);
  }

  /** Stop any colouring still on its way (Surprise me, mirrored fills) so it can't land on a new design. */
  cancelPending() {
    (this.pending || []).forEach((ev) => ev.remove(false));
    this.pending = [];
  }

  later(ms, fn) {
    if (!this.pending) this.pending = [];
    const ev = this.time.delayedCall(ms, () => {
      this.pending = this.pending.filter((e) => e !== ev);
      fn();
    });
    this.pending.push(ev);
  }

  newDesign() {
    if (this.rest.open) return;
    this.bowl.unlock();
    this.seed = MandalaScene.newSeed();
    this.board.setScale(0.9).setAlpha(0);
    this.buildDesign(true);
    this.tweens.add({ targets: this.board, scale: 1, alpha: 1, duration: 420, ease: 'Back.Out' });
    this.bowl.strike(Theme.kids ? 392 : 262, 0.1, 4);
  }

  /* ---------- shapes ---------- */

  buildShapes() {
    this.shapes = this.rings.map((ring, ri) => {
      const [kind, fi, fo, count, off] = ring;
      const rIn = fi * this.R;
      const rOut = fo * this.R;
      const step = (Math.PI * 2) / count;
      const list = [];
      for (let k = 0; k < count; k++) {
        const g = this.add.graphics();
        const a = -Math.PI / 2 + (k + off) * step;
        g.meta = { kind, rIn, rOut, a, step };
        this.board.add(g);
        list.push(g);
        this.drawShape(g, this.fills[ri][k]);
      }
      return list;
    });
  }

  /** The outline of one shape as points, in board coordinates. */
  static outline(meta) {
    const { kind, rIn, rOut, a, step } = meta;
    const rMid = (rIn + rOut) / 2;
    const depth = rOut - rIn;
    const tw = 2 * rMid * Math.sin(step / 2);
    const V = (x, y) => new Phaser.Math.Vector2(x, y);
    const polar = (r, ang) => V(Math.cos(ang) * r, Math.sin(ang) * r);
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    // local frame: u = outward along the ray, v = sideways
    const local = (u, v) => V(ux * u - uy * v, uy * u + ux * v);
    const pts = [];
    switch (kind) {
      case 'band': {
        const n = 12;
        for (let i = 0; i <= n; i++) pts.push(polar(rOut - 2, a - step / 2 + (i / n) * step));
        for (let i = n; i >= 0; i--) pts.push(polar(rIn + 2, a - step / 2 + (i / n) * step));
        break;
      }
      case 'leaf': {
        const half = Math.min(tw * 0.48, depth * 0.45);
        pts.push(local(rIn + 4, 0), local(rMid, half), local(rOut - 4, 0), local(rMid, -half));
        break;
      }
      case 'dot': {
        const r = Math.min(depth / 2, tw / 2) * 0.82;
        for (let i = 0; i < 24; i++) {
          const t = (i / 24) * Math.PI * 2;
          pts.push(local(rMid + Math.cos(t) * r, Math.sin(t) * r));
        }
        break;
      }
      case 'lotus':
      case 'drop': {
        // lotus: wide base, pointed tip outward. drop: pointed inward, round outward.
        const maxW = Math.min(tw * 0.48, depth * 0.42);
        const n = 16;
        const side = [];
        for (let i = 0; i <= n; i++) {
          const u = i / n;
          const uu = kind === 'lotus' ? u : 1 - u;
          const w = maxW * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * uu)), 0.85) * (1 - 0.2 * uu);
          side.push([rIn + 3 + u * (depth - 6), w]);
        }
        side.forEach(([r, w]) => pts.push(local(r, w)));
        for (let i = side.length - 1; i >= 0; i--) pts.push(local(side[i][0], -side[i][1]));
        break;
      }
      case 'spike': {
        const n = 8;
        for (let i = 0; i <= n; i++) pts.push(polar(rIn + 2, a - step * 0.46 + (i / n) * step * 0.92));
        pts.push(polar(rOut - 2, a));
        break;
      }
      case 'scallop': {
        // flat inner edge, a round bump on the outside
        const rB = rIn + depth * 0.35;
        const n = 16;
        for (let i = 0; i <= n; i++) {
          const f = i / n;
          const phi = (f - 0.5) * step;
          const k = Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.5) * 2, 2)));
          pts.push(polar(rB + (rOut - 2 - rB) * k, a + phi * 0.98));
        }
        for (let i = n; i >= 0; i--) pts.push(polar(rIn + 2, a - step / 2 + (i / n) * step * 0.98 + step * 0.01));
        break;
      }
      case 'arch': {
        // a pointed arch: straight outer edge, inner edge rising to a point
        const n = 16;
        for (let i = 0; i <= n; i++) pts.push(polar(rOut - 2, a - step * 0.48 + (i / n) * step * 0.96));
        for (let i = n; i >= 0; i--) {
          const f = i / n;
          const d = Math.abs(f - 0.5) * 2;
          const r = rIn + 2 + depth * 0.6 * (1 - Math.pow(1 - d, 0.6));
          pts.push(polar(Math.min(rOut - 6, r), a - step * 0.48 + f * step * 0.96));
        }
        break;
      }
      case 'star': {
        const r = Math.min(depth, tw) * 0.48;
        for (let i = 0; i < 10; i++) {
          const t = (i / 10) * Math.PI * 2;
          const rr = i % 2 ? r * 0.45 : r;
          pts.push(local(rMid + Math.cos(t) * rr, Math.sin(t) * rr));
        }
        break;
      }
      case 'heart': {
        const sz = Math.min(depth, tw) * 0.03;
        for (let i = 0; i < 32; i++) {
          const t = (i / 32) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          // the tip points to the centre
          pts.push(local(rMid + (hy + 2) * sz, hx * sz));
        }
        break;
      }
      default: {
        // petal: an egg-shaped ellipse pointing outward
        const len = depth * 0.98;
        const wid = Math.min(tw * 0.92, len * 0.75);
        for (let i = 0; i < 28; i++) {
          const t = (i / 28) * Math.PI * 2;
          const lx = Math.cos(t) * (len / 2);
          const ly = Math.sin(t) * (wid / 2) * (1 - 0.35 * Math.cos(t));
          pts.push(local(rMid + lx, ly));
        }
      }
    }
    return pts;
  }

  drawShape(g, color) {
    const kids = Theme.kids;
    const lineColor = kids ? 0xffffff : Palette.MOON;
    const lineAlpha = kids ? 0.95 : 0.45;
    const fill = color != null ? color : kids ? 0xffffff : Palette.NIGHT;
    const fillAlpha = color != null ? 1 : kids ? 0.18 : 0.35;
    g.clear();
    g.fillStyle(fill, fillAlpha);
    g.lineStyle(kids ? 3 : 1.5, lineColor, lineAlpha);
    if (g.meta.kind === 'disc') {
      g.fillCircle(0, 0, g.meta.rOut);
      g.strokeCircle(0, 0, g.meta.rOut);
      return;
    }
    const pts = MandalaScene.outline(g.meta);
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
  }

  tapAt(x, y) {
    const dx = x - this.cx;
    const dy = y - this.cy;
    const r = Math.hypot(dx, dy) / this.R;
    if (r > 1.03) return;
    const last = this.rings.length - 1;
    const ri = this.rings.findIndex((ring, i) => r >= ring[1] && (r < ring[2] || (i === last && r <= 1.03)));
    if (ri < 0) return;
    const [, , , count, off] = this.rings[ri];
    const step = (Math.PI * 2) / count;
    // undo the mandala's own spin before working out which shape was hit
    let ang = Math.atan2(dy, dx) - Phaser.Math.DegToRad(this.board.angle) + Math.PI / 2 - off * step;
    ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const k = Math.round(ang / step) % count;
    this.fill(ri, k);
  }

  fill(ri, k) {
    const color = this.colors[this.colorIndex];
    const count = this.rings[ri][3];
    const targets = this.mirror ? [...Array(count).keys()] : [k];
    targets.forEach((idx) => {
      this.fills[ri][idx] = color;
      const g = this.shapes[ri][idx];
      const dist = Math.min(Math.abs(idx - k), count - Math.abs(idx - k));
      this.later(this.mirror ? dist * 22 : 0, () => {
        this.drawShape(g, color);
        g.setScale(1.06);
        this.tweens.add({ targets: g, scale: 1, duration: 240, ease: 'Back.Out' });
      });
    });
    this.bowl.chime(MandalaScene.NOTES[ri % MandalaScene.NOTES.length] * (Theme.kids ? 2 : 1), 0.06);
    try {
      if (navigator.vibrate) navigator.vibrate(6);
    } catch (e) {
      /* not available */
    }
    this.updateProgress();
  }

  updateProgress(quiet) {
    const total = this.fills.reduce((s, r) => s + r.length, 0);
    const filled = this.fills.reduce((s, r) => s + r.filter((c) => c != null).length, 0);
    this.progressText.setText(filled === total ? Theme.pick('Complete. Take a moment to look.', 'All done! So pretty!') : `${filled} of ${total} ${Theme.pick('shapes coloured', 'shapes filled')}`);
    if (filled === total && !this.done) {
      this.done = true;
      if (!quiet) {
        this.bowl.fanfare();
        if (Theme.kids) this.bowl.sparkle();
      }
      this.tweens.add({ targets: this.board, angle: 360, duration: 24000, repeat: -1 });
    }
  }

  /* ---------- controls ---------- */

  makeSwatches(land, W, H) {
    this.swatches = [];
    const n = this.colors.length;
    const r = Theme.kids ? 30 : 26;
    const perRow = n > 8 ? 5 : 4;
    const gap = land ? (Theme.kids ? 84 : 74) : 92;
    const pos = (i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const rowCount = Math.min(perRow, n - row * perRow);
      const cx = land ? W - 230 : W / 2;
      const y0 = land ? 236 : 930;
      const rowGap = land ? 76 : 84;
      return { x: cx - ((rowCount - 1) * gap) / 2 + col * gap, y: y0 + row * rowGap };
    };
    this.colors.forEach((col, i) => {
      const p = pos(i);
      const c = this.add.container(p.x, p.y);
      const ring = this.add.circle(0, 0, r + 8);
      const dot = this.add.circle(0, 0, r, col, 1);
      dot.setStrokeStyle(2, Theme.kids ? 0xffffff : Palette.MOON, Theme.kids ? 0.9 : 0.35);
      c.add([ring, dot]);
      c.setSize(r * 2 + 12, r * 2 + 12);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.pickColor(i));
      this.swatches.push({ c, ring });
    });
    this.refreshSwatches();
  }

  pickColor(i) {
    this.colorIndex = i;
    this.bowl.tick();
    this.refreshSwatches();
  }

  refreshSwatches() {
    this.swatches.forEach((s, i) => {
      const on = i === this.colorIndex;
      s.ring.setStrokeStyle(on ? 4 : 0, Theme.kids ? Palette.SAFFRON : Palette.MOON, on ? 1 : 0);
      s.c.setScale(on ? 1.12 : 1);
    });
  }

  makeButtons(land, W, H) {
    const o = (w, accent) => ({ w, h: 64, size: 21, accent });
    let mirrorBtn;
    const label = () => mirrorBtn.label.setText(this.mirror ? 'Mirror: on' : 'Mirror: off');
    const toggle = () => {
      this.mirror = !this.mirror;
      this.bowl.tick();
      label();
    };
    if (land) {
      const cx = W - 230;
      mirrorBtn = UIKit.button(this, cx, 410, '', toggle, o(380, Palette.MIST));
      UIKit.button(this, cx, 490, Theme.pick('New design', 'New flower'), () => this.newDesign(), o(380, Palette.SAFFRON));
      UIKit.button(this, cx - 98, 570, Theme.pick('Surprise me', 'Magic!'), () => this.surprise(), o(184, Palette.LOTUS));
      UIKit.button(this, cx + 98, 570, Theme.pick('Clear', 'Start over'), () => this.clearAll(), o(184, Palette.MIST));
    } else {
      UIKit.button(this, W / 2, 1106, Theme.pick('New design', 'New flower'), () => this.newDesign(), o(300, Palette.SAFFRON));
      mirrorBtn = UIKit.button(this, W / 2 - 220, 1192, '', toggle, o(200, Palette.MIST));
      UIKit.button(this, W / 2, 1192, Theme.pick('Surprise me', 'Magic!'), () => this.surprise(), o(200, Palette.LOTUS));
      UIKit.button(this, W / 2 + 220, 1192, Theme.pick('Clear', 'Start over'), () => this.clearAll(), o(200, Palette.MIST));
    }
    label();
  }

  surprise() {
    this.bowl.unlock();
    const pal = Phaser.Utils.Array.Shuffle(this.colors.slice()).slice(0, 4);
    this.rings.forEach((ring, ri) => {
      const color = pal[ri % pal.length];
      this.later(ri * 140, () => {
        this.fills[ri] = this.fills[ri].map(() => color);
        this.shapes[ri].forEach((g) => this.drawShape(g, color));
        this.bowl.chime(MandalaScene.NOTES[ri % MandalaScene.NOTES.length] * (Theme.kids ? 2 : 1), 0.05);
        if (ri === this.rings.length - 1) this.updateProgress();
      });
    });
  }

  clearAll() {
    this.bowl.unlock();
    this.cancelPending();
    this.done = false;
    this.tweens.killTweensOf(this.board);
    this.board.angle = 0;
    this.fills = this.rings.map((r) => new Array(r[3]).fill(null));
    this.shapes.forEach((list) => list.forEach((g) => this.drawShape(g, null)));
    this.updateProgress();
    this.bowl.strike(196, 0.1, 3);
  }

  update(time, delta) {
    this.rest.tick(delta);
  }
}
