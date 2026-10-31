/**
 * SmashScene — Smash Shelf (Grown-ups) / Block Topple (Kids).
 * Slingshot a heavy ball at shelves of crockery (or toy blocks). Pieces break on
 * hard impacts (Matter physics), so knocking one stack over can set off a chain.
 * Clear the shelves to move on; fewer throws earn more stars. Balls never run out.
 * Levels are written for the portrait wall and mapped onto the wider landscape
 * wall, so every level works in both orientations.
 */
class SmashScene extends Phaser.Scene {
  static TYPES = {
    plate: { w: 92, h: 14, density: 0.0012, fragile: 3.0, color: 0xf1ece0, bright: true },
    cup: { w: 46, h: 50, density: 0.0012, fragile: 3.4, color: 0xe8a5b5, bright: true },
    vase: { w: 40, h: 100, density: 0.0014, fragile: 2.6, color: 0x5b8a9a, bright: false },
    glass: { w: 34, h: 58, density: 0.001, fragile: 2.2, color: 0xbfe3ea, bright: true },
    bowl: { w: 76, h: 30, density: 0.0012, fragile: 3.0, color: 0xe8ae4c, bright: false }
  };

  // Portrait design units. shelves: [centreX, topY, width]  items: [mode, type, centreX, shelfIndex, n]
  static LEVELS = [
    { par: 2, shelves: [[480, 930, 380]], items: [['stack', 'plate', 410, 0, 6], ['pyr', 'cup', 560, 0, 2]] },
    { par: 2, shelves: [[470, 930, 420]], items: [['pyr', 'cup', 470, 0, 4]] },
    { par: 3, shelves: [[450, 950, 300], [560, 650, 260]], items: [['stack', 'plate', 400, 0, 5], ['stack', 'vase', 520, 0, 1], ['row', 'glass', 560, 1, 4]] },
    { par: 3, shelves: [[500, 620, 300], [500, 920, 360]], items: [['stack', 'plate', 500, 0, 8], ['pyr', 'cup', 500, 1, 3]] },
    { par: 3, shelves: [[490, 940, 440]], items: [['stack', 'vase', 320, 0, 1], ['stack', 'plate', 410, 0, 6], ['stack', 'vase', 505, 0, 1], ['pyr', 'glass', 615, 0, 3]] },
    { par: 4, shelves: [[330, 980, 180], [490, 800, 180], [640, 620, 140]], items: [['stack', 'cup', 330, 0, 3], ['stack', 'bowl', 490, 1, 4], ['stack', 'cup', 640, 2, 3]] },
    { par: 4, shelves: [[520, 950, 380], [520, 700, 300], [520, 450, 220]], items: [['pyr', 'glass', 520, 0, 4], ['stack', 'plate', 520, 1, 7], ['row', 'cup', 520, 2, 3]] },
    { par: 4, shelves: [[400, 960, 220], [600, 960, 200], [500, 640, 320]], items: [['pyr', 'cup', 400, 0, 3], ['stack', 'vase', 560, 1, 1], ['stack', 'vase', 640, 1, 1], ['stack', 'plate', 430, 2, 5], ['row', 'bowl', 570, 2, 1]] }
  ];

  constructor() {
    super({
      key: 'SmashScene',
      physics: { default: 'matter', matter: { gravity: { y: 1 }, enableSleeping: false, debug: false } }
    });
  }

  init(data) {
    this.level = (data && data.level) || Math.max(1, BestScores.get('smash'));
    this.pieces = [];
    this.breakQueue = [];
    this.throws = 0;
    this.smashed = 0;
    this.total = 0;
    this.done = false;
    this.dragging = false;
    this.aimBall = null;
    this.flying = null;
    this.chain = 0;
    this.lastBreak = 0;
    this.lastKnock = 0;
  }

