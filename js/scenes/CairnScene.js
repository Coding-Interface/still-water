/**
 * CairnScene — Stone Cairn (Grown-ups) / Block Tower (Kids). An endless climb.
 * Balance river stones (or toy blocks) on a rock in the lake. Real physics
 * (Matter.js). As the tower grows the camera rises with it, the sky changes with
 * altitude (clouds, birds and balloons, then stars and planets), and height
 * markers count the metres. Pieces that scroll below the screen and have come to
 * rest set into the foundation (become static), so a tall tower stays steady.
 * Pieces that slip fall into the lake with a splash; there is no penalty.
 * Turning snaps to 15° steps (tap the arrows, hold them to keep turning, use the
 * mouse wheel or Q / E), and an angle readout shows the tilt. A mini map in the
 * corner shows the whole tower and where the view is.
 */
class CairnScene extends Phaser.Scene {
  static SHAPES = { adults: [], kids: [] };
  static PX_PER_M = 100; // 100 layout pixels = 1 metre

  constructor() {
    super({
      key: 'CairnScene',
      physics: {
        default: 'matter',
        matter: { gravity: { y: 1 }, enableSleeping: true, debug: false }
      }
    });
  }

  init() {
    this.stones = [];
    this.hover = null;
    this.aiming = false;
    this.best = 0;
    this.bestHeight = 0;
    this.lastDrop = 0;
    this.lastClick = 0;
    this.countTimer = 0;
    this.stableFor = 0;
    this.decoChunks = new Set();
    this.nextMilestone = 10;
    this.camY = 0;
    this.angleStep = 0;
    this.angleShown = 0;
    this.holdEvent = null;
    this.mapTimer = 0;
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.W = W;
    this.H = H;
    this.land = land;
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.aimX = W / 2;

    this.drawHighSky(W);
    this.sky = new NightSky(this, { sunX: W * 0.5, sunY: H * (land ? 0.26 : 0.2) });
    this.groundTop = land ? H - 150 : 1012;
    this.waterLine = this.groundTop + 58;
    this.deco = this.add.container(0, 0);
    this.ensureDeco(0);

    this.drawRock(W);
    this.matter.add.rectangle(W / 2, this.groundTop + 40, 360, 80, {
      isStatic: true,
      chamfer: { radius: 18 },
      friction: 1,
      frictionStatic: 2
    });

    this.makeStoneTextures();

    UIKit.leave(this);
    const fixed = (o) => o.setScrollFactor(0).setDepth(45);
    fixed(UIKit.text(this, W - 160, 62, GameLibrary.get('cairn').title, { display: true, size: 38, ox: 1, align: 'right' }));
    this.countText = fixed(UIKit.text(this, 34, 132, '', { size: 24, weight: '600', ox: 0, align: 'left' }));
    this.heightText = fixed(UIKit.text(this, 34, 166, '', { size: 21, color: Palette.css(Palette.SAFFRON), ox: 0, align: 'left' }));
    this.bestText = fixed(UIKit.text(this, 34, 198, '', { size: 19, color: Palette.css(Palette.MIST), ox: 0, align: 'left' }));
    this.updateCount(0, 0);

    this.guide = this.add.graphics();

    const accent = Theme.kids ? Palette.SAFFRON : Palette.MIST;
    const btn = (x, y, label, fn, o) => fixed(UIKit.button(this, x, y, label, fn, Object.assign({ accent }, o)));
    // the turn buttons act on press, and keep turning while held
    const turnBtn = (x, y, label, dir) => {
      const b = btn(x, y, label, () => {}, { w: 128, h: 76, size: 34 });
      b.on('pointerdown', () => this.startHold(dir));
      b.on('pointerup', () => this.stopHold());
      b.on('pointerout', () => this.stopHold());
      return b;
    };
    if (land) {
      turnBtn(104, H - 60, '⟲', -1);
      turnBtn(W - 104, H - 60, '⟳', 1);
      btn(W - 170, 150, Theme.pick('Clear the rock', 'Start again'), () => this.clear(), { w: 260, h: 66, size: 22 });
    } else {
      turnBtn(104, 1190, '⟲', -1);
      btn(W / 2, 1190, Theme.pick('Clear the rock', 'Start again'), () => this.clear(), { w: 260, h: 76, size: 24 });
      turnBtn(W - 104, 1190, '⟳', 1);
    }
    this.angleText = UIKit.text(this, 0, 0, '0°', { size: 22, weight: '600', color: Palette.css(Palette.SAFFRON) }).setDepth(21).setAlpha(0);
    this.makeMiniMap();

    this.bindInput();
    this.matter.world.on('collisionstart', (ev) => {
      const now = this.time.now;
      for (const pair of ev.pairs) {
        const v = Math.max(pair.bodyA.speed || 0, pair.bodyB.speed || 0);
        if (v > 1.2 && now - this.lastClick > 70) {
          this.lastClick = now;
          if (this.kids) this.bowl.toy(Math.min(1, v / 9));
          else this.bowl.thunk(Math.min(1, v / 9));
        }
      }
    });

    this.spawnHover();
    this.rest = new EyeRest(this);
    UIKit.toast(this, Theme.pick('Build as high as you like. The view rises with your cairn.', 'Build up and up! The camera climbs with your tower.'), land ? 200 : 250);
    WakeKeeper.hold();
  }

