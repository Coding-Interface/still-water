/**
 * FlowScene — Water Garden (Grown-ups) / Garden Pipes (Kids). A game.
 * A garden bed of channel tiles; tap a tile to turn it. A stone spring bubbles
 * up water without stopping, and the water really flows: it fills each channel
 * from the side it enters, runs on tile by tile and spills when a tile is
 * turned. When it reaches a little pond the flower in it blooms; water every
 * flower to finish the level.
 *
 * Every level is solvable: the board is built as a random spanning tree from the
 * spring (so one arrangement links everything), the flowers are its dead ends,
 * and only then are the tiles turned at random. The generator double-checks the
 * answer before the board is shown, and "Hint" points to a tile that is still
 * facing the wrong way.
 */
class FlowScene extends Phaser.Scene {
  // bit, dx, dy, opposite bit
  static DIRS = [
    { b: 1, dx: 0, dy: -1, o: 4 },
    { b: 2, dx: 1, dy: 0, o: 8 },
    { b: 4, dx: 0, dy: 1, o: 1 },
    { b: 8, dx: -1, dy: 0, o: 2 }
  ];

  static FLOW_SPEED = 3.2; // tiles per second
  static DRAIN_SPEED = 5;

  constructor() {
    super('FlowScene');
  }

  init(data) {
    this.level = (data && data.level) || ProgressStore.getBest('flow') + 1;
    this.tiles = [];
    this.flowers = [];
    this.solved = false;
    this.moves = 0;
    this.watered = new Set();
    this.t = 0;
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
          lawnTop: 0x8fdc72, lawnBottom: 0x4fb35a, stripe: 0xffffff, bush: 0x3e9a4a, bushHi: 0x6fcf6a,
          bed: 0x9b6b43, bedHi: 0xc08a5a, tile: 0x7fd36f, tileHi: 0xb6f29c, ditch: 0x7a5236, ditchEdge: 0xd9d2c3,
          water: 0x2fa8f5, waterDeep: 0x1c7fd0, waterHi: 0xe4f6ff, spring: 0x3fb8ff, stone: 0xcfc8bb, stoneDark: 0x9a9284,
          blooms: [0xff6fa8, 0xffc533, 0xffffff, 0xa77bff, 0xff8a3d]
        }
      : {
          lawnTop: 0x23402c, lawnBottom: 0x10201a, stripe: 0xffffff, bush: 0x16301f, bushHi: 0x2f5a3b,
          bed: 0x3a2c22, bedHi: 0x54402f, tile: 0x3f5a3f, tileHi: 0x5b7a52, ditch: 0x2a211b, ditchEdge: 0x8f8a80,
          water: 0x4fa6cc, waterDeep: 0x2f7a9c, waterHi: 0xd2eef8, spring: 0x8fd3ee, stone: 0x8f8a80, stoneDark: 0x5c5852,
          blooms: [0xe8a5b5, 0xe9e4d6, 0xc56f8a, 0x9b8fd6, 0xe8ae4c]
        };
    this.area = land ? { x: 70, y: 96, w: W - 520, h: H - 120 } : { x: 40, y: 236, w: W - 80, h: 820 };

    this.drawGarden();

    UIKit.leave(this);
    UIKit.text(this, W - 160, 62, GameLibrary.get('flow').title, { display: true, size: 38, ox: 1, align: 'right' });
    const ink = Theme.pick(Palette.css(Palette.MIST), '#1d4f2c');
    if (land) {
      const px = W - 410;
      this.levelText = UIKit.text(this, px, 170, '', { size: 28, weight: '600', ox: 0, align: 'left' });
      this.infoText = UIKit.text(this, px, 212, '', { size: 21, ox: 0, align: 'left', wrap: 370, color: ink });
      this.doneText = UIKit.text(this, W - 225, 360, '', { display: true, size: 36, wrap: 380, color: Palette.css(Palette.LOTUS) });
      this.hintBtn = UIKit.button(this, W - 225, 500, 'Hint', () => this.hint(), { w: 330, h: 70, accent: Palette.MIST });
      this.mainBtn = UIKit.button(this, W - 225, 590, '', () => this.onMain(), { w: 330, h: 76, accent: Theme.kids ? Palette.SAFFRON : Palette.LOTUS });
    } else {
      this.levelText = UIKit.text(this, 40, 140, '', { size: 26, weight: '600', ox: 0, align: 'left' });
      this.infoText = UIKit.text(this, 40, 178, '', { size: 21, ox: 0, align: 'left', wrap: 640, color: ink });
      this.doneText = UIKit.text(this, W / 2, 1100, '', { display: true, size: 36, wrap: 640, color: Palette.css(Palette.LOTUS) });
      this.hintBtn = UIKit.button(this, W / 2 - 170, 1196, 'Hint', () => this.hint(), { w: 280, h: 76, accent: Palette.MIST });
      this.mainBtn = UIKit.button(this, W / 2 + 170, 1196, '', () => this.onMain(), { w: 300, h: 76, accent: Theme.kids ? Palette.SAFFRON : Palette.LOTUS });
    }