  snapshot() {
    return { level: this.level };
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.land = land;
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.def = SmashScene.LEVELS[(this.level - 1) % SmashScene.LEVELS.length];
    this.ground = land ? H - 70 : 1150;
    this.anchor = land ? { x: 190, y: this.ground - 160 } : { x: 150, y: 990 };
    new NightSky(this);
    this.matter.world.engine.positionIterations = 10;
    this.matter.world.engine.velocityIterations = 8;

    this.makeTextures();
    this.drawWall(W);
    this.fx = this.kids ? new Burst(this, 'fxDot', { speed: { min: 150, max: 520 }, scale: { start: 0.9, end: 0.3 } }, 25) : new Burst(this, 'fxShard', {}, 25);

    const ground = this.add.graphics();
    ground.fillStyle(this.kids ? 0x6cc36a : 0x0f1b24, 1);
    ground.fillRect(0, this.ground, W, H - this.ground);
    ground.lineStyle(this.kids ? 4 : 2, this.kids ? 0x4aa85a : Palette.MIST, this.kids ? 1 : 0.18);
    ground.lineBetween(0, this.ground, W, this.ground);
    this.matter.add.rectangle(W / 2, this.ground + 30, W * 3, 60, { isStatic: true, friction: 0.9 });

    this.buildLevel();
    this.drawSling();
    this.bandBack = this.add.graphics().setDepth(9);
    this.bandFront = this.add.graphics().setDepth(11);
    this.aimG = this.add.graphics().setDepth(8);

    UIKit.leave(this);
    UIKit.button(this, 250, 62, 'Reset', () => this.scene.restart({ level: this.level }), {
      w: 120,
      h: 56,
      size: 22,
      accent: Theme.kids ? Palette.SAFFRON : Palette.MIST,
      fillAlpha: Theme.kids ? 0.85 : 0.12
    }).setDepth(40);
    this.levelText = UIKit.text(this, 34, 132, `${Theme.pick('Shelf', 'Level')} ${this.level}`, { display: true, size: 36, ox: 0, align: 'left' });
    this.hud = UIKit.text(this, 34, 174, '', { size: 22, ox: 0, align: 'left', color: Palette.css(Palette.MIST) });
    this.updateHud();

    this.bindInput();
    this.matter.world.on('collisionstart', (ev) => this.onCollide(ev));
    this.reload();

    this.rest = new EyeRest(this);
    if (this.level === 1) UIKit.toast(this, GameLibrary.get('smash').hint, land ? 120 : 250);
    WakeKeeper.hold();
  }

  /** Map a portrait design x (and shelf) onto the current wall. */
  mapX(x) {
    return this.land ? this.anchor.x + (x - 150) * 1.55 : x;
  }

  mapTop(top) {
    return this.land ? this.ground - (1150 - top) * 0.72 : top;
  }

