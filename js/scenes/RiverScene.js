/**
 * RiverScene — River Guide (Grown-ups) / Water Slides (Kids). A game.
 * A spout pours water without stopping. Draw channels with your finger to lead
 * the stream into the garden's pots; each pot that fills grows its plant into
 * flower. Fill every pot to finish the level. Tap a channel to wash it away,
 * or Undo the last one. Less channel used earns more stars.
 *
 * The water is a small particle simulation (gravity, sliding along channels,
 * rolling off stones), drawn as soft overlapping blobs so it reads as a stream.
 *
 * Every level is solvable. Stones and ledges are only placed where they keep:
 *  - the spout's first drop clear,
 *  - an open space above every pot, and
 *  - a straight, wide corridor from the spout to each pot,
 * so a single straight channel along that corridor always delivers the water
 * (the solvability test in development draws exactly that line for every pot).
 * The water never runs out, so there is no way to get stuck.
 */
class RiverScene extends Phaser.Scene {
  static DROP_R = 7;
  static LINE_T = 10;
  static GRAVITY = 900;
  static EMIT_PER_SEC = 30;
  static MAX_DROPS = 300;
  static CELL = 48;

  constructor() {
    super('RiverScene');
  }

  init(data) {
    this.level = (data && data.level) || ProgressStore.getBest('river') + 1;
    this.drops = [];
    this.lines = [];
    this.drawing = null;
    this.solved = false;
    this.emitAcc = 0;
    this.t = 0;
    this.lastNote = 0;
  }

  snapshot() {
    return { level: this.level };
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.W = W;
    this.H = H;
    this.land = land;
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.C = this.kids
      ? {
          skyTop: 0x7cc8ff, skyBottom: 0xd8f1ff, hill: 0x6fcf6a, hillDark: 0x4fb35a, line: 0xff8a3d, lineHi: 0xffd08a,
          water: 0x2fa8f5, waterDeep: 0x1c7fd0, waterHi: 0xe4f6ff, rock: 0xb9a48c, rockHi: 0xe0d0bb, ledge: 0xc08a5a,
          pot: 0xe07a4f, potDark: 0xb35a38, soil: 0x6b4a2f, stem: 0x3f9a45, leaf: 0x5fd38a, blooms: [0xff6fa8, 0xffc533, 0xa77bff, 0xff4f6a]
        }
      : {
          skyTop: 0x0f1d24, skyBottom: 0x1e3a35, hill: 0x23402c, hillDark: 0x152a1d, line: 0x9c7a4f, lineHi: 0xd8bf8a,
          water: 0x4fa6cc, waterDeep: 0x2f7a9c, waterHi: 0xd2eef8, rock: 0x5c5852, rockHi: 0x8f8a80, ledge: 0x6b5338,
          pot: 0x8f8a80, potDark: 0x5c5852, soil: 0x3a2c22, stem: 0x4f7a4a, leaf: 0x6fae8c, blooms: [0xe8a5b5, 0xe9e4d6, 0xc56f8a, 0x9b8fd6]
        };
    this.P = land ? { x: 30, y: 96, w: W - 470, h: H - 112 } : { x: 24, y: 224, w: W - 48, h: 916 };

    this.drawBackdrop();
    this.staticG = this.add.graphics();
    this.linesG = this.add.graphics();
    this.plantG = this.add.graphics();
    this.waterG = this.add.graphics();
    this.previewG = this.add.graphics();
    this.spoutG = this.add.graphics();

    UIKit.leave(this);
    UIKit.text(this, W - 160, 62, GameLibrary.get('river').title, { display: true, size: 38, ox: 1, align: 'right' });
    const ink = Theme.pick(Palette.css(Palette.MIST), '#1d3f6b');
    const accent = Theme.kids ? Palette.SAFFRON : Palette.MIST;
    if (land) {
      const px = W - 410;
      this.levelText = UIKit.text(this, px, 170, '', { size: 28, weight: '600', ox: 0, align: 'left' });
      this.infoText = UIKit.text(this, px, 212, '', { size: 21, ox: 0, align: 'left', wrap: 370, color: ink });
      this.doneText = UIKit.text(this, W - 225, 320, '', { display: true, size: 34, wrap: 380, color: Palette.css(Palette.LOTUS) });
      this.undoBtn = UIKit.button(this, W - 315, 440, 'Undo', () => this.undo(), { w: 170, h: 68, size: 22, accent });
      this.clearBtn = UIKit.button(this, W - 130, 440, Theme.pick('Wash away', 'Clear'), () => this.clearLines(), { w: 170, h: 68, size: 22, accent });
      this.mainBtn = UIKit.button(this, W - 225, 540, '', () => this.onMain(), { w: 350, h: 76, accent: Theme.kids ? Palette.SAFFRON : Palette.LOTUS });
    } else {
      this.levelText = UIKit.text(this, 34, 136, '', { size: 26, weight: '600', ox: 0, align: 'left' });
      this.infoText = UIKit.text(this, 34, 174, '', { size: 21, ox: 0, align: 'left', wrap: 650, color: ink });
      this.doneText = UIKit.text(this, W / 2, 420, '', { display: true, size: 40, wrap: 600, color: Palette.css(Palette.LOTUS) }).setDepth(40);
      this.undoBtn = UIKit.button(this, 130, 1200, 'Undo', () => this.undo(), { w: 200, h: 76, size: 24, accent });
      this.clearBtn = UIKit.button(this, W / 2, 1200, Theme.pick('Wash away', 'Clear'), () => this.clearLines(), { w: 200, h: 76, size: 24, accent });
      this.mainBtn = UIKit.button(this, W - 130, 1200, '', () => this.onMain(), { w: 220, h: 76, size: 24, accent: Theme.kids ? Palette.SAFFRON : Palette.LOTUS });
    }

    this.bindInput();
    this.rest = new EyeRest(this);
    if (this.bowl.ctx) this.stream = this.bowl.startStream();
    this.newLevel();
    UIKit.toast(this, GameLibrary.get('river').hint, land ? 640 : 250);
    WakeKeeper.hold();
    this.events.once('shutdown', () => {
      if (this.stream) this.stream.stop();
      this.stream = null;
    });
  }