  /* ---------- the sky above ---------- */

  /** A tall gradient from the day (or night) sky up into space, drawn once. */
  drawHighSky(W) {
    const g = this.add.graphics();
    const space = this.kids ? 0x1b1e5c : 0x03070c;
    const mid = this.kids ? 0x2f7fe0 : 0x07101a;
    g.fillStyle(space, 1);
    g.fillRect(0, -400000, W, 400000 - 14000);
    g.fillGradientStyle(space, space, mid, mid, 1);
    g.fillRect(0, -14000, W, 8000);
    g.fillGradientStyle(mid, mid, Palette.SKY_TOP, Palette.SKY_TOP, 1);
    g.fillRect(0, -6000, W, 6002);
  }

  /** Decorations and height markers are made lazily, 600 px at a time, as you climb. */
  ensureDeco(scrollY) {
    const top = Math.floor(-scrollY / 600) + 2;
    for (let c = 0; c <= top; c++) {
      if (this.decoChunks.has(c)) continue;
      this.decoChunks.add(c);
      this.makeChunk(c);
    }
  }

  makeChunk(c) {
    const W = this.W;
    // chunk 0 is the band just above the rock; each chunk is the next 600 px up
    const y0 = this.groundTop - (c + 1) * 600;
    const alt = (c * 600) / CairnScene.PX_PER_M;
    const g = this.add.graphics();
    this.deco.add(g);
    const rnd = (a, b) => Phaser.Math.Between(a, b);

    // height markers on the right edge, measured from the top of the rock
    for (let y = y0; y < y0 + 600; y += 100) {
      const metres = Math.round((this.groundTop - y) / CairnScene.PX_PER_M);
      if (metres <= 0 || y > this.groundTop - 100) continue;
      const major = metres % 5 === 0;
      g.lineStyle(2, 0xffffff, major ? 0.45 : 0.2);
      g.lineBetween(W - 18, y, W - (major ? 52 : 34), y);
      if (major) this.deco.add(UIKit.text(this, W - 60, y, `${metres} m`, { size: 18, weight: '600', ox: 1, align: 'right', alpha: 0.75 }));
    }

    // the first two bands are the everyday sky you start in; decorations begin above them
    if (c < 2) return;
    const top = y0;
    if (this.kids) {
      if (alt < 30) {
        for (let i = 0; i < 2; i++) this.cloud(g, rnd(40, W - 40), top + rnd(40, 560), Phaser.Math.FloatBetween(0.6, 1.1));
        if (Math.random() < 0.7) this.birds(g, rnd(80, W - 160), top + rnd(60, 540));
        if (Math.random() < 0.35) this.balloon(rnd(80, W - 80), top + rnd(80, 520));
      } else if (alt < 70) {
        this.cloud(g, rnd(40, W - 40), top + rnd(40, 560), 0.8);
        if (Math.random() < 0.4) this.balloon(rnd(80, W - 80), top + rnd(80, 520));
        if (Math.random() < 0.25) this.rainbow(g, rnd(150, W - 150), top + rnd(200, 500));
        this.stars(g, top, 6);
      } else {
        this.stars(g, top, 24);
        if (Math.random() < 0.3) this.planet(g, rnd(90, W - 90), top + rnd(80, 520));
      }
    } else if (alt < 40) {
      this.stars(g, top, 10);
      if (Math.random() < 0.5) {
        g.fillStyle(0xffffff, 0.04);
        g.fillEllipse(rnd(0, W), top + rnd(50, 550), rnd(260, 480), rnd(30, 60));
      }
    } else {
      this.stars(g, top, 30);
      if (Math.random() < 0.18) this.planet(g, rnd(90, W - 90), top + rnd(80, 520));
    }
  }