  makeTextures() {
    const T = SmashScene.TYPES;
    const kids = this.kids;
    const prefix = kids ? 'smashK_' : 'smash_';
    if (this.textures.exists(prefix + 'plate')) return;
    const g = this.make.graphics({ add: false });

    if (kids) {
      const C = Theme.CANDY;
      const block = (key, w, h, color, opts = {}) => {
        g.clear();
        g.fillStyle(0x000000, 0.18);
        g.fillRoundedRect(0, 3, w, h - 3, Math.min(8, h / 3));
        g.fillStyle(color, 1);
        g.fillRoundedRect(0, 0, w, h - 3, Math.min(8, h / 3));
        g.fillStyle(0xffffff, 0.3);
        g.fillRoundedRect(3, 3, w - 6, Math.max(3, (h - 3) * 0.3), Math.min(6, h / 4));
        g.lineStyle(2, 0xffffff, 0.8);
        g.strokeRoundedRect(1, 1, w - 2, h - 5, Math.min(8, h / 3));
        if (opts.face) {
          g.fillStyle(0x1d2458, 1);
          g.fillCircle(w * 0.35, h * 0.42, 3);
          g.fillCircle(w * 0.65, h * 0.42, 3);
          g.lineStyle(2.5, 0x1d2458, 1);
          g.beginPath();
          g.arc(w / 2, h * 0.52, 6, 0.3, Math.PI - 0.3);
          g.strokePath();
        }
        if (opts.star) {
          g.fillStyle(0xffffff, 0.9);
          g.fillCircle(w / 2, h * 0.3, 4);
          g.fillCircle(w / 2, h * 0.62, 4);
        }
        g.generateTexture(prefix + key, w, h);
      };
      block('plate', T.plate.w, T.plate.h, C[3]);
      block('cup', T.cup.w, T.cup.h, C[0], { face: true });
      block('vase', T.vase.w, T.vase.h, C[4], { star: true });
      block('glass', T.glass.w, T.glass.h, C[1], { face: true });
      block('bowl', T.bowl.w, T.bowl.h, C[2]);

      g.clear();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(22, 22, 22);
      [[0xff4f6a, -0.3], [0x4fb6ff, 1.75], [0xffc533, 3.8]].forEach(([col, a]) => {
        g.fillStyle(col, 1);
        g.slice(22, 22, 22, a, a + 1.05, false);
        g.fillPath();
      });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(22, 22, 5);
      g.lineStyle(2, 0x1d2458, 0.5);
      g.strokeCircle(22, 22, 21);
      g.generateTexture('smashBallK', 44, 44);
      g.destroy();
      return;
    }

    g.fillStyle(T.plate.color, 1);
    g.fillRoundedRect(0, 0, T.plate.w, T.plate.h, 6);
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(4, 8, T.plate.w - 8, 5, 2);
    g.lineStyle(2, 0x5b7fa8, 0.9);
    g.lineBetween(8, 4, T.plate.w - 8, 4);
    g.generateTexture('smash_plate', T.plate.w, T.plate.h);

    g.clear();
    g.fillStyle(T.cup.color, 1);
    g.fillRoundedRect(0, 0, 36, T.cup.h, { tl: 3, tr: 3, bl: 12, br: 12 });
    g.lineStyle(6, T.cup.color, 1);
    g.strokeCircle(38, 22, 8);
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(5, 6, 5, T.cup.h - 18);
    g.fillStyle(0x000000, 0.12);
    g.fillRect(0, 0, 36, 4);
    g.generateTexture('smash_cup', T.cup.w, T.cup.h);

    g.clear();
    g.fillStyle(T.vase.color, 1);
    g.fillRect(13, 0, 14, 30);
    g.fillRoundedRect(10, 0, 20, 6, 3);
    g.fillEllipse(20, 64, 40, 72);
    g.fillStyle(0xffffff, 0.2);
    g.fillEllipse(12, 58, 7, 40);
    g.lineStyle(2, 0xe8ae4c, 0.8);
    g.lineBetween(3, 64, 37, 64);
    g.generateTexture('smash_vase', T.vase.w, T.vase.h);

    g.clear();
    g.fillStyle(T.glass.color, 0.45);
    g.fillRoundedRect(0, 0, T.glass.w, T.glass.h, { tl: 2, tr: 2, bl: 8, br: 8 });
    g.lineStyle(2, 0xffffff, 0.7);
    g.strokeRoundedRect(1, 1, T.glass.w - 2, T.glass.h - 2, { tl: 2, tr: 2, bl: 8, br: 8 });
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(6, 6, 4, T.glass.h - 18);
    g.generateTexture('smash_glass', T.glass.w, T.glass.h);

    g.clear();
    g.fillStyle(T.bowl.color, 1);
    g.fillRoundedRect(0, 0, T.bowl.w, T.bowl.h, { tl: 3, tr: 3, bl: 15, br: 15 });
    g.fillStyle(0x000000, 0.15);
    g.fillRect(0, 0, T.bowl.w, 4);
    g.lineStyle(2, 0xc56f8a, 0.8);
    g.lineBetween(6, 12, T.bowl.w - 6, 12);
    g.generateTexture('smash_bowl', T.bowl.w, T.bowl.h);

    g.clear();
    g.fillStyle(0xc56f3a, 1);
    g.fillCircle(22, 22, 22);
    g.fillStyle(0xe8743b, 1);
    g.fillCircle(20, 20, 19);
    g.lineStyle(2, 0x8a3f1c, 0.6);
    g.beginPath();
    g.arc(22, 22, 14, -0.6, 2.2);
    g.strokePath();
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(14, 13, 6);
    g.generateTexture('smashBall', 44, 44);
    g.destroy();
  }