    this.board = this.add.container(0, 0);
    Burst.ensureTextures(this);

    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open || this.solved) return;
      this.bowl.unlock();
      if (!this.stream) this.stream = this.bowl.startStream();
      const c = Math.floor((p.lx - this.ox) / this.size);
      const r = Math.floor((p.ly - this.oy) / this.size);
      if (c < 0 || r < 0 || c >= this.N || r >= this.N) return;
      this.turn(this.tiles[r * this.N + c]);
    });

    this.rest = new EyeRest(this);
    if (this.bowl.ctx) this.stream = this.bowl.startStream();
    this.newGarden();
    UIKit.toast(this, GameLibrary.get('flow').hint, land ? 640 : 250);
    WakeKeeper.hold();
    this.events.once('shutdown', () => {
      if (this.stream) this.stream.stop();
      this.stream = null;
    });
  }

  /* ---------- the garden around the bed ---------- */

  drawGarden() {
    const { W, H, C } = this;
    const g = this.add.graphics();
    g.fillGradientStyle(C.lawnTop, C.lawnTop, C.lawnBottom, C.lawnBottom, 1);
    g.fillRect(0, 0, W, H);
    // mown stripes
    for (let x = -H; x < W; x += 90) {
      g.fillStyle(C.stripe, this.kids ? 0.06 : 0.025);
      g.fillPoints([{ x, y: 0 }, { x: x + 45, y: 0 }, { x: x + 45 + H * 0.6, y: H }, { x: x + H * 0.6, y: H }], true);
    }
    // grass tufts
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      g.lineStyle(2, this.kids ? 0x3f9a45 : 0x3d6b45, 0.5);
      g.lineBetween(x, y, x - 3, y - 9);
      g.lineBetween(x + 3, y, x + 4, y - 10);
    }
    // little flowers in the lawn
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const col = C.blooms[i % C.blooms.length];
      g.fillStyle(col, this.kids ? 0.95 : 0.6);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.fillCircle(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3);
      }
      g.fillStyle(this.kids ? 0xffe066 : 0xe8ae4c, this.kids ? 1 : 0.7);
      g.fillCircle(x, y, 2.2);
    }
    // bushes along the edges
    const bush = (x, y, r) => {
      g.fillStyle(0x000000, 0.18);
      g.fillEllipse(x, y + r * 0.7, r * 2.6, r * 0.7);
      [[-0.7, 0.1, 0.8], [0.7, 0.15, 0.75], [0, -0.25, 1], [-0.3, 0.3, 0.7], [0.35, 0.3, 0.7]].forEach(([dx, dy, s]) => {
        g.fillStyle(C.bush, 1);
        g.fillCircle(x + dx * r, y + dy * r, r * s);
      });
      g.fillStyle(C.bushHi, 0.6);
      g.fillCircle(x - r * 0.2, y - r * 0.45, r * 0.4);
      if (this.kids) {
        g.fillStyle(C.blooms[Math.floor(Math.random() * 5)], 1);
        for (let k = 0; k < 4; k++) g.fillCircle(x + Phaser.Math.Between(-r, r) * 0.7, y + Phaser.Math.Between(-r, r) * 0.5, 5);
      }
    };
    if (this.land) {
      [[30, 120, 46], [20, 400, 54], [40, 680, 50], [W - 460, 700, 40]].forEach(([x, y, r]) => bush(x, y, r));
    } else {
      [[30, 228, 42], [W - 30, 232, 46], [24, 1080, 52], [W - 20, 1070, 50], [W / 2, 1290, 60]].forEach(([x, y, r]) => bush(x, y, r));
    }
    // fireflies (Grown-ups) or butterflies (Kids) drifting
    for (let i = 0; i < 7; i++) {
      const x = Phaser.Math.Between(40, W - 40);
      const y = Phaser.Math.Between(120, H - 60);
      const f = this.kids
        ? this.add.text(x, y, '🦋', { fontSize: '26px' }).setOrigin(0.5).setAlpha(0.9).setResolution(AppRouter.k || 1)
        : this.add.circle(x, y, 3, 0xffe9a6, 0.8);
      this.tweens.add({
        targets: f,
        x: x + Phaser.Math.Between(-80, 80),
        y: y + Phaser.Math.Between(-60, 60),
        alpha: this.kids ? 0.9 : { from: 0.1, to: 0.9 },
        duration: Phaser.Math.Between(2600, 4600),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }
  }

  /** The raised wooden bed the tiles sit in. */
  drawBed() {
    if (this.bedG) this.bedG.destroy();
    const g = (this.bedG = this.add.graphics());
    this.board.add(g);
    const { C } = this;
    const pad = 14;
    const x = this.ox - pad;
    const y = this.oy - pad;
    const w = this.N * this.size + pad * 2;
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x + 4, y + 10, w, w, 22);
    g.fillStyle(C.bed, 1);
    g.fillRoundedRect(x, y, w, w, 22);
    g.fillStyle(C.bedHi, 1);
    g.fillRoundedRect(x + 4, y + 4, w - 8, 10, 6);
    // stones set into the rim
    for (let i = 0; i < 4 * this.N * 2; i++) {
      const side = i % 4;
      const tt = (Math.floor(i / 4) + 0.5) / (this.N * 2);
      const px = side === 0 ? x + tt * w : side === 1 ? x + w - 7 : side === 2 ? x + tt * w : x + 7;
      const py = side === 0 ? y + 7 : side === 1 ? y + tt * w : side === 2 ? y + w - 7 : y + tt * w;
      g.fillStyle(i % 3 ? C.stone : C.stoneDark, this.kids ? 0.9 : 0.7);
      g.fillEllipse(px, py, 11, 8);
    }
  }

  static rot(m) {
    return ((m << 1) | (m >> 3)) & 15;
  }

  static bits(m) {
    let n = 0;
    for (let i = 0; i < 4; i++) if (m & (1 << i)) n++;
    return n;
  }

  gridSize() {
    const base = this.kids ? 3 : 4;
    if (this.level <= 1) return base;
    if (this.level <= 3) return base + 1;
    if (this.level <= 6) return base + 2;
    return base + 3;
  }

  /** A random spanning tree grown from the spring: every tile is reachable. */
  generate(N) {
    const masks = new Array(N * N).fill(0);
    const seen = new Array(N * N).fill(false);
    const src = Phaser.Math.Between(0, N * N - 1);
    const stack = [src];
    seen[src] = true;
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const cx = cur % N;
      const cy = Math.floor(cur / N);
      const options = Phaser.Utils.Array.Shuffle(FlowScene.DIRS.slice()).filter((d) => {
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny * N + nx];
      });
      if (!options.length) {
        stack.pop();
        continue;
      }
      const d = options[0];
      const next = (cy + d.dy) * N + (cx + d.dx);
      masks[cur] |= d.b;
      masks[next] |= d.o;
      seen[next] = true;
      stack.push(next);
    }
    const flowers = [];
    masks.forEach((m, i) => {
      if (i !== src && FlowScene.bits(m) === 1) flowers.push(i);
    });
    return { masks, src, flowers };
  }

  /** Breadth-first flow over any set of masks: which tiles the spring reaches. */
  static reach(masks, N, src) {
    const seen = new Set([src]);
    const queue = [src];
    while (queue.length) {
      const cur = queue.shift();
      const cx = cur % N;
      const cy = Math.floor(cur / N);
      FlowScene.DIRS.forEach((d) => {
        if (!(masks[cur] & d.b)) return;
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) return;
        const ni = ny * N + nx;
        if (!seen.has(ni) && masks[ni] & d.o) {
          seen.add(ni);
          queue.push(ni);
        }
      });
    }
    return seen;
  }

  /** A garden is good when its answer waters every flower and there is something to water. */
  static valid(gen, N) {
    if (!gen.flowers.length) return false;
    const reached = FlowScene.reach(gen.masks, N, gen.src);
    return reached.size === N * N && gen.flowers.every((f) => reached.has(f));
  }

  newGarden() {
    this.board.removeAll(true);
    this.bedG = null;
    if (this.spray) {
      this.spray.destroy();
      this.spray = null;
    }
    const A = this.area;
    const N = (this.N = this.gridSize());
    this.size = Math.floor(Math.min((A.w - 28) / N, (A.h - 28) / N, 150));
    this.ox = Math.round(A.x + (A.w - N * this.size) / 2);
    this.oy = Math.round(A.y + (A.h - N * this.size) / 2);

    let gen = this.generate(N);
    let tries = 0;
    while (!FlowScene.valid(gen, N) && tries++ < 20) gen = this.generate(N);
    this.src = gen.src;
    this.solution = gen.masks;
    this.flowers = gen.flowers;
    this.solved = false;
    this.moves = 0;
    // bigger gardens have longer streams, so the water runs a little faster there
    this.flowSpeed = Math.max(FlowScene.FLOW_SPEED, N * 0.85);
    this.fill = new Array(N * N).fill(0);
    this.parent = new Array(N * N).fill(-1);
    this.entry = new Array(N * N).fill(-1);

    this.drawBed();
    this.tiles = gen.masks.map((m, i) => {
      let mask = m;
      const turns = Phaser.Math.Between(0, 3);
      for (let k = 0; k < turns; k++) mask = FlowScene.rot(mask);
      const cx = this.ox + (i % N) * this.size + this.size / 2;
      const cy = this.oy + Math.floor(i / N) * this.size + this.size / 2;
      const c = this.add.container(cx, cy);
      const g = this.add.graphics();
      c.add(g);
      this.board.add(c);
      return { i, mask, c, g, flower: null, bloomed: false, deco: Math.random() };
    });

    // never start already solved: turn flowers away until at least one is dry
    this.computeFlow();
    let guard = 0;
    while (this.allConnected() && guard++ < 12) {
      const f = this.tiles[Phaser.Utils.Array.GetRandom(this.flowers)];
      f.mask = FlowScene.rot(f.mask);
      this.computeFlow();
    }

    this.waterG = this.add.graphics();
    this.board.add(this.waterG);
    this.makeSpring();

    this.flowers.forEach((i, n) => {
      const t = this.tiles[i];
      const lotus = new Lotus(this, t.c.x, t.c.y + this.size * 0.03, this.size * 0.17);
      lotus.setBloom(0.05);
      t.flower = lotus;
      t.bloomColor = this.C.blooms[n % this.C.blooms.length];
      this.board.add(lotus);
    });

    this.tiles.forEach((t) => this.drawTile(t));
    this.levelText.setText(`${Theme.pick('Garden', 'Level')} ${this.level}  ·  ${N}×${N}`);
    this.mainBtn.label.setText(Theme.pick('New garden', 'New level'));
    this.doneText.setText('');
    this.updateInfo();
  }

  /** The spring: a ring of stones round a bubbling pool, with spray and spreading rings. */
  makeSpring() {
    const src = this.tiles[this.src];
    const s = this.size;
    const x = src.c.x;
    const y = src.c.y;
    this.springPos = { x, y };
    for (let k = 0; k < 3; k++) {
      const ring = this.add.circle(x, y, s * 0.2).setStrokeStyle(3, this.C.spring, 0.8);
      this.board.add(ring);
      this.tweens.add({ targets: ring, scale: 2, alpha: 0, duration: 1800, delay: k * 600, repeat: -1, ease: 'Sine.Out' });
    }
    this.spray = this.add.particles(x, y, 'fxDot', {
      speedY: { min: -s * 1.8, max: -s * 0.9 },
      speedX: { min: -s * 0.45, max: s * 0.45 },
      gravityY: s * 6,
      lifespan: { min: 420, max: 700 },
      scale: { start: Math.max(0.25, s / 260), end: 0 },
      alpha: { start: 0.95, end: 0.2 },
      tint: [this.C.water, this.C.waterHi, this.C.spring],
      frequency: 50,
      quantity: 1
    });
    this.board.add(this.spray);
  }

  /** Breadth-first from the spring: who is connected, and which way the water enters each tile. */
  computeFlow() {
    const N = this.N;
    const seen = new Set([this.src]);
    const queue = [this.src];
    const parent = new Array(N * N).fill(-1);
    const entry = new Array(N * N).fill(-1);
    while (queue.length) {
      const cur = queue.shift();
      const m = this.tiles[cur].mask;
      const cx = cur % N;
      const cy = Math.floor(cur / N);
      FlowScene.DIRS.forEach((d, di) => {
        if (!(m & d.b)) return;
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) return;
        const ni = ny * N + nx;
        if (seen.has(ni) || !(this.tiles[ni].mask & d.o)) return;
        seen.add(ni);
        parent[ni] = cur;
        entry[ni] = (di + 2) % 4; // the side of the new tile that faces back toward the parent
        queue.push(ni);
      });
    }
    this.watered = seen;
    this.parent = parent;
    this.entry = entry;
  }

  allConnected() {
    return this.flowers.every((i) => this.watered.has(i));
  }

  /** A grass tile with a stone-edged channel; flower tiles end in a little pond. */
  drawTile(t) {
    const s = this.size;
    const g = t.g;
    const C = this.C;
    const isFlower = !!t.flower || this.flowers.includes(t.i);
    const isSrc = t.i === this.src;
    g.clear();
    g.fillStyle(C.tile, 1);
    g.fillRoundedRect(-s / 2 + 2, -s / 2 + 2, s - 4, s - 4, 10);
    g.fillStyle(C.tileHi, this.kids ? 0.45 : 0.25);
    g.fillRoundedRect(-s / 2 + 2, -s / 2 + 2, s - 4, s * 0.2, 9);
    // a few blades of grass and the odd clover
    const r = (k) => ((Math.sin((t.i + 1) * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    for (let k = 0; k < 5; k++) {
      const gx = (r(k) - 0.5) * s * 0.8;
      const gy = (r(k + 9) - 0.5) * s * 0.8;
      if (Math.abs(gx) < s * 0.2 || Math.abs(gy) < s * 0.2) continue;
      g.lineStyle(2, C.tileHi, 0.7);
      g.lineBetween(gx, gy, gx - 2, gy - 7);
      g.lineBetween(gx + 3, gy, gx + 4, gy - 8);
    }
    if (t.deco > 0.6 && !isFlower && !isSrc) {
      const gx = s * 0.3 * (t.deco > 0.8 ? 1 : -1);
      g.fillStyle(C.blooms[Math.floor(t.deco * 10) % 5], this.kids ? 1 : 0.7);
      for (let k = 0; k < 4; k++) g.fillCircle(gx + Math.cos(k * 1.57) * 3.5, -s * 0.3 + Math.sin(k * 1.57) * 3.5, 2.6);
    }

    const half = s / 2 - 2;
    const w = s * 0.3;
    // stone edging, then the soil bed of the channel
    FlowScene.DIRS.forEach((d) => {
      if (!(t.mask & d.b)) return;
      g.lineStyle(w + 8, C.ditchEdge, this.kids ? 0.95 : 0.6);
      g.lineBetween(0, 0, d.dx * half, d.dy * half);
    });
    g.fillStyle(C.ditchEdge, this.kids ? 0.95 : 0.6);
    g.fillCircle(0, 0, w / 2 + 4);
    FlowScene.DIRS.forEach((d) => {
      if (!(t.mask & d.b)) return;
      g.lineStyle(w, C.ditch, 1);
      g.lineBetween(0, 0, d.dx * half, d.dy * half);
    });
    g.fillStyle(C.ditch, 1);
    g.fillCircle(0, 0, w / 2);

    if (isFlower) {
      // a little round pond with a pebble rim
      const pr = s * 0.3;
      g.fillStyle(C.ditchEdge, this.kids ? 1 : 0.7);
      g.fillCircle(0, 0, pr + 5);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        g.fillStyle(k % 2 ? C.stone : C.stoneDark, 1);
        g.fillEllipse(Math.cos(a) * (pr + 3), Math.sin(a) * (pr + 3), 9, 7);
      }
      g.fillStyle(C.ditch, 1);
      g.fillCircle(0, 0, pr);
    }
    if (isSrc) {
      // the spring's well: a ring of stones
      const pr = s * 0.25;
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        g.fillStyle(k % 2 ? C.stone : C.stoneDark, 1);
        g.fillEllipse(Math.cos(a) * (pr + 4), Math.sin(a) * (pr + 4), 13, 10);
      }
    }
  }

  turn(t) {
    this.tweens.killTweensOf(t.c);
    t.c.angle = 0;
    if (this.hintRing) this.hintRing.destroy();
    this.hintRing = null;
    // turning a wet tile spills its water
    if (this.fill[t.i] > 0.2) this.spill(t);
    this.fill[t.i] = 0;

    t.mask = FlowScene.rot(t.mask);
    this.moves += 1;
    this.bowl.tok(this.kids ? 0.7 : 0.5);
    this.tweens.add({
      targets: t.c,
      angle: 90,
      duration: 130,
      ease: 'Sine.Out',
      onComplete: () => {
        t.c.angle = 0;
        this.drawTile(t);
        this.computeFlow();
        this.updateInfo();
      }
    });
  }

  /** Point at a tile that is off its answer, preferring one the water already reaches. */
  hint() {
    if (this.solved || this.rest.open) return;
    this.bowl.unlock();
    const wrong = this.tiles.filter((t) => t.mask !== this.solution[t.i]);
    if (!wrong.length) return;
    const near = wrong.filter((t) => {
      const N = this.N;
      const x = t.i % N;
      const y = Math.floor(t.i / N);
      return FlowScene.DIRS.some((d) => {
        const nx = x + d.dx;
        const ny = y + d.dy;
        return nx >= 0 && ny >= 0 && nx < N && ny < N && this.watered.has(ny * N + nx);
      });
    });
    const t = (near.length ? near : wrong)[0];
    if (this.hintRing) this.hintRing.destroy();
    const ring = (this.hintRing = this.add.rectangle(t.c.x, t.c.y, this.size - 6, this.size - 6));
    ring.setStrokeStyle(5, Palette.SAFFRON, 1);
    this.board.add(ring);
    this.tweens.add({ targets: ring, alpha: { from: 1, to: 0.25 }, duration: 420, yoyo: true, repeat: 4, onComplete: () => ring.destroy() });
    this.bowl.chime(659.25, 0.05);
  }

  spill(t) {
    const s = this.size;
    for (let i = 0; i < 8; i++) {
      const d = this.add.circle(t.c.x, t.c.y, Phaser.Math.FloatBetween(2, 4.5), this.C.water, 0.9);
      this.board.add(d);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: d,
        x: t.c.x + Math.cos(a) * s * 0.45,
        y: t.c.y + Math.sin(a) * s * 0.45,
        alpha: 0,
        duration: 420,
        ease: 'Quad.Out',
        onComplete: () => d.destroy()
      });
    }
    this.bowl.plip(0.3);
  }

  updateInfo() {
    const done = this.tiles.filter((t) => t.bloomed).length;
    this.infoText.setText(`${done} of ${this.flowers.length} ${Theme.pick('lotus watered', 'flowers watered')}  ·  ${this.moves} turns`);
  }

  onSolved() {
    this.solved = true;
    ProgressStore.setBest('flow', this.level);
    this.bowl.fanfare();
    if (this.kids) this.bowl.sparkle();
    this.doneText.setText(Theme.pick(`Garden in bloom, ${this.moves} turns`, `All the flowers bloomed!`)).setAlpha(0);
    this.tweens.add({ targets: this.doneText, alpha: 1, duration: 500 });
    this.mainBtn.label.setText(Theme.pick('Next garden', 'Next level'));
    // petals drift up from every pond
    this.flowers.forEach((i, n) => {
      const t = this.tiles[i];
      for (let k = 0; k < 5; k++) {
        const p = this.add.ellipse(t.c.x, t.c.y, 9, 6, this.C.blooms[(n + k) % 5], 0.95);
        this.board.add(p);
        this.tweens.add({
          targets: p,
          x: t.c.x + Phaser.Math.Between(-50, 50),
          y: t.c.y - Phaser.Math.Between(50, 110),
          angle: Phaser.Math.Between(-180, 180),
          alpha: 0,
          delay: k * 90,
          duration: 1400,
          ease: 'Sine.Out',
          onComplete: () => p.destroy()
        });
      }
    });
  }

  onMain() {
    if (this.rest.open) return;
    this.bowl.unlock();
    if (this.solved) this.level += 1;
    this.newGarden();
  }

  /* ---------- the water itself ---------- */

  update(time, delta) {
    this.rest.tick(delta);
    if (!this.tiles.length) return;
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;

    // Water advances into a tile only once the tile feeding it is full;
    // tiles cut off from the spring drain away.
    let flowing = 0;
    this.tiles.forEach((t) => {
      const i = t.i;
      if (this.watered.has(i)) {
        const p = this.parent[i];
        const fed = i === this.src || (p >= 0 && this.fill[p] >= 0.999);
        if (fed) this.fill[i] = Math.min(1, this.fill[i] + dt * this.flowSpeed);
      } else {
        this.fill[i] = Math.max(0, this.fill[i] - dt * FlowScene.DRAIN_SPEED);
      }
      if (this.fill[i] > 0) flowing += 1;
    });
    if (this.stream) this.stream.set(Math.min(0.7, 0.2 + flowing / 30));

    this.drawWater();
    this.updateFlowers();
  }

  updateFlowers() {
    let changed = false;
    this.tiles.forEach((t) => {
      if (!t.flower) return;
      const wet = this.fill[t.i] >= 0.99;
      if (wet === t.bloomed) return;
      t.bloomed = wet;
      changed = true;
      const prog = { b: t.flower.bloom };
      this.tweens.add({ targets: prog, b: wet ? 1 : 0.05, duration: 700, ease: 'Sine.Out', onUpdate: () => t.flower.setBloom(prog.b) });
      if (wet) {
        this.bowl.plip(0.8);
        if (this.kids) this.bowl.sparkle(0.4);
        const ring = this.add.circle(t.c.x, t.c.y, this.size * 0.2).setStrokeStyle(3, this.C.waterHi, 0.9);
        this.board.add(ring);
        this.tweens.add({ targets: ring, scale: 2.2, alpha: 0, duration: 700, onComplete: () => ring.destroy() });
      }
    });
    if (changed) this.updateInfo();
    if (!this.solved && this.flowers.length && this.tiles.every((t) => !t.flower || t.bloomed)) this.onSolved();
  }

  drawWater() {
    const g = this.waterG;
    const s = this.size;
    const C = this.C;
    const half = s / 2 - 2;
    const width = s * 0.19;
    g.clear();

    this.tiles.forEach((t) => {
      const f = this.fill[t.i];
      if (f <= 0) return;
      const x = t.c.x;
      const y = t.c.y;
      const isSrc = t.i === this.src;
      const isFlower = !!t.flower;
      const entryDi = isSrc ? -1 : this.entry[t.i];
      const exits = [];
      FlowScene.DIRS.forEach((d, di) => {
        if (t.mask & d.b && di !== entryDi) exits.push(d);
      });
      const segs = [];
      // the entry arm fills first (edge → centre), then the exits (centre → edges)
      const fIn = isSrc ? 1 : Math.min(1, f * 2);
      const fOut = isSrc ? f : Math.max(0, f * 2 - 1);
      if (!isSrc && entryDi >= 0) {
        const d = FlowScene.DIRS[entryDi];
        const stop = isFlower ? s * 0.28 : 0;
        const len = half - stop;
        segs.push({ x1: x + d.dx * half, y1: y + d.dy * half, x2: x + d.dx * (half - len * fIn), y2: y + d.dy * (half - len * fIn), full: fIn >= 1 });
      }
      if (fIn >= 1 && !isFlower) {
        exits.forEach((d) => segs.push({ x1: x, y1: y, x2: x + d.dx * half * fOut, y2: y + d.dy * half * fOut, full: fOut >= 1 }));
      }

      // body of water
      segs.forEach((sg) => {
        g.lineStyle(width + 4, C.waterDeep, 0.9);
        g.lineBetween(sg.x1, sg.y1, sg.x2, sg.y2);
        g.lineStyle(width, C.water, 1);
        g.lineBetween(sg.x1, sg.y1, sg.x2, sg.y2);
        if (!sg.full) {
          const wob = 1 + Math.sin(this.t * 14 + t.i) * 0.12;
          g.fillStyle(C.water, 1);
          g.fillCircle(sg.x2, sg.y2, (width / 2 + 2) * wob);
          g.fillStyle(C.waterHi, 0.6);
          g.fillCircle(sg.x2, sg.y2, width * 0.18);
        }
      });
      if (isFlower) {
        // the pond fills from the middle out
        if (fIn >= 1) {
          const pr = s * 0.3 * Math.max(0.15, fOut);
          g.fillStyle(C.waterDeep, 1);
          g.fillCircle(x, y, pr);
          g.fillStyle(C.water, 1);
          g.fillCircle(x, y, pr - 3);
          g.lineStyle(2, C.waterHi, 0.4 + 0.2 * Math.sin(this.t * 3 + t.i));
          g.strokeCircle(x, y, pr * (0.55 + 0.25 * ((this.t * 0.6 + t.i * 0.3) % 1)));
        }
      } else if (fIn >= 1 || isSrc) {
        g.fillStyle(C.waterDeep, 0.9);
        g.fillCircle(x, y, width * 0.62 + 2);
        g.fillStyle(C.water, 1);
        g.fillCircle(x, y, width * 0.62);
      }

      // the surface: wavy light streaks drifting downstream, and glints riding on them
      segs.forEach((sg, si) => {
        const len = Math.hypot(sg.x2 - sg.x1, sg.y2 - sg.y1);
        if (len < 4) return;
        const ux = (sg.x2 - sg.x1) / len;
        const uy = (sg.y2 - sg.y1) / len;
        const nx = -uy;
        const ny = ux;
        // distance from the spring, so the ripples flow on smoothly from tile to tile
        const along = (p) => p - this.t * s * 1.1 + t.i * 37 + si * 11;
        [[-0.26, 0.5, 2], [0.22, 0.35, 1.6]].forEach(([lane, alpha, w], li) => {
          g.lineStyle(w, C.waterHi, alpha);
          g.beginPath();
          for (let p = 0; p <= len; p += 5) {
            const wob = Math.sin(along(p) * 0.09 + li * 2) * width * 0.16;
            const x = sg.x1 + ux * p + nx * (lane * width + wob);
            const y = sg.y1 + uy * p + ny * (lane * width + wob);
            if (p === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.strokePath();
        });
        const spacing = s * 0.24;
        const offset = (((this.t * s * 1.1) % spacing) + spacing) % spacing;
        for (let p = offset; p < len; p += spacing) {
          const side = Math.sin((p + t.i * 13) * 0.21 + this.t * 3) * width * 0.22;
          g.fillStyle(0xffffff, 0.55);
          g.fillEllipse(sg.x1 + ux * p + nx * side, sg.y1 + uy * p + ny * side, Math.abs(ux) * width * 0.45 + width * 0.14, Math.abs(uy) * width * 0.45 + width * 0.14);
        }
        // a foamy, tumbling front where the water is still advancing
        if (!sg.full) {
          for (let k = 0; k < 4; k++) {
            const j = this.t * 18 + k * 1.7 + t.i;
            const fx = sg.x2 + Math.cos(j) * width * 0.28 - ux * k * 2;
            const fy = sg.y2 + Math.sin(j * 1.3) * width * 0.28 - uy * k * 2;
            g.fillStyle(0xffffff, 0.8 - k * 0.15);
            g.fillCircle(fx, fy, width * (0.18 - k * 0.025));
          }
        }
      });
    });

    // the spring's pool churns
    if (this.springPos) {
      const { x, y } = this.springPos;
      const r = s * 0.22;
      g.fillStyle(C.waterDeep, 1);
      g.fillCircle(x, y, r + 3);
      g.fillStyle(C.spring, 1);
      g.fillCircle(x, y, r);
      for (let k = 0; k < 3; k++) {
        const a = this.t * 2.4 + (k * Math.PI * 2) / 3;
        g.lineStyle(2.5, C.waterHi, 0.8);
        g.beginPath();
        g.arc(x, y, r * (0.45 + k * 0.17), a, a + 1.6);
        g.strokePath();
      }
      const bob = Math.sin(this.t * 6) * r * 0.12;
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(x + bob, y - r * 0.15, r * 0.16);
    }
  }
}
