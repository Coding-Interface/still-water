/**
 * SandScene — Sand Garden (Grown-ups) / Beach Doodle (Kids).
 * Grown-ups: a karesansui (Japanese dry garden). Drag to rake grooves, place
 * stones that the rake circles, smooth it all away to begin again.
 * Kids: a sunny beach. The rake leaves rainbow trails and the stones are
 * shells and starfish. Tools sit below the sand when upright, beside it when sideways.
 */
class SandScene extends Phaser.Scene {
  constructor() {
    super('SandScene');
  }

  init() {
    this.tool = 'rake';
    this.last = null;
    this.stones = [];
    this.smoothing = false;
    this.rake = null;
    this.moveAt = 0;
    this.hue = Math.random();
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    const R = (this.R = land ? { x: 30, y: 110, w: W - 300, h: H - 140 } : { x: 30, y: 128, w: 660, h: 964 });
    this.baseKey = `sandBase_${this.kids ? 'k' : 'a'}_${R.w}x${R.h}`;

    this.add.rectangle(0, 0, W, H, this.kids ? 0x45b6f0 : Palette.WOOD_DARK).setOrigin(0);
    const frame = this.add.graphics();
    frame.fillStyle(Palette.WOOD, 1);
    frame.fillRoundedRect(R.x - 14, R.y - 14, R.w + 28, R.h + 28, this.kids ? 26 : 0);
    frame.lineStyle(2, 0x000000, 0.35);
    frame.strokeRect(R.x - 1, R.y - 1, R.w + 2, R.h + 2);
    if (!this.kids) {
      for (let i = 0; i < 6; i++) {
        frame.lineStyle(1, 0x000000, 0.12);
        frame.lineBetween(R.x - 14, R.y - 10 + i * 2, R.x + R.w + 14, R.y - 10 + i * 2);
      }
    }

    this.makeTextures();
    this.rt = this.add.renderTexture(R.x, R.y, R.w, R.h).setOrigin(0);
    this.rt.draw(this.baseKey, 0, 0);
    this.brush = this.make.graphics({ add: false });
    this.stoneLayer = this.add.container(R.x, R.y);

    this.seedGarden();

    UIKit.text(this, W - 160, 62, GameLibrary.get('sand').title, { display: true, size: 38, ox: 1, align: 'right' });
    UIKit.leave(this);

    const accent = this.kids ? Palette.SAFFRON : Palette.SAND;
    const stoneLabel = Theme.pick('Stone', 'Shell');
    const pos = land
      ? [[W - 130, 250], [W - 130, 350], [W - 130, 450]]
      : [[132, 1182], [360, 1182], [588, 1182]];
    this.tools = {
      rake: UIKit.button(this, pos[0][0], pos[0][1], Theme.pick('Rake', 'Draw'), () => this.setTool('rake'), { w: 200, h: 72, accent }),
      stone: UIKit.button(this, pos[1][0], pos[1][1], stoneLabel, () => this.setTool('stone'), { w: 200, h: 72, accent }),
      smooth: UIKit.button(this, pos[2][0], pos[2][1], Theme.pick('Smooth', 'Wipe'), () => this.smooth(), { w: 200, h: 72, accent })
    };
    this.setTool('rake');

    this.bindInput();
    this.rest = new EyeRest(this);
    UIKit.toast(this, GameLibrary.get('sand').hint, land ? 640 : 190);
    WakeKeeper.hold();

    this.events.once('shutdown', () => {
      if (this.rake) this.rake.stop();
      this.rake = null;
    });
  }