  drawWall(W) {
    const g = this.add.graphics();
    const x0 = this.land ? 330 : 250;
    const y0 = this.land ? 96 : 300;
    if (this.kids) {
      g.fillStyle(0xfff3d6, 0.92);
      g.fillRoundedRect(x0, y0, W - x0 + 30, this.ground - y0 + 10, 24);
      g.fillStyle(0xffc533, 0.18);
      for (let x = x0 + 20; x < W; x += 60) for (let y = y0 + 20; y < this.ground; y += 60) g.fillCircle(x, y, 8);
      return;
    }
    g.fillStyle(0x15212b, 1);
    g.fillRect(x0, y0, W - x0, this.ground - y0);
    g.lineStyle(1, 0x000000, 0.25);
    for (let y = y0; y < this.ground; y += 40) {
      g.lineBetween(x0, y, W, y);
      const off = ((y - y0) / 40) % 2 ? 0 : 40;
      for (let x = x0 + off; x < W; x += 80) g.lineBetween(x, y, x, y + 40);
    }
    g.fillStyle(0x000000, 0.25);
    g.fillRect(x0, y0, 6, this.ground - y0);
  }

  buildLevel() {
    const T = SmashScene.TYPES;
    const g = this.add.graphics();
    const shelves = this.def.shelves.map(([cx, top, w]) => ({ cx, x: this.mapX(cx), top: this.mapTop(top), w }));
    shelves.forEach(({ x, top, w }) => {
      this.matter.add.rectangle(x, top + 12, w, 24, { isStatic: true, friction: 0.8, frictionStatic: 1 });
      g.fillStyle(0x000000, 0.3);
      g.fillRect(x - w / 2 + 6, top + 24, w - 12, 8);
      g.fillStyle(this.kids ? 0xff8a3d : Palette.WOOD, 1);
      g.fillRoundedRect(x - w / 2, top, w, 24, this.kids ? 10 : 0);
      g.fillStyle(0xffffff, this.kids ? 0.3 : 0.08);
      g.fillRect(x - w / 2 + 6, top + 2, w - 12, 4);
      g.fillStyle(this.kids ? 0xd9682a : Palette.WOOD_DARK, 1);
      [x - w / 2 + 26, x + w / 2 - 26].forEach((bx) => g.fillTriangle(bx - 6, top + 24, bx + 6, top + 24, bx - 6, top + 60));
    });

    this.def.items.forEach(([mode, type, cx, si, n]) => {
      const t = T[type];
      const s = shelves[si];
      const x = s.x + (cx - s.cx);
      const top = s.top;
      if (mode === 'stack') {
        for (let i = 0; i < n; i++) this.addPiece(type, x, top - t.h / 2 - i * (t.h + 0.5));
      } else if (mode === 'pyr') {
        const sp = t.w + 6;
        for (let r = 0; r < n; r++) {
          const count = n - r;
          for (let k = 0; k < count; k++) this.addPiece(type, x - ((count - 1) * sp) / 2 + k * sp, top - t.h / 2 - r * (t.h + 0.5));
        }
      } else {
        const sp = t.w + 14;
        for (let k = 0; k < n; k++) this.addPiece(type, x - ((n - 1) * sp) / 2 + k * sp, top - t.h / 2);
      }
    });
    this.total = this.pieces.length;
    this.graceUntil = this.time.now + 1200;
  }

  addPiece(type, x, y) {
    const t = SmashScene.TYPES[type];
    const img = this.matter.add.image(x, y, (this.kids ? 'smashK_' : 'smash_') + type, null, {
      friction: 0.7,
      frictionStatic: 1,
      restitution: 0.02,
      density: t.density
    });
    img.piece = t;
    img.color = this.kids ? Theme.CANDY[Phaser.Math.Between(0, 5)] : t.color;
    img.broken = false;
    this.pieces.push(img);
  }