  cloud(g, x, y, s) {
    g.fillStyle(0xffffff, 0.9);
    [[-40, 8, 70, 46], [0, -10, 90, 70], [44, 6, 76, 50], [0, 14, 150, 40]].forEach(([dx, dy, w, h]) => g.fillEllipse(x + dx * s, y + dy * s, w * s, h * s));
  }

  birds(g, x, y) {
    g.lineStyle(3, 0x1d2458, 0.8);
    for (let i = 0; i < 3; i++) {
      const bx = x + i * 34;
      const by = y + (i % 2) * 14;
      g.beginPath();
      g.arc(bx - 8, by, 8, Math.PI * 1.1, Math.PI * 1.9);
      g.strokePath();
      g.beginPath();
      g.arc(bx + 8, by, 8, Math.PI * 1.1, Math.PI * 1.9);
      g.strokePath();
    }
  }

  balloon(x, y) {
    const b = new Balloon(this, x, y, 46, Theme.CANDY[Phaser.Math.Between(0, 5)]);
    b.setBloom(1);
    this.deco.add(b);
    this.tweens.add({ targets: b, y: y - 20, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  rainbow(g, x, y) {
    Theme.CANDY.forEach((col, i) => {
      g.lineStyle(10, col, 0.7);
      g.beginPath();
      g.arc(x, y, 120 - i * 10, Math.PI, 0);
      g.strokePath();
    });
  }

  stars(g, y0, n) {
    for (let i = 0; i < n; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.25, 0.85));
      g.fillCircle(Phaser.Math.Between(0, this.W), y0 + Phaser.Math.Between(0, 600), Phaser.Math.FloatBetween(0.8, 2.2));
    }
  }

  planet(g, x, y) {
    const col = this.kids ? Theme.CANDY[Phaser.Math.Between(0, 5)] : 0x8c7a6b;
    const r = Phaser.Math.Between(22, 40);
    g.fillStyle(col, this.kids ? 1 : 0.7);
    g.fillCircle(x, y, r);
    g.fillStyle(0xffffff, 0.2);
    g.fillCircle(x - r * 0.3, y - r * 0.3, r * 0.4);
    if (Math.random() < 0.5) {
      g.lineStyle(3, 0xffffff, 0.5);
      g.strokeEllipse(x, y, r * 3, r * 0.8);
    }
  }

  /* ---------- the rock and the pieces ---------- */

  updateCount(n, metres) {
    this.countText.setText(`${n} ${Theme.pick(n === 1 ? 'stone' : 'stones', n === 1 ? 'block' : 'blocks')} ${Theme.pick('balanced', 'stacked')}`);
    this.heightText.setText(`Height ${metres.toFixed(1)} m`);
  }

  drawRock(W) {
    const g = this.add.graphics();
    const top = this.groundTop;
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(W / 2, top + 92, 440, 46);
    if (this.kids) {
      g.fillStyle(0xd2a86a, 1);
      g.fillRoundedRect(W / 2 - 190, top + 6, 380, 86, 30);
      g.fillStyle(0x6cc36a, 1);
      g.fillRoundedRect(W / 2 - 184, top, 368, 34, 16);
      g.fillStyle(0xffffff, 0.25);
      g.fillRoundedRect(W / 2 - 170, top + 4, 340, 10, 5);
      for (let i = 0; i < 6; i++) {
        g.fillStyle(Theme.CANDY[i], 1);
        g.fillCircle(W / 2 - 150 + i * 60, top + 50, 5);
      }
    } else {
      g.fillStyle(0x3b4247, 1);
      g.fillRoundedRect(W / 2 - 190, top + 6, 380, 86, 30);
      g.fillStyle(0x50585e, 1);
      g.fillRoundedRect(W / 2 - 180, top, 360, 70, 26);
      g.fillStyle(0xffffff, 0.08);
      g.fillRoundedRect(W / 2 - 168, top + 4, 336, 18, 9);
    }
    for (let i = 0; i < 4; i++) {
      const e = this.add.ellipse(W / 2, top + 86, 420 + i * 60, 30 + i * 8);
      e.setStrokeStyle(2, 0xffffff, (this.kids ? 0.3 : 0.12) - i * 0.025);
    }
  }

  shapes() {
    return this.kids ? CairnScene.SHAPES.kids : CairnScene.SHAPES.adults;
  }

  makeStoneTextures() {
    if (this.shapes().length) return;
    const g = this.make.graphics({ add: false });
    const list = this.shapes();
    if (this.kids) {
      for (let i = 0; i < 12; i++) {
        const w = Phaser.Math.Between(90, 170);
        const h = Phaser.Math.Between(42, 68);
        const rad = 10;
        const col = Theme.CANDY[i % Theme.CANDY.length];
        g.clear();
        g.fillStyle(col, 1);
        g.fillRoundedRect(0, 0, w, h, rad);
        g.fillStyle(0x000000, 0.15);
        g.fillRoundedRect(0, h * 0.7, w, h * 0.3, { tl: 0, tr: 0, bl: rad, br: rad });
        g.fillStyle(0xffffff, 0.35);
        g.fillRoundedRect(5, 4, w - 10, h * 0.25, 6);
        g.lineStyle(3, 0xffffff, 0.9);
        g.strokeRoundedRect(1.5, 1.5, w - 3, h - 3, rad);
        g.fillStyle(0xffffff, 0.85);
        const deco = i % 3;
        if (deco === 0) g.fillCircle(w / 2, h / 2, Math.min(12, h * 0.22));
        else if (deco === 1) g.fillTriangle(w / 2 - 12, h / 2 + 9, w / 2 + 12, h / 2 + 9, w / 2, h / 2 - 11);
        else g.fillRect(w / 2 - 10, h / 2 - 10, 20, 20);
        const key = 'toyBlock' + i;
        g.generateTexture(key, w, h);
        list.push({ key, w, h, rad });
      }
    } else {
      const colors = [0x8a8f93, 0x9c9284, 0x6f7477, 0xa7a196, 0x7f7466, 0x5f6a6e, 0xb0a99b, 0x77706a];
      for (let i = 0; i < 12; i++) {
        const w = Phaser.Math.Between(96, 176);
        const h = Phaser.Math.Between(40, 70);
        const rad = Math.min(h / 2 - 1, Phaser.Math.Between(14, 30));
        const col = colors[i % colors.length];
        g.clear();
        g.fillStyle(col, 1);
        g.fillRoundedRect(0, 0, w, h, rad);
        g.fillStyle(0x000000, 0.14);
        g.fillRoundedRect(3, h * 0.58, w - 6, h * 0.4, Math.min(rad, h * 0.2));
        g.fillStyle(0xffffff, 0.12);
        g.fillRoundedRect(5, 3, w - 10, h * 0.42, Math.min(rad, h * 0.21));
        for (let k = 0; k < 60; k++) {
          g.fillStyle(k % 2 ? 0x000000 : 0xffffff, 0.1);
          g.fillRect(rad * 0.6 + Math.random() * (w - rad * 1.2), 4 + Math.random() * (h - 8), 2, 2);
        }
        const key = 'cairnStone' + i;
        g.generateTexture(key, w, h);
        list.push({ key, w, h, rad });
      }
    }
    g.destroy();
  }

  bindInput() {
    const W = this.W;
    const clampX = (x) => Phaser.Math.Clamp(x, 70, W - 70);
    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open) return;
      this.bowl.unlock();
      this.aiming = true;
      this.aimX = clampX(p.lx);
    });
    this.input.on('pointermove', (p) => {
      if (this.rest.open) return;
      if (p.isDown && !this.aiming) return;
      this.aimX = clampX(p.lx);
    });
    this.input.on('pointerup', () => {
      this.stopHold();
      if (!this.aiming) return;
      this.aiming = false;
      this.drop();
    });
    this.input.on('wheel', (p, over, dx, dy) => {
      if (this.rest.open) return;
      this.wheelAcc = (this.wheelAcc || 0) + dy;
      if (Math.abs(this.wheelAcc) >= 60) {
        this.turn(Math.sign(this.wheelAcc));
        this.wheelAcc = 0;
      }
    });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-Q', () => this.turn(-1));
      this.input.keyboard.on('keydown-E', () => this.turn(1));
      this.input.keyboard.on('keydown-LEFT', () => (this.aimX = clampX(this.aimX - 20)));
      this.input.keyboard.on('keydown-RIGHT', () => (this.aimX = clampX(this.aimX + 20)));
      this.input.keyboard.on('keydown-SPACE', () => this.drop());
    }
  }

  /** The top of the highest piece that has come to rest on the tower. */
  stackTop() {
    let top = this.groundTop;
    for (const s of this.stones) {
      if (s.sunk || !s.body || !s.settledOnce || s.y >= this.groundTop) continue;
      top = Math.min(top, s.body.bounds.min.y);
    }
    return top;
  }

  hoverY() {
    return Math.min(this.stackTop() - 130, this.groundTop - 130);
  }

  spawnHover() {
    if (this.hover) return;
    const shape = Phaser.Utils.Array.GetRandom(this.shapes());
    this.angleStep = 0;
    this.hover = this.add.image(this.aimX, this.hoverY(), shape.key).setAlpha(0).setDepth(20);
    this.hover.shape = shape;
    this.tweens.add({ targets: this.hover, alpha: 0.95, duration: 300 });
  }

  /** The exact angle the next piece will drop at, in radians: a whole number of 15° steps. */
  targetAngle() {
    return (this.angleStep * Math.PI) / 12;
  }

  /** Turn by one 15° step. The piece eases to the new angle; quick taps never leave it in between. */
  turn(dir) {
    if (!this.hover || this.rest.open) return;
    this.angleStep = (((this.angleStep + dir) % 24) + 24) % 24;
    if (this.angleStep > 12) this.angleStep -= 24; // keep it in −165°…180°
    this.angleShown = 1400;
    if (this.kids) this.bowl.tok(0.35);
    else this.bowl.tick();
  }

  startHold(dir) {
    this.stopHold();
    this.turn(dir);
    this.holdEvent = this.time.addEvent({
      delay: 340,
      callback: () => {
        this.holdEvent = this.time.addEvent({ delay: 110, loop: true, callback: () => this.turn(dir) });
      }
    });
  }

  stopHold() {
    if (this.holdEvent) this.holdEvent.remove(false);
    this.holdEvent = null;
  }

  drop() {
    const now = this.time.now;
    if (!this.hover || now - this.lastDrop < 450 || this.rest.open) return;
    this.lastDrop = now;
    const h = this.hover;
    this.hover = null;
    this.tweens.killTweensOf(h);
    this.stopHold();
    const s = h.shape;
    const stone = this.matter.add.image(h.x, h.y, s.key, null, {
      chamfer: { radius: s.rad },
      friction: 0.95,
      frictionStatic: 1.6,
      frictionAir: 0.012,
      restitution: 0,
      density: 0.002,
      slop: 0.02
    });
    stone.setRotation(this.targetAngle());
    h.destroy();
    this.stones.push(stone);
    this.dropped = (this.dropped || 0) + 1;
    this.stableFor = 0;
    this.time.delayedCall(650, () => this.spawnHover());
  }

  clear() {
    if (this.rest.open) return;
    this.bowl.unlock();
    const old = this.stones;
    this.stones = [];
    old.forEach((s) => {
      s.sunk = true;
      this.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => s.destroy() });
    });
    this.best = 0;
    this.nextMilestone = 10;
    this.bowl.strike(196, 0.12, 4);
    if (this.hover) this.hover.y = this.groundTop - 130;
  }

  splash(x) {
    this.bowl.splash();
    for (let i = 0; i < 3; i++) {
      const e = this.add.ellipse(x, this.waterLine + 10, 60, 14);
      e.setStrokeStyle(2, 0xffffff, 0.4);
      this.tweens.add({ targets: e, scaleX: 3 + i, scaleY: 3 + i, alpha: 0, delay: i * 180, duration: 1600, onComplete: () => e.destroy() });
    }
  }

  update(time, delta) {
    this.rest.tick(delta);
    const cam = this.cameras.main;

    // The camera keeps the top of the tower a little above the middle of the screen.
    const target = Math.min(0, this.stackTop() - this.H * 0.5);
    this.camY += (target - this.camY) * Math.min(1, delta / 400);
    cam.scrollY = this.camY;
    this.ensureDeco(this.camY);

    if (this.hover) {
      this.hover.x += (this.aimX - this.hover.x) * Math.min(1, delta / 60);
      this.hover.y += (this.hoverY() - this.hover.y) * Math.min(1, delta / 200);
      // ease toward the snapped angle along the shorter way round
      const goal = this.targetAngle();
      const diff = Phaser.Math.Angle.Wrap(goal - this.hover.rotation);
      this.hover.rotation = Math.abs(diff) < 0.002 ? goal : this.hover.rotation + diff * Math.min(1, delta / 70);
    }
    this.angleShown = Math.max(0, this.angleShown - delta);
    if (this.hover) {
      const deg = Math.round(this.angleStep * 15);
      this.angleText.setText(deg === 0 ? Theme.pick('level', 'flat') : `${deg > 0 ? '↻' : '↺'} ${Math.abs(deg)}°`);
      this.angleText.setPosition(this.hover.x, this.hover.y - this.hover.shape.h / 2 - 34);
      this.angleText.setAlpha(Math.min(1, this.angleShown / 400));
    } else {
      this.angleText.setAlpha(0);
    }

    this.guide.clear();
    if (this.hover) {
      const top = this.stackTop();
      this.guide.fillStyle(this.kids ? 0xffffff : Palette.MOON, this.kids ? 0.6 : 0.22);
      for (let y = this.hover.y + 40; y < top - 6; y += 18) this.guide.fillRect(this.hover.x - 1, y, 2, 8);
    }

    for (const s of this.stones) {
      if (!s.sunk && s.y > this.waterLine) {
        s.sunk = true;
        this.splash(s.x);
        this.tweens.add({ targets: s, alpha: 0, duration: 500, onComplete: () => s.destroy() });
      }
    }
    this.stones = this.stones.filter((s) => !(s.sunk && !s.active));

    this.mapTimer += delta;
    if (this.mapTimer > 120) {
      this.mapTimer = 0;
      this.drawMiniMap();
    }

    this.countTimer += delta;
    if (this.countTimer > 300) {
      this.countTimer = 0;
      this.count();
    }
  }

  /* ---------- the mini map ---------- */

  makeMiniMap() {
    const land = this.land;
    this.map = land ? { x: 22, y: 236, w: 112, h: 280 } : { x: 22, y: 240, w: 112, h: 330 };
    this.mapG = this.add.graphics().setScrollFactor(0).setDepth(44);
    this.mapLabel = UIKit.text(this, this.map.x + this.map.w / 2, this.map.y + 16, Theme.pick('Whole cairn', 'My tower'), {
      size: 14,
      weight: '600',
      color: Palette.css(Palette.MIST)
    })
      .setScrollFactor(0)
      .setDepth(45);
    this.drawMiniMap();
  }

  /** The whole tower in miniature: rock, every piece at its true angle, and a frame for the view. */
  drawMiniMap() {
    const g = this.mapG;
    if (!g) return;
    const M = this.map;
    const kids = this.kids;
    g.clear();
    g.fillStyle(kids ? 0x1b3d7a : 0x000000, kids ? 0.45 : 0.38);
    g.fillRoundedRect(M.x, M.y, M.w, M.h, 14);
    g.lineStyle(kids ? 2.5 : 1.5, kids ? 0xffffff : Palette.MOON, kids ? 0.7 : 0.2);
    g.strokeRoundedRect(M.x, M.y, M.w, M.h, 14);

    const inner = { x: M.x + 8, y: M.y + 32, w: M.w - 16, h: M.h - 40 };
    const bottom = this.waterLine + 20;
    const top = Math.min(this.stackTop() - 140, this.camY - 20, bottom - 700);
    const sc = Math.min(inner.h / (bottom - top), inner.w / this.W);
    const mx = (x) => inner.x + inner.w / 2 + (x - this.W / 2) * sc;
    const my = (y) => inner.y + inner.h - (bottom - y) * sc;

    // water and rock
    g.fillStyle(kids ? 0x4fb6ff : 0x2f7a9c, 0.7);
    g.fillRect(inner.x, my(this.waterLine), inner.w, inner.y + inner.h - my(this.waterLine));
    g.fillStyle(kids ? 0x6cc36a : 0x50585e, 1);
    g.fillRect(mx(this.W / 2 - 180), my(this.groundTop), 360 * sc, Math.max(2, 70 * sc));

    // metre ticks every 5 m
    for (let m = 5; this.groundTop - m * CairnScene.PX_PER_M > top; m += 5) {
      const y = my(this.groundTop - m * CairnScene.PX_PER_M);
      g.lineStyle(1, 0xffffff, m % 10 === 0 ? 0.35 : 0.15);
      g.lineBetween(inner.x, y, inner.x + 6, y);
    }

    // every piece, at its real angle
    for (const s of this.stones) {
      if (s.sunk || !s.body) continue;
      const pts = s.body.vertices.map((v) => ({ x: mx(v.x), y: my(v.y) }));
      g.fillStyle(kids ? this.mapColor(s) : 0xcfc6b8, 1);
      g.fillPoints(pts, true);
    }

    // the view you are looking at
    const vy0 = Math.max(my(this.camY), inner.y);
    const vy1 = Math.min(my(this.camY + this.H), inner.y + inner.h);
    g.lineStyle(2, Palette.SAFFRON, 0.9);
    g.strokeRect(inner.x - 2, vy0, inner.w + 4, Math.max(4, vy1 - vy0));

    const metres = Math.max(0, (this.groundTop - this.stackTop()) / CairnScene.PX_PER_M);
    this.mapLabel.setText(`${Theme.pick('Cairn', 'Tower')} ${metres.toFixed(1)} m`);
  }

  /** Each toy block keeps its own colour on the map. */
  mapColor(s) {
    if (s.mapColor == null) {
      const i = parseInt(String(s.texture.key).replace(/\D/g, ''), 10) || 0;
      s.mapColor = Theme.CANDY[i % Theme.CANDY.length];
    }
    return s.mapColor;
  }

  count() {
    const live = this.stones.filter((s) => !s.sunk && s.body);
    const isResting = (s) => s.frozen || s.body.isSleeping || (s.body.speed < 0.6 && Math.abs(s.body.angularVelocity) < 0.02);
    const resting = live.filter(isResting);
    resting.forEach((s) => (s.settledOnce = true));
    const settled = resting.length === live.length;
    const n = resting.filter((s) => s.y < this.groundTop).length;
    const metres = Math.max(0, (this.groundTop - this.stackTop()) / CairnScene.PX_PER_M);
    this.updateCount(n, metres);

    // Pieces well below the screen that are at rest set into the foundation.
    const camBottom = this.cameras.main.scrollY + this.H;
    if (settled) {
      resting.forEach((s) => {
        if (!s.frozen && s.y > camBottom + 60) {
          s.setStatic(true);
          s.frozen = true;
        }
      });
    }

    this.stableFor = settled ? this.stableFor + 300 : 0;
    if (settled && this.stableFor >= 1200 && n > this.best) {
      this.best = n;
      if (metres > this.bestHeight) this.bestHeight = metres;
      const allTime = ProgressStore.setBest('cairn', n);
      this.bestText.setText(`${Theme.pick('Tallest', 'Best tower')}: ${allTime}  ·  ${this.bestHeight.toFixed(1)} m today`);
      if (n >= 3) {
        this.bowl.strike(n >= 7 ? 262 : 220, 0.14, 5);
        if (this.kids) this.bowl.sparkle(0.7);
      }
      if (n >= this.nextMilestone) {
        this.nextMilestone += 10;
        this.bowl.fanfare();
        UIKit.floatText(this, this.W / 2, this.stackTop() - 60, Theme.pick(`${n} stones`, `${n} blocks! Wow!`), Palette.SAFFRON, 44);
      }
    }
  }
}