  makeTextures() {
    const R = this.R;
    if (!this.textures.exists(this.baseKey)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(Palette.SAND, 1);
      g.fillRect(0, 0, R.w, R.h);
      const n = Math.round((R.w * R.h) / 122);
      for (let i = 0; i < n; i++) {
        g.fillStyle(Math.random() < 0.5 ? Palette.SAND_DARK : Palette.SAND_LIGHT, Math.random() * 0.35 + 0.1);
        g.fillRect(Math.random() * R.w, Math.random() * R.h, 2, 2);
      }
      g.generateTexture(this.baseKey, R.w, R.h);
      g.destroy();
    }
    const prefix = this.kids ? 'shell' : 'zenStone';
    [[64, 48], [86, 60], [52, 42], [74, 56]].forEach(([w, h], i) => {
      const key = prefix + i;
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ add: false });
      if (this.kids) {
        SandScene.drawShell(g, i, 80, 80);
        g.generateTexture(key, 80, 80);
      } else {
        g.fillStyle(Palette.STONE_DARK, 1);
        g.fillEllipse(w / 2, h / 2, w, h);
        g.fillStyle(Palette.STONE, 1);
        g.fillEllipse(w / 2 - 2, h / 2 - 3, w - 8, h - 9);
        g.fillStyle(0xffffff, 0.14);
        g.fillEllipse(w * 0.36, h * 0.32, w * 0.42, h * 0.26);
        for (let k = 0; k < 40; k++) {
          g.fillStyle(0x000000, 0.12);
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * 0.4;
          g.fillRect(w / 2 + Math.cos(a) * w * r, h / 2 + Math.sin(a) * h * r, 2, 2);
        }
        g.generateTexture(key, w, h);
      }
      g.destroy();
    });
  }

  /** Kids beach treasures: scallop shell, starfish, spiral shell, pebble. */
  static drawShell(g, kind, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    if (kind === 1) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const r = i % 2 ? 13 : 34;
        pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillStyle(0xff8a3d, 1);
      g.fillPoints(pts, true);
      g.lineStyle(3, 0xffffff, 0.9);
      g.strokePoints(pts, true);
      g.fillStyle(0xffd3a8, 1);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        g.fillCircle(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 3);
      }
      return;
    }
    if (kind === 2) {
      g.fillStyle(0xa77bff, 1);
      g.fillCircle(cx, cy, 26);
      g.lineStyle(4, 0xffffff, 0.9);
      g.beginPath();
      for (let t = 0; t < 14; t += 0.2) {
        const r = 2 + t * 1.7;
        const x = cx + Math.cos(t) * r;
        const y = cy + Math.sin(t) * r;
        if (t === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
      return;
    }
    if (kind === 3) {
      g.fillStyle(0x4fb6ff, 1);
      g.fillEllipse(cx, cy, 52, 40);
      g.fillStyle(0xffffff, 0.5);
      g.fillEllipse(cx - 10, cy - 8, 18, 10);
      g.lineStyle(3, 0xffffff, 0.9);
      g.strokeEllipse(cx, cy, 52, 40);
      return;
    }
    // scallop
    g.fillStyle(0xff6fa8, 1);
    g.slice(cx, cy + 22, 36, Math.PI + 0.2, -0.2, false);
    g.fillPath();
    g.fillRect(cx - 8, cy + 18, 16, 10);
    g.lineStyle(3, 0xffffff, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + 0.35 + (i / 5) * (Math.PI - 0.7);
      g.lineBetween(cx, cy + 22, cx + Math.cos(a) * 32, cy + 22 + Math.sin(a) * 32);
    }
  }

  /** Start with a garden already raked: straight rows and one stone. */
  seedGarden() {
    const R = this.R;
    for (let y = 70; y < R.h - 40; y += 74) {
      for (let x = 0; x < R.w; x += 10) this.rakeSeg({ x, y }, { x: x + 10, y }, true);
    }
    this.flush();
    this.placeStone(R.w * 0.66, R.h * 0.36, 1, true);
  }

  setTool(tool) {
    this.tool = tool;
    this.tools.rake.setSelected(tool === 'rake');
    this.tools.stone.setSelected(tool === 'stone');
  }

  bindInput() {
    const R = this.R;
    const local = (p) => ({ x: p.lx - R.x, y: p.ly - R.y });
    const inside = (l, pad = 0) => l.x >= pad && l.y >= pad && l.x <= R.w - pad && l.y <= R.h - pad;

    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open || this.smoothing) return;
      this.bowl.unlock();
      const l = local(p);
      if (!inside(l)) return;
      if (this.tool === 'stone') {
        this.placeStone(l.x, l.y);
        return;
      }
      this.last = l;
      if (!this.rake) this.rake = this.bowl.startRake();
    });

    this.input.on('pointermove', (p) => {
      if (!this.last || !p.isDown || this.rest.open) return;
      const l = local(p);
      l.x = Phaser.Math.Clamp(l.x, 0, R.w);
      l.y = Phaser.Math.Clamp(l.y, 0, R.h);
      const d = Phaser.Math.Distance.Between(this.last.x, this.last.y, l.x, l.y);
      if (d < 5) return;
      this.rakeSeg(this.last, l);
      this.flush();
      if (this.rake) this.rake.set(Math.min(1, d / Math.max(8, this.game.loop.delta) / 1.4));
      this.moveAt = this.time.now;
      this.last = l;
    });

    const up = () => {
      this.last = null;
      if (this.rake) this.rake.set(0);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Four tines: each a soft trough, a shadow edge and a lit ridge (rainbow for kids). */
  rakeSeg(a, b, plain) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    const nx = -dy / len;
    const ny = dx / len;
    const g = this.brush;
    let tint = null;
    if (this.kids && !plain) {
      this.hue = (this.hue + len / 1600) % 1;
      tint = Phaser.Display.Color.HSVToRGB(this.hue, 0.55, 1).color;
    }
    for (const k of [-1.5, -0.5, 0.5, 1.5]) {
      const o = k * 15;
      const x1 = a.x + nx * o;
      const y1 = a.y + ny * o;
      const x2 = b.x + nx * o;
      const y2 = b.y + ny * o;
      g.lineStyle(7, Palette.SAND_DARK, 0.14);
      g.lineBetween(x1, y1, x2, y2);
      if (tint != null) {
        g.lineStyle(6, tint, 0.45);
        g.lineBetween(x1, y1, x2, y2);
      }
      g.lineStyle(2.5, Palette.SAND_SHADOW, 0.2);
      g.lineBetween(x1 + 1.5, y1 + 1.8, x2 + 1.5, y2 + 1.8);
      g.lineStyle(2, Palette.SAND_LIGHT, 0.5);
      g.lineBetween(x1 - 2, y1 - 2.4, x2 - 2, y2 - 2.4);
    }
  }

  ring(x, y, r) {
    const g = this.brush;
    g.lineStyle(7, Palette.SAND_DARK, 0.14);
    g.strokeCircle(x, y, r);
    g.lineStyle(2.5, Palette.SAND_SHADOW, 0.2);
    g.strokeCircle(x + 1.5, y + 1.8, r);
    g.lineStyle(2, Palette.SAND_LIGHT, 0.5);
    g.strokeCircle(x - 2, y - 2.4, r);
  }

  flush() {
    this.rt.draw(this.brush, 0, 0);
    this.brush.clear();
  }

  placeStone(x, y, variant, quiet) {
    const R = this.R;
    const max = this.kids ? 10 : 6;
    if (this.stones.length >= max * 2) {
      UIKit.toast(this, Theme.pick('Six stones is plenty. Choose Smooth to begin a new garden.', 'Lots of shells! Tap Wipe to start again.'), Layout.H(this) - 140, 2600);
      return;
    }
    const v = variant ?? Phaser.Math.Between(0, 3);
    const key = (this.kids ? 'shell' : 'zenStone') + v;
    const tex = this.textures.get(key).getSourceImage();
    const r0 = Math.max(tex.width, tex.height) / 2 + 6;
    x = Phaser.Math.Clamp(x, r0, R.w - r0);
    y = Phaser.Math.Clamp(y, r0, R.h - r0);

    if (!this.kids) {
      for (let i = 1; i <= 4; i++) this.ring(x, y, r0 + i * 17);
      this.flush();
    }

    const shadow = this.add.ellipse(x + 6, y + 9, tex.width * (this.kids ? 0.6 : 1), tex.height * (this.kids ? 0.5 : 0.9), 0x000000, 0.2);
    const stone = this.add.image(x, y, key).setAngle(Phaser.Math.Between(-25, 25));
    this.stoneLayer.add([shadow, stone]);
    this.stones.push(shadow, stone);

    if (!quiet) {
      stone.setScale(1.25).setAlpha(0);
      this.tweens.add({ targets: stone, scale: 1, alpha: 1, duration: 260, ease: this.kids ? 'Back.Out' : 'Quad.In' });
      this.time.delayedCall(240, () => (this.kids ? this.bowl.sparkle(0.6) : this.bowl.thunk(0.5)));
    }
  }

  smooth() {
    if (this.smoothing || this.rest.open) return;
    this.bowl.unlock();
    this.smoothing = true;
    const R = this.R;
    this.setTool('rake');

    const stones = this.stones;
    this.stones = [];
    this.tweens.add({ targets: stones, alpha: 0, duration: 500, onComplete: () => stones.forEach((s) => s.destroy()) });

    const fresh = this.add.image(R.x, R.y, this.baseKey).setOrigin(0).setCrop(0, 0, R.w, 0);
    const bar = this.add.rectangle(R.x, R.y, R.w, 16, Palette.WOOD, 1).setOrigin(0, 0.5);
    const scrape = this.rake || this.bowl.startRake();
    this.rake = scrape;
    if (scrape) scrape.set(0.5);

    const prog = { p: 0 };
    this.tweens.add({
      targets: prog,
      p: 1,
      duration: 1800,
      ease: 'Sine.InOut',
      onUpdate: () => {
        fresh.setCrop(0, 0, R.w, R.h * prog.p);
        bar.y = R.y + R.h * prog.p;
      },
      onComplete: () => {
        this.rt.clear();
        this.rt.draw(this.baseKey, 0, 0);
        fresh.destroy();
        bar.destroy();
        if (scrape) scrape.set(0);
        this.smoothing = false;
      }
    });
  }

  update(time, delta) {
    this.rest.tick(delta);
    if (this.rake && this.last && time - this.moveAt > 90) this.rake.set(0);
  }
}