  drawSling() {
    const g = this.add.graphics().setDepth(10);
    const a = this.anchor;
    const wood = this.kids ? 0xd9682a : 0x5a3a28;
    g.lineStyle(14, wood, 1);
    g.lineBetween(a.x, this.ground, a.x, a.y + 50);
    g.lineStyle(11, wood, 1);
    g.lineBetween(a.x, a.y + 50, a.x - 22, a.y - 14);
    g.lineBetween(a.x, a.y + 50, a.x + 22, a.y - 14);
    g.fillStyle(this.kids ? 0xffc533 : 0x6e4a34, 1);
    g.fillCircle(a.x - 22, a.y - 14, 7);
    g.fillCircle(a.x + 22, a.y - 14, 7);
  }

  reload() {
    if (this.done || this.aimBall) return;
    const a = this.anchor;
    this.aimBall = this.add.image(a.x, a.y - 60, this.kids ? 'smashBallK' : 'smashBall').setDepth(10).setAlpha(0);
    this.tweens.add({ targets: this.aimBall, y: a.y, alpha: 1, duration: 300, ease: 'Back.Out' });
    this.drawBands(a.x, a.y);
  }

  drawBands(x, y) {
    const a = this.anchor;
    this.bandBack.clear();
    this.bandFront.clear();
    this.bandBack.lineStyle(6, this.kids ? 0xff4f6a : 0x3b2418, 1);
    this.bandBack.lineBetween(a.x - 22, a.y - 14, x, y);
    this.bandFront.lineStyle(6, this.kids ? 0xff6fa8 : 0x4a2c1e, 1);
    this.bandFront.lineBetween(a.x + 22, a.y - 14, x, y);
  }