  /* ---------- the garden ---------- */

  drawBackdrop() {
    const { W, H, C, P } = this;
    const g = this.add.graphics();
    g.fillGradientStyle(C.skyTop, C.skyTop, C.skyBottom, C.skyBottom, 1);
    g.fillRect(0, 0, W, H);
    // rolling hills behind the garden
    const hill = (y, amp, col, phase) => {
      g.fillStyle(col, 1);
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x / 140 + phase) * amp + Math.sin(x / 61 + phase * 2) * amp * 0.3);
      g.lineTo(W, H);
      g.closePath();
      g.fillPath();
    };
    hill(H * 0.62, 30, C.hill, 0.5);
    hill(H * 0.78, 22, C.hillDark, 2.1);
    if (this.kids) {
      g.fillStyle(0xfff3a8, 1);
      g.fillCircle(W - 90, 150, 46);
      g.fillStyle(0xffffff, 0.9);
      [[120, 110], [W * 0.55, 90]].forEach(([x, y]) => {
        [[-36, 6, 64, 40], [0, -8, 80, 60], [38, 6, 66, 44]].forEach(([dx, dy, w, h]) => g.fillEllipse(x + dx, y + dy, w, h));
      });
    } else {
      for (let i = 0; i < 40; i++) {
        g.fillStyle(0xffffff, Math.random() * 0.5 + 0.1);
        g.fillCircle(Math.random() * W, Math.random() * H * 0.45, Math.random() * 1.4 + 0.4);
      }
      g.fillStyle(Palette.MOON, 0.9);
      g.fillCircle(W - 90, 150, 26);
    }
    // the play field: a faint frame so you know where you can draw
    g.fillStyle(0xffffff, this.kids ? 0.12 : 0.03);
    g.fillRoundedRect(P.x, P.y, P.w, P.h, 26);
    g.lineStyle(2, 0xffffff, this.kids ? 0.4 : 0.1);
    g.strokeRoundedRect(P.x, P.y, P.w, P.h, 26);
  }

  /* ---------- level generation ---------- */

  newLevel() {
    this.drops = [];
    this.lines = [];
    this.drawing = null;
    this.solved = false;
    this.inkUsed = 0;
    this.doneText.setText('');
    this.mainBtn.label.setText(Theme.pick('New level', 'New level'));
    let lvl = null;
    for (let tries = 0; tries < 60 && !lvl; tries++) lvl = this.generate();
    if (!lvl) lvl = this.generate(true);
    Object.assign(this, lvl);
    this.rebuildSegments();
    this.drawStatic();
    this.drawLines();
    this.drawPlants();
    this.levelText.setText(`Level ${this.level}`);
    this.updateInfo();
  }

  /**
   * Build one level. Returns null when a random layout breaks a rule, so the
   * caller simply tries again; `simple` makes a layout that always passes.
   */
  generate(simple) {
    const P = this.P;
    const L = this.level;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const potW = 120;
    const potH = 86;
    const nPots = simple ? 1 : Math.min(3, 1 + Math.floor((L - 1) / 3));
    const need = Math.min(this.kids ? 55 : 70, (this.kids ? 30 : 38) + L * 3);

    const src = { x: rnd(P.x + 90, P.x + P.w - 90), y: P.y + 70 };
    const pots = [];
    for (let i = 0; i < nPots; i++) {
      let ok = false;
      for (let k = 0; k < 40 && !ok; k++) {
        const x = rnd(P.x + potW / 2 + 20, P.x + P.w - potW / 2 - 20);
        const y = rnd(P.y + P.h * 0.6, P.y + P.h - potH - 30);
        // never right under the spout (you have to guide the water), and never crowded
        if (Math.abs(x - src.x) < potW / 2 + 60) continue;
        if (pots.some((p) => Math.abs(p.x - x) < potW + 50)) continue;
        pots.push({ x, y, w: potW, h: potH, count: 0, need, full: false, bloom: 0, color: this.C.blooms[i % this.C.blooms.length] });
        ok = true;
      }
      if (!ok) return simple ? this.fallback(src, need, potW, potH) : null;
    }

    // corridors: spout → just over the near rim of each pot, kept clear of every obstacle
    const corridors = pots.map((p) => {
      const dir = Math.sign(p.x - src.x) || 1;
      // ending over the middle of the pot, just above the rim, lets the far wall catch fast water
      return { x1: src.x - dir * 24, y1: src.y + 46, x2: p.x, y2: p.y - 14 };
    });
    this.corridors = corridors;
    // a corridor must not run through a different pot (that pot would catch the water)
    for (let i = 0; i < pots.length; i++) {
      const c = corridors[i];
      for (let j = 0; j < pots.length; j++) {
        if (i === j) continue;
        const q = pots[j];
        for (let k = 0; k <= 20; k++) {
          const x = c.x1 + ((c.x2 - c.x1) * k) / 20;
          const y = c.y1 + ((c.y2 - c.y1) * k) / 20;
          if (x > q.x - q.w / 2 - 40 && x < q.x + q.w / 2 + 40 && y > q.y - 60 && y < q.y + q.h + 20) return null;
        }
      }
    }
    const clearOf = (x, y, r) => {
      if (Math.abs(x - src.x) < r + 60 && y < src.y + 230) return false;
      for (const p of pots) {
        if (x + r > p.x - p.w / 2 - 40 && x - r < p.x + p.w / 2 + 40 && y + r > p.y - 190 && y - r < p.y + p.h + 10) return false;
      }
      for (const c of corridors) if (RiverScene.distToSeg(x, y, c.x1, c.y1, c.x2, c.y2) < r + 50) return false;
      return true;
    };

    const rocks = [];
    const ledges = [];
    if (!simple) {
      const nRocks = Math.min(7, 1 + L);
      for (let i = 0, k = 0; i < nRocks && k < 200; k++) {
        const r = rnd(26, 52);
        const x = rnd(P.x + r, P.x + P.w - r);
        const y = rnd(src.y + 120, P.y + P.h - 60);
        if (!clearOf(x, y, r)) continue;
        if (rocks.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 26)) continue;
        rocks.push({ x, y, r });
        i++;
      }
      const nLedges = L >= 3 ? Math.min(4, L - 2) : 0;
      for (let i = 0, k = 0; i < nLedges && k < 200; k++) {
        const len = rnd(110, 190);
        const ang = rnd(-0.5, 0.5);
        const cx = rnd(P.x + 70, P.x + P.w - 70);
        const cy = rnd(src.y + 140, P.y + P.h - 80);
        const dx = (Math.cos(ang) * len) / 2;
        const dy = (Math.sin(ang) * len) / 2;
        // sample along the ledge to be sure every part keeps the rules
        let fine = true;
        for (let s = 0; s <= 4 && fine; s++) {
          const x = cx - dx + (2 * dx * s) / 4;
          const y = cy - dy + (2 * dy * s) / 4;
          if (x < P.x + 10 || x > P.x + P.w - 10 || !clearOf(x, y, 12)) fine = false;
          if (rocks.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + 30)) fine = false;
        }
        if (!fine) continue;
        ledges.push({ x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy });
        i++;
      }
    }
    // the par: roughly the length of the channels a tidy player would draw
    const par = corridors.reduce((s, c) => s + Math.hypot(c.x2 - c.x1, c.y2 - c.y1) * 0.85, 0);
    return { src, pots, rocks, ledges, par };
  }

  /** A tiny, certain layout in case random placement keeps failing (very rare). */
  fallback(src, need, potW, potH) {
    const P = this.P;
    const x = src.x < P.x + P.w / 2 ? P.x + P.w - potW : P.x + potW;
    const pot = { x, y: P.y + P.h - potH - 40, w: potW, h: potH, count: 0, need, full: false, bloom: 0, color: this.C.blooms[0] };
    return { src, pots: [pot], rocks: [], ledges: [], par: Math.hypot(pot.x - src.x, pot.y - src.y) * 0.85 };
  }

  static distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy || 1;
    const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /* ---------- collision geometry ---------- */

  /** Every solid line (walls, pots, ledges, drawn channels) bucketed into a grid. */
  rebuildSegments() {
    const P = this.P;
    const segs = [];
    const add = (x1, y1, x2, y2, t, kind) => segs.push({ x1, y1, x2, y2, t, kind });
    add(P.x, P.y, P.x, P.y + P.h, 6, 'wall');
    add(P.x + P.w, P.y, P.x + P.w, P.y + P.h, 6, 'wall');
    this.pots.forEach((p) => {
      const l = p.x - p.w / 2;
      const r = p.x + p.w / 2;
      add(l, p.y, l + 12, p.y + p.h, 10, 'pot');
      add(l + 12, p.y + p.h, r - 12, p.y + p.h, 10, 'pot');
      add(r - 12, p.y + p.h, r, p.y, 10, 'pot');
    });
    this.ledges.forEach((e) => add(e.x1, e.y1, e.x2, e.y2, 14, 'ledge'));
    this.lines.forEach((ln) => {
      for (let i = 1; i < ln.pts.length; i++) add(ln.pts[i - 1].x, ln.pts[i - 1].y, ln.pts[i].x, ln.pts[i].y, RiverScene.LINE_T, 'line');
    });
    this.segs = segs;
    const C = RiverScene.CELL;
    const grid = new Map();
    segs.forEach((s) => {
      const pad = s.t / 2 + RiverScene.DROP_R + 2;
      const x0 = Math.floor((Math.min(s.x1, s.x2) - pad) / C);
      const x1 = Math.floor((Math.max(s.x1, s.x2) + pad) / C);
      const y0 = Math.floor((Math.min(s.y1, s.y2) - pad) / C);
      const y1 = Math.floor((Math.max(s.y1, s.y2) + pad) / C);
      for (let gx = x0; gx <= x1; gx++)
        for (let gy = y0; gy <= y1; gy++) {
          const key = gx * 10000 + gy;
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(s);
        }
    });
    this.grid = grid;
  }

  /* ---------- drawing ---------- */

  drawStatic() {
    const g = this.staticG;
    const C = this.C;
    g.clear();
    this.rocks.forEach((r) => {
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(r.x + 4, r.y + r.r * 0.75, r.r * 1.9, r.r * 0.5);
      g.fillStyle(C.rock, 1);
      g.fillCircle(r.x, r.y, r.r);
      g.fillStyle(C.rockHi, 0.55);
      g.fillCircle(r.x - r.r * 0.3, r.y - r.r * 0.32, r.r * 0.45);
      g.fillStyle(this.kids ? 0x6cc36a : 0x3d6b45, 0.85);
      g.fillEllipse(r.x + r.r * 0.2, r.y - r.r * 0.86, r.r * 0.9, r.r * 0.32);
    });
    this.ledges.forEach((e) => {
      g.lineStyle(16, 0x000000, 0.2);
      g.lineBetween(e.x1 + 3, e.y1 + 5, e.x2 + 3, e.y2 + 5);
      g.lineStyle(14, C.ledge, 1);
      g.lineBetween(e.x1, e.y1, e.x2, e.y2);
      g.lineStyle(3, 0xffffff, 0.2);
      g.lineBetween(e.x1, e.y1 - 4, e.x2, e.y2 - 4);
    });
    this.drawSpout();
  }

  drawSpout() {
    const g = this.spoutG;
    const { x, y } = this.src;
    const C = this.C;
    const top = this.P.y - 30;
    g.clear();
    if (this.kids) {
      // a bright pipe and tap
      g.fillStyle(0x4fb6ff, 1);
      g.fillRoundedRect(x - 14, top, 28, y - top - 12, 8);
      g.fillStyle(0xffffff, 0.4);
      g.fillRect(x - 9, top, 6, y - top - 14);
      g.fillStyle(0xff4f6a, 1);
      g.fillRoundedRect(x - 26, y - 34, 52, 26, 12);
      g.fillStyle(0xffffff, 0.5);
      g.fillRoundedRect(x - 20, y - 31, 40, 8, 4);
      g.fillStyle(0xc8d3dd, 1);
      g.fillRoundedRect(x - 11, y - 10, 22, 16, 5);
    } else {
      // a bamboo spout from a mossy stone
      g.fillStyle(0x4f7a4a, 1);
      g.fillRoundedRect(x - 12, top, 24, y - top + 4, 8);
      for (let ny = top + 26; ny < y; ny += 34) {
        g.fillStyle(0x2f4f2c, 1);
        g.fillRect(x - 13, ny, 26, 4);
      }
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(x - 7, top, 5, y - top);
      g.fillStyle(0x2b2620, 1);
      g.fillEllipse(x, y + 4, 22, 8);
    }
    // the mouth always shows water welling out
    g.fillStyle(C.water, 0.9);
    g.fillEllipse(x, y + 6, 16, 10);
  }

  drawLines() {
    const g = this.linesG;
    const C = this.C;
    g.clear();
    const stroke = (pts, alpha) => {
      g.lineStyle(RiverScene.LINE_T + 6, 0x000000, 0.22 * alpha);
      g.beginPath();
      g.moveTo(pts[0].x + 2, pts[0].y + 4);
      pts.forEach((p) => g.lineTo(p.x + 2, p.y + 4));
      g.strokePath();
      g.lineStyle(RiverScene.LINE_T + 2, C.line, alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      pts.forEach((p) => g.lineTo(p.x, p.y));
      g.strokePath();
      g.lineStyle(3, C.lineHi, 0.8 * alpha);
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y - 3);
      pts.forEach((p) => g.lineTo(p.x, p.y - 3));
      g.strokePath();
      g.fillStyle(C.line, alpha);
      g.fillCircle(pts[0].x, pts[0].y, (RiverScene.LINE_T + 2) / 2);
      g.fillCircle(pts[pts.length - 1].x, pts[pts.length - 1].y, (RiverScene.LINE_T + 2) / 2);
    };
    this.lines.forEach((ln) => stroke(ln.pts, 1));
  }

  drawPlants() {
    const g = this.plantG;
    const C = this.C;
    g.clear();
    this.pots.forEach((p) => {
      const l = p.x - p.w / 2;
      const r = p.x + p.w / 2;
      const prog = Math.min(1, p.count / p.need);
      // pot
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(p.x + 4, p.y + p.h + 8, p.w * 1.05, 18);
      g.fillStyle(C.pot, 1);
      g.fillPoints([{ x: l - 4, y: p.y }, { x: r + 4, y: p.y }, { x: r - 10, y: p.y + p.h + 4 }, { x: l + 10, y: p.y + p.h + 4 }], true);
      g.fillStyle(C.potDark, 1);
      g.fillRoundedRect(l - 8, p.y - 6, p.w + 16, 16, 6);
      // water rising inside
      const inner = p.h - 14;
      const wl = p.y + p.h - 4 - inner * prog;
      if (prog > 0) {
        // the surface ripples, more while water is pouring in
        const wave = (x) => wl + Math.sin(x * 0.12 + this.t * 6 + p.x) * 2.2 + Math.sin(x * 0.29 - this.t * 9) * 1.2;
        const pts = [];
        for (let x = l + 12; x <= r - 12; x += 6) pts.push({ x, y: wave(x) });
        pts.push({ x: r - 12, y: wave(r - 12) }, { x: r - 12, y: p.y + p.h - 4 }, { x: l + 12, y: p.y + p.h - 4 });
        g.fillStyle(C.waterDeep, 0.9);
        g.fillPoints(pts, true);
        const top = pts.slice(0, pts.length - 2).map((q) => ({ x: q.x, y: q.y + 3 }));
        g.fillStyle(C.water, 0.95);
        g.fillPoints(top.concat([{ x: r - 12, y: p.y + p.h - 4 }, { x: l + 12, y: p.y + p.h - 4 }]), true);
        g.lineStyle(2, C.waterHi, 0.75);
        g.beginPath();
        pts.slice(0, pts.length - 2).forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
        g.strokePath();
      }
      // soil line and the plant growing out of it
      g.fillStyle(C.soil, 1);
      g.fillEllipse(p.x, p.y + 2, p.w - 10, 10);
      const stemH = 16 + prog * 92;
      g.lineStyle(5, C.stem, 1);
      g.lineBetween(p.x, p.y, p.x, p.y - stemH);
      const leaf = (yy, dir, size) => {
        g.fillStyle(C.leaf, 1);
        g.fillEllipse(p.x + dir * size * 0.6, yy, size * 1.2, size * 0.55);
      };
      leaf(p.y - 10, -1, 18);
      if (prog > 0.3) leaf(p.y - stemH * 0.45, 1, 22);
      if (prog > 0.6) leaf(p.y - stemH * 0.7, -1, 20);
      const head = p.y - stemH;
      if (prog >= 1) {
        const b = p.bloom;
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + 0.3;
          g.fillStyle(p.color, 1);
          g.fillEllipse(p.x + Math.cos(a) * 14 * b, head + Math.sin(a) * 14 * b, 18 * b + 4, 12 * b + 3);
        }
        g.fillStyle(this.kids ? 0xffe066 : 0xe8ae4c, 1);
        g.fillCircle(p.x, head, 7 + 3 * b);
      } else {
        g.fillStyle(C.leaf, 1);
        g.fillEllipse(p.x, head - 4, 12, 16);
        g.fillStyle(p.color, 0.8);
        g.fillEllipse(p.x, head - 9, 7, 8 * Math.max(0.3, prog));
      }
      if (p.full) {
        g.lineStyle(3, 0xffffff, 0.75);
        g.strokeCircle(p.x + p.w / 2 - 6, p.y - 20, 12);
        g.lineBetween(p.x + p.w / 2 - 12, p.y - 20, p.x + p.w / 2 - 7, p.y - 14);
        g.lineBetween(p.x + p.w / 2 - 7, p.y - 14, p.x + p.w / 2 + 1, p.y - 26);
      }
    });
  }

  updateInfo() {
    const full = this.pots.filter((p) => p.full).length;
    const pct = Math.round((this.inkUsed / Math.max(1, this.par)) * 100);
    this.infoText.setText(
      `${full} of ${this.pots.length} ${Theme.pick('plants watered', 'flowers watered')}  ·  ${Theme.pick('channel', 'slide')} ${pct}% of par`
    );
  }

  /* ---------- input ---------- */

  bindInput() {
    const inField = (x, y) => x > this.P.x + 4 && x < this.P.x + this.P.w - 4 && y > this.P.y + 4 && y < this.P.y + this.P.h - 4;
    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open) return;
      this.bowl.unlock();
      if (!this.stream) this.stream = this.bowl.startStream();
      if (!inField(p.lx, p.ly) || this.solved) return;
      this.drawing = { pts: [{ x: p.lx, y: p.ly }], start: { x: p.lx, y: p.ly } };
    });
    this.input.on('pointermove', (p) => {
      if (!this.drawing || !p.isDown) return;
      const x = Phaser.Math.Clamp(p.lx, this.P.x + 6, this.P.x + this.P.w - 6);
      const y = Phaser.Math.Clamp(p.ly, this.P.y + 6, this.P.y + this.P.h - 6);
      const last = this.drawing.pts[this.drawing.pts.length - 1];
      if (Math.hypot(x - last.x, y - last.y) >= 14) {
        this.drawing.pts.push({ x, y });
        this.drawPreview();
      }
    });
    this.input.on('pointerup', (p) => {
      if (!this.drawing) return;
      const d = this.drawing;
      this.drawing = null;
      this.previewG.clear();
      const len = RiverScene.length(d.pts);
      if (d.pts.length >= 2 && len >= 24) {
        this.lines.push({ pts: RiverScene.smooth(d.pts) });
        this.inkUsed += len;
        this.bowl.tok(0.45);
        this.rebuildSegments();
        this.drawLines();
        this.updateInfo();
      } else {
        this.eraseNear(d.start.x, d.start.y);
      }
    });
  }

  static length(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return s;
  }

  /** Light smoothing so hand-drawn channels don't have tiny kinks that trap water. */
  static smooth(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      out.push({ x: (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4, y: (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4 });
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  drawPreview() {
    const g = this.previewG;
    const pts = this.drawing.pts;
    g.clear();
    g.lineStyle(RiverScene.LINE_T + 2, this.C.line, 0.55);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    pts.forEach((p) => g.lineTo(p.x, p.y));
    g.strokePath();
  }

  eraseNear(x, y) {
    let best = -1;
    let bestD = 26;
    this.lines.forEach((ln, i) => {
      for (let k = 1; k < ln.pts.length; k++) {
        const d = RiverScene.distToSeg(x, y, ln.pts[k - 1].x, ln.pts[k - 1].y, ln.pts[k].x, ln.pts[k].y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    });
    if (best < 0) return;
    this.lines.splice(best, 1);
    this.washEffect();
    this.rebuildSegments();
    this.drawLines();
  }

  undo() {
    if (this.rest.open || !this.lines.length) return;
    this.bowl.unlock();
    this.lines.pop();
    this.washEffect();
    this.rebuildSegments();
    this.drawLines();
  }

  clearLines() {
    if (this.rest.open || !this.lines.length) return;
    this.bowl.unlock();
    this.lines = [];
    this.washEffect();
    this.rebuildSegments();
    this.drawLines();
  }

  washEffect() {
    this.bowl.whoosh();
  }

  onMain() {
    if (this.rest.open) return;
    this.bowl.unlock();
    if (this.solved) this.level += 1;
    this.newLevel();
  }

  /* ---------- the water ---------- */

  update(time, delta) {
    this.rest.tick(delta);
    if (!this.src) return;
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;

    // the spout never stops
    this.emitAcc += dt * RiverScene.EMIT_PER_SEC;
    while (this.emitAcc >= 1) {
      this.emitAcc -= 1;
      if (this.drops.length >= RiverScene.MAX_DROPS) this.drops.shift();
      this.drops.push({ x: this.src.x + Phaser.Math.FloatBetween(-3, 3), y: this.src.y + 10, vx: Phaser.Math.FloatBetween(-12, 12), vy: 80, age: 0 });
    }

    const steps = 3;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) this.step(h);
    this.settleDrops(dt);
    if (this.spray) {
      for (const p of this.spray) {
        p.vy += RiverScene.GRAVITY * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      this.spray = this.spray.filter((p) => p.life > 0);
    }
    this.drawPlants();
    if (this.stream) this.stream.set(Math.min(0.6, 0.15 + this.drops.length / 600));
    this.drawWater();
  }

  step(h) {
    const R = RiverScene.DROP_R;
    const CELL = RiverScene.CELL;
    const maxV = 600;
    for (const d of this.drops) {
      if (d.foam > 0) d.foam -= h * 2.5;
      d.vy += RiverScene.GRAVITY * h;
      const sp = Math.hypot(d.vx, d.vy);
      if (sp > maxV) {
        d.vx *= maxV / sp;
        d.vy *= maxV / sp;
      }
      d.x += d.vx * h;
      d.y += d.vy * h;

      const list = this.grid.get(Math.floor(d.x / CELL) * 10000 + Math.floor(d.y / CELL));
      if (list) {
        for (const sg of list) {
          const dx = sg.x2 - sg.x1;
          const dy = sg.y2 - sg.y1;
          const l2 = dx * dx + dy * dy || 1;
          const t = Phaser.Math.Clamp(((d.x - sg.x1) * dx + (d.y - sg.y1) * dy) / l2, 0, 1);
          const cx = sg.x1 + t * dx;
          const cy = sg.y1 + t * dy;
          const ox = d.x - cx;
          const oy = d.y - cy;
          const dist = Math.hypot(ox, oy);
          const rad = R + sg.t / 2;
          if (dist < rad && dist > 0.0001) {
            const nx = ox / dist;
            const ny = oy / dist;
            d.x = cx + nx * rad;
            d.y = cy + ny * rad;
            const vn = d.vx * nx + d.vy * ny;
            if (vn < 0) {
              if (vn < -200) this.impact(d, nx, ny, -vn);
              d.vx -= 1.12 * vn * nx;
              d.vy -= 1.12 * vn * ny;
            }
            d.vx *= 0.999;
            d.vy *= 0.999;
          }
        }
      }
      for (const r of this.rocks) {
        const ox = d.x - r.x;
        const oy = d.y - r.y;
        const dist = Math.hypot(ox, oy);
        const rad = R + r.r;
        if (dist < rad && dist > 0.0001) {
          const nx = ox / dist;
          const ny = oy / dist;
          d.x = r.x + nx * rad;
          d.y = r.y + ny * rad;
          const vn = d.vx * nx + d.vy * ny;
          if (vn < 0) {
            if (vn < -200) this.impact(d, nx, ny, -vn);
            d.vx -= 1.15 * vn * nx;
            d.vy -= 1.15 * vn * ny;
          }
        }
      }
    }
  }

  /** A drop hitting something hard turns foamy and throws up a little spray. */
  impact(d, nx, ny, speed) {
    d.foam = 1;
    if (!this.spray) this.spray = [];
    if (this.spray.length > 90 || Math.random() > 0.5) return;
    const tx = -ny;
    const ty = nx;
    for (let i = 0; i < 2; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const k = Phaser.Math.FloatBetween(0.25, 0.5) * speed;
      this.spray.push({
        x: d.x,
        y: d.y,
        vx: nx * k + tx * side * Phaser.Math.FloatBetween(40, 140),
        vy: ny * k + ty * side * Phaser.Math.FloatBetween(40, 140) - 60,
        life: Phaser.Math.FloatBetween(0.25, 0.5),
        r: Phaser.Math.FloatBetween(1.6, 3.2)
      });
    }
  }

  /** Drops that reach a pot are counted; drops that leave the garden are let go. */
  settleDrops(dt) {
    const P = this.P;
    let changed = false;
    const keep = [];
    for (const d of this.drops) {
      d.age += dt;
      if (d.y > P.y + P.h + 30 || d.age > 30) continue;
      let gone = false;
      for (const p of this.pots) {
        if (d.x > p.x - p.w / 2 + 10 && d.x < p.x + p.w / 2 - 10 && d.y > p.y + 8 && d.y < p.y + p.h) {
          gone = true;
          if (d.vy > 250) this.impact({ x: d.x, y: Math.max(d.y, p.y + 10) }, 0, -1, d.vy * 0.6);
          if (!p.full) {
            p.count += 1;
            changed = true;
            this.note(p);
            if (p.count >= p.need) this.potFull(p);
          }
          break;
        }
      }
      if (!gone) keep.push(d);
    }
    this.drops = keep;
    if (changed) this.drawPlants();
  }

  /** Filling a pot plays a soft rising scale, never faster than a few notes a second. */
  note(p) {
    if (this.time.now - this.lastNote < 140) return;
    this.lastNote = this.time.now;
    const scale = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const i = Math.min(scale.length - 1, Math.floor((p.count / p.need) * scale.length));
    this.bowl.chime(scale[i], 0.035);
  }

  potFull(p) {
    p.full = true;
    p.bloom = 0;
    this.tweens.add({ targets: p, bloom: 1, duration: 700, ease: 'Back.Out', onUpdate: () => this.drawPlants() });
    this.bowl.strike(523.25, 0.08, 3);
    if (this.kids) this.bowl.sparkle(0.6);
    this.updateInfo();
    if (this.pots.every((q) => q.full)) this.onSolved();
  }

  onSolved() {
    this.solved = true;
    ProgressStore.setBest('river', this.level);
    const ratio = this.inkUsed / Math.max(1, this.par);
    const stars = ratio <= 1.25 ? 3 : ratio <= 2 ? 2 : 1;
    this.time.delayedCall(500, () => this.bowl.fanfare());
    this.doneText.setText(`${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}\n${Theme.pick('The garden is watered', 'Every flower is happy!')}`).setAlpha(0);
    this.tweens.add({ targets: this.doneText, alpha: 1, duration: 500, delay: 300 });
    this.mainBtn.label.setText('Next level');
  }

  /**
   * The stream is drawn as one connected body: neighbouring drops are joined by
   * thick strokes, every drop is stretched along its motion, a light sheen runs
   * along the top, and drops that have just hit something turn to white foam,
   * with a fine spray flying off.
   */
  drawWater() {
    const g = this.waterG;
    const C = this.C;
    const R = RiverScene.DROP_R;
    const drops = this.drops;
    g.clear();

    // find close neighbours with a quick grid
    const cell = R * 3;
    const grid = new Map();
    drops.forEach((d, i) => {
      const key = Math.floor(d.x / cell) * 4096 + Math.floor(d.y / cell);
      let list = grid.get(key);
      if (!list) grid.set(key, (list = []));
      list.push(i);
    });
    const links = [];
    const near = R * 2.9;
    drops.forEach((d, i) => {
      const cx = Math.floor(d.x / cell);
      const cy = Math.floor(d.y / cell);
      for (let ox = -1; ox <= 1; ox++)
        for (let oy = -1; oy <= 1; oy++) {
          const list = grid.get((cx + ox) * 4096 + cy + oy);
          if (!list) continue;
          for (const j of list) {
            if (j <= i) continue;
            const e = drops[j];
            if (Math.abs(e.x - d.x) < near && Math.abs(e.y - d.y) < near && Math.hypot(e.x - d.x, e.y - d.y) < near) links.push(d, e);
          }
        }
    });
    const tail = (d) => ({ x: d.x - d.vx * 0.02, y: d.y - d.vy * 0.02 });

    // 1. the darker edge of the water
    g.lineStyle(R * 2 + 5, C.waterDeep, 1);
    for (let k = 0; k < links.length; k += 2) g.lineBetween(links[k].x, links[k].y, links[k + 1].x, links[k + 1].y);
    for (const d of drops) {
      const t = tail(d);
      g.lineBetween(d.x, d.y, t.x, t.y);
    }
    // 2. the body
    g.lineStyle(R * 2, C.water, 1);
    for (let k = 0; k < links.length; k += 2) g.lineBetween(links[k].x, links[k].y, links[k + 1].x, links[k + 1].y);
    for (const d of drops) {
      const t = tail(d);
      g.lineBetween(d.x, d.y, t.x, t.y);
    }
    g.fillStyle(C.water, 1);
    for (const d of drops) g.fillCircle(d.x, d.y, R);
    // 3. a sheen along the upper side, as light catches the surface
    g.lineStyle(2.2, C.waterHi, 0.55);
    for (let k = 0; k < links.length; k += 2) {
      const a = links[k];
      const b = links[k + 1];
      g.lineBetween(a.x - 1, a.y - R * 0.45, b.x - 1, b.y - R * 0.45);
    }
    for (const d of drops) {
      const sp = Math.hypot(d.vx, d.vy);
      if (sp > 260) {
        g.fillStyle(C.waterHi, Math.min(0.8, sp / 900));
        g.fillCircle(d.x - (d.vx / sp) * 3, d.y - (d.vy / sp) * 3 - 2, 1.8);
      }
      // 4. foam where it has just struck something
      if (d.foam > 0) {
        g.fillStyle(0xffffff, 0.75 * d.foam);
        g.fillCircle(d.x + Math.sin(d.x + this.t * 20) * 2, d.y - 1, R * 0.55 * (0.6 + d.foam * 0.6));
      }
    }
    // 5. fine spray
    if (this.spray) {
      for (const p of this.spray) {
        g.fillStyle(C.waterHi, Math.min(1, p.life * 3));
        g.fillCircle(p.x, p.y, p.r);
      }
    }
    // the spout's mouth always wells and splashes
    const pulse = (this.t * 2) % 1;
    g.lineStyle(2, C.waterHi, 0.6 * (1 - pulse));
    g.strokeEllipse(this.src.x, this.src.y + 8, 16 + pulse * 22, 6 + pulse * 8);
  }

}