  bindInput() {
    const a = this.anchor;
    const MAX = 170;
    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open || this.done || !this.aimBall) return;
      this.bowl.unlock();
      if (Phaser.Math.Distance.Between(p.lx, p.ly, a.x, a.y) < 170) this.dragging = true;
    });
    this.input.on('pointermove', (p) => {
      if (!this.dragging || !this.aimBall) return;
      let dx = p.lx - a.x;
      let dy = p.ly - a.y;
      const len = Math.hypot(dx, dy);
      if (len > MAX) {
        dx *= MAX / len;
        dy *= MAX / len;
      }
      this.pull = { x: dx, y: dy };
      this.aimBall.setPosition(a.x + dx, a.y + dy);
      this.drawBands(a.x + dx, a.y + dy);
      this.drawAim();
    });
    const release = () => {
      if (!this.dragging) return;
      this.dragging = false;
      this.aimG.clear();
      const pull = this.pull || { x: 0, y: 0 };
      this.pull = null;
      if (Math.hypot(pull.x, pull.y) < 24) {
        this.aimBall.setPosition(a.x, a.y);
        this.drawBands(a.x, a.y);
        return;
      }
      this.launch(pull);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  launchVelocity(pull) {
    const K = this.land ? 0.14 : 0.15;
    return { x: -pull.x * K, y: -pull.y * K };
  }

  drawAim() {
    const g = this.aimG;
    g.clear();
    if (!this.pull) return;
    let v = this.launchVelocity(this.pull);
    let x = this.aimBall.x;
    let y = this.aimBall.y;
    const grav = 0.2778;
    const dots = this.kids ? 30 : 24;
    for (let i = 1; i <= dots; i++) {
      x += v.x;
      y += v.y;
      v = { x: v.x * 0.996, y: (v.y + grav) * 0.996 };
      if (i % 3 === 0) {
        g.fillStyle(this.kids ? 0xffffff : Palette.MOON, 0.7 - i * 0.018);
        g.fillCircle(x, y, 5.5 - i * 0.12);
      }
    }
  }

  launch(pull) {
    const v = this.launchVelocity(pull);
    const x = this.aimBall.x;
    const y = this.aimBall.y;
    this.aimBall.destroy();
    this.aimBall = null;
    this.drawBands(this.anchor.x, this.anchor.y);
    const ball = this.matter.add.image(x, y, this.kids ? 'smashBallK' : 'smashBall', null, {
      shape: { type: 'circle', radius: 22 },
      density: 0.006,
      restitution: this.kids ? 0.45 : 0.3,
      friction: 0.3,
      frictionAir: 0.004
    });
    ball.isBall = true;
    ball.setVelocity(v.x, v.y);
    ball.setDepth(12);
    this.flying = ball;
    this.flyStart = this.time.now;
    this.throws += 1;
    this.updateHud();
    this.bowl.whoosh();
  }

  onCollide(ev) {
    const now = this.time.now;
    for (const pair of ev.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (rel > 1.5 && now - this.lastKnock > 50) {
        this.lastKnock = now;
        if (this.kids) this.bowl.toy(Math.min(1, rel / 14));
        else this.bowl.thunk(Math.min(1, rel / 14));
      }
      if (now < this.graceUntil) continue;
      const ga = a.gameObject;
      const gb = b.gameObject;
      [[ga, gb], [gb, ga]].forEach(([g, other]) => {
        if (!g || !g.piece || g.broken) return;
        const limit = other && other.isBall ? 1.8 : g.piece.fragile;
        if (rel > limit) this.breakQueue.push(g);
      });
    }
  }

  shatter(g, silent) {
    if (g.broken) return;
    g.broken = true;
    this.smashed += 1;
    const t = g.piece;
    if (!silent) {
      this.fx.emit(g.color, g.x, g.y, this.kids ? 16 : 14);
      if (this.kids) this.bowl.confettiPop(0.9);
      else this.bowl.shatter(0.9, t.bright);
      this.cameras.main.shake(90, this.kids ? 0.003 : 0.004);
      const now = this.time.now;
      this.chain = now - this.lastBreak < 700 ? this.chain + 1 : 1;
      this.lastBreak = now;
      if (this.chain >= 3) UIKit.floatText(this, g.x, g.y - 30, Theme.pick(`Chain ×${this.chain}`, `${this.chain}× COMBO!`));
    }
    g.destroy();
    this.updateHud();
  }

  updateHud() {
    this.hud.setText(`${Theme.pick('Smashed', 'Knocked')} ${this.smashed} of ${this.total}  ·  ${Theme.pick('Throws', 'Throws')} ${this.throws}`);
  }

  update(time, delta) {
    const W = Layout.W(this);
    this.rest.tick(delta);

    if (this.breakQueue.length) {
      const q = this.breakQueue;
      this.breakQueue = [];
      q.forEach((g) => g.active && this.shatter(g));
    }

    for (const g of this.pieces) {
      if (!g.broken && g.active && (g.y > this.ground + 120 || g.x < -80 || g.x > W + 80)) this.shatter(g, true);
    }
    this.pieces = this.pieces.filter((g) => !g.broken);

    const ball = this.flying;
    if (ball && ball.active) {
      const age = time - this.flyStart;
      const out = ball.x > W + 100 || ball.x < -80 || ball.y > this.ground + 150;
      const still = ball.body.speed < 0.2 && age > 1200;
      if (out || still || age > 6000) {
        this.flying = null;
        this.tweens.add({ targets: ball, alpha: 0, duration: 300, onComplete: () => ball.destroy() });
        this.time.delayedCall(350, () => this.reload());
      }
    }

    if (!this.done && this.pieces.length === 0 && this.total > 0) {
      this.done = true;
      this.time.delayedCall(1100, () => this.showClear());
    }
  }

  showClear() {
    const par = this.def.par;
    const stars = this.throws <= par ? 3 : this.throws <= par + 2 ? 2 : 1;
    BestScores.submit('smash', this.level + 1);
    this.bowl.fanfare();
    if (this.kids) this.bowl.sparkle();
    UIKit.resultCard(this, {
      eyebrow: `${Theme.pick('Shelf', 'Level')} ${this.level} ${Theme.pick('cleared', 'done!')}`,
      title: '★'.repeat(stars) + '☆'.repeat(3 - stars),
      lines: [`${this.total} ${Theme.pick('pieces', 'blocks')} in ${this.throws} ${this.throws === 1 ? 'throw' : 'throws'}`, `Three stars takes ${par} or fewer`],
      primary: [Theme.pick('Next shelf', 'Next level'), () => this.scene.restart({ level: this.level + 1 })],
      secondary: [Theme.pick('Smash it again', 'Play again'), () => this.scene.restart({ level: this.level })]
    });
  }
}
