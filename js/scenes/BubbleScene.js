/**
 * BubbleScene — Bubble Wrap (Grown-ups) / Pop Party (Kids).
 * An endless supply of sheets in different shapes, and every sheet pops its own way:
 *   Grown-ups: Classic (snap), Honeycomb (bloop), Pearls (cork), Pillows (squeak)
 *   Kids:      Hearts (kiss), Stars (twinkle), Happy faces (boing), Flowers (bloop)
 * Each sheet also has its own pop effect: plastic flaps, honey drops, sparkles,
 * puffs, floating hearts, star bursts, confetti and petals.
 *
 * Special bubbles hide in every sheet:
 *   Big     — a deep MEGA pop that shakes the sheet
 *   Golden  — bursts into coins (+10 in a rush)
 *   Chain   — a rainbow ring; popping it sets off every bubble around it
 *   Leaky   — wobbles; press it and it whistles off round the screen before popping
 * Pop quickly and the pitch climbs a scale, so a fast run plays a tune.
 * "Pop rush" is a 30-second challenge for the most pops, with a saved best.
 */
class BubbleScene extends Phaser.Scene {
  static ADULT_STYLES = [
    { id: 'classic', name: 'Classic sheet', shape: 'circle', tint: 0xe9e4d6, sound: 'snap', fx: 'flaps' },
    { id: 'honey', name: 'Honeycomb sheet', shape: 'hex', tint: 0xe8ae4c, sound: 'bloop', fx: 'drops' },
    { id: 'pearl', name: 'Pearl sheet', shape: 'circle', tint: 0xe8a5b5, small: true, sound: 'cork', fx: 'sparkle' },
    { id: 'pillow', name: 'Pillow sheet', shape: 'square', tint: 0x8fc3d6, sound: 'squeak', fx: 'puff' }
  ];

  static KID_STYLES = [
    { id: 'hearts', name: 'Heart sheet', shape: 'heart', sound: 'kiss', fx: 'hearts' },
    { id: 'stars', name: 'Star sheet', shape: 'star', sound: 'twinkle', fx: 'stars' },
    { id: 'faces', name: 'Happy face sheet', shape: 'circle', face: true, sound: 'boing', fx: 'confetti' },
    { id: 'flowers', name: 'Flower sheet', shape: 'flower', sound: 'bloop', fx: 'petals' }
  ];

  static RUSH_SECS = 30;

  constructor() {
    super('BubbleScene');
  }

  init(data) {
    this.bubbles = [];
    this.left = 0;
    this.busy = false;
    this.popped = this.registry.get('bubblesPopped') || 0;
    this.styleIndex = data && data.styleIndex != null ? data.styleIndex : 0;
    this.chain = 0;
    this.lastPopAt = -9999;
    this.lastSound = 0;
    this.pressed = null;
    this.rush = null;
  }

  snapshot() {
    return { styleIndex: this.styleIndex };
  }

  styles() {
    return Theme.kids ? BubbleScene.KID_STYLES : BubbleScene.ADULT_STYLES;
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.land = land;
    this.W = W;
    this.H = H;
    this.bowl = this.registry.get('bowl');
    this.kids = Theme.kids;

    const bg = this.add.graphics();
    bg.fillGradientStyle(Palette.BG_TOP, Palette.BG_TOP, Palette.BG_BOTTOM, Palette.BG_BOTTOM, 1);
    bg.fillRect(0, 0, W, H);
    if (this.kids) {
      for (let i = 0; i < 40; i++) {
        bg.fillStyle(0xffffff, 0.08);
        bg.fillCircle(Math.random() * W, Math.random() * H, Phaser.Math.Between(10, 40));
      }
    }

    this.area = land ? { x: 150, y: 116, w: W - 300, h: 500 } : { x: 36, y: 168, w: W - 72, h: 860 };
    this.fx = new Burst(this, 'fxDot', {
      speed: { min: 60, max: this.kids ? 320 : 200 },
      gravityY: this.kids ? 500 : 120,
      lifespan: { min: 300, max: 700 },
      scale: { start: this.kids ? 0.8 : 0.5, end: 0 }
    });
    Burst.ensureTextures(this);

    const title = GameLibrary.get('bubbles').title;
    UIKit.text(this, W - 160, 62, title, { display: true, size: 38, ox: 1, align: 'right' });
    UIKit.leave(this);
    this.styleText = UIKit.text(this, land ? W / 2 : 40, land ? 88 : 132, '', { size: 21, weight: '600', ox: land ? 0.5 : 0, align: 'left', color: Palette.css(Palette.SAFFRON) });

    this.counter = UIKit.text(this, land ? W - 150 : W / 2, land ? 660 : 1068, '', { size: 24, weight: '600', ox: land ? 1 : 0.5, color: Palette.css(Palette.MOON) });
    this.updateCounter();
    const accent = Theme.kids ? Palette.SAFFRON : Palette.MIST;
    this.sheetBtn = UIKit.button(this, land ? 230 : W / 2 - 160, land ? 660 : 1180, Theme.pick('New sheet  ›', 'New sheet!'), () => this.nextSheet(), { w: 250, h: 70, accent });
    this.rushBtn = UIKit.button(this, land ? 500 : W / 2 + 160, land ? 660 : 1180, Theme.pick('Pop rush', 'Pop race!'), () => this.startRush(), {
      w: 250,
      h: 70,
      accent: Palette.LOTUS
    });

    this.newSheet(false);
    this.bindInput();

    this.rest = new EyeRest(this);
    UIKit.toast(this, GameLibrary.get('bubbles').hint, land ? 200 : 260, 3200);
    WakeKeeper.hold();
  }

  /* ---------- textures ---------- */

  static shapePath(g, shape, cx, cy, r, fill) {
    switch (shape) {
      case 'hex': {
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
          pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
        }
        if (fill) g.fillPoints(pts, true);
        else g.strokePoints(pts, true);
        break;
      }
      case 'square':
        if (fill) g.fillRoundedRect(cx - r * 0.86, cy - r * 0.86, r * 1.72, r * 1.72, r * 0.4);
        else g.strokeRoundedRect(cx - r * 0.86, cy - r * 0.86, r * 1.72, r * 1.72, r * 0.4);
        break;
      case 'heart': {
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const t = (i / 40) * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          pts.push(new Phaser.Math.Vector2(cx + (x / 17) * r, cy - (y / 17) * r + r * 0.08));
        }
        if (fill) g.fillPoints(pts, true);
        else g.strokePoints(pts, true);
        break;
      }
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          const rr = i % 2 ? r * 0.55 : r * 1.05;
          pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr + r * 0.06));
        }
        if (fill) g.fillPoints(pts, true);
        else g.strokePoints(pts, true);
        break;
      }
      case 'flower': {
        if (fill) {
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillCircle(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.48);
          }
          g.fillCircle(cx, cy, r * 0.55);
        } else {
          g.strokeCircle(cx, cy, r * 0.95);
        }
        break;
      }
      default:
        if (fill) g.fillCircle(cx, cy, r);
        else g.strokeCircle(cx, cy, r);
    }
  }

  textureFor(style, color, popped) {
    const u = AppRouter.k;
    const key = `bub_${style.id}_${color.toString(16)}_${popped ? 1 : 0}_${u}`;
    if (this.textures.exists(key)) return key;
    const S = 100;
    const c = S / 2;
    const r = 40;
    const g = this.make.graphics({ add: false });
    const shape = style.shape;

    if (this.kids) {
      if (!popped) {
        g.fillStyle(0x000000, 0.2);
        BubbleScene.shapePath(g, shape, c + 3, c + 5, r, true);
        g.fillStyle(color, 1);
        BubbleScene.shapePath(g, shape, c, c, r, true);
        g.fillStyle(0xffffff, 0.22);
        BubbleScene.shapePath(g, shape, c - 3, c - 4, r * 0.72, true);
        g.lineStyle(3, 0xffffff, 0.9);
        BubbleScene.shapePath(g, shape, c, c, r, false);
        g.fillStyle(0xffffff, 0.8);
        g.fillEllipse(c - r * 0.38, c - r * 0.42, r * 0.42, r * 0.24);
        if (style.face || shape === 'circle' || shape === 'flower') {
          g.fillStyle(0x1d2458, 1);
          g.fillCircle(c - 9, c - 2, 4);
          g.fillCircle(c + 9, c - 2, 4);
          g.lineStyle(3, 0x1d2458, 1);
          g.beginPath();
          g.arc(c, c + 5, 8, 0.3, Math.PI - 0.3);
          g.strokePath();
        }
      } else {
        g.fillStyle(color, 0.28);
        BubbleScene.shapePath(g, shape, c, c + 4, r * 0.86, true);
        g.lineStyle(2, 0xffffff, 0.35);
        BubbleScene.shapePath(g, shape, c, c + 4, r * 0.86, false);
        g.lineStyle(3, 0x1d2458, 0.55);
        g.beginPath();
        g.arc(c - 9, c + 2, 4, Math.PI + 0.3, -0.3);
        g.strokePath();
        g.beginPath();
        g.arc(c + 9, c + 2, 4, Math.PI + 0.3, -0.3);
        g.strokePath();
      }
    } else if (!popped) {
      g.fillStyle(0x000000, 0.28);
      BubbleScene.shapePath(g, shape, c + 3, c + 6, r, true);
      g.fillStyle(color, 0.16);
      BubbleScene.shapePath(g, shape, c, c, r, true);
      g.fillStyle(color, 0.1);
      BubbleScene.shapePath(g, shape, c - 2, c - 3, r * 0.78, true);
      g.fillStyle(0xffffff, 0.06);
      BubbleScene.shapePath(g, shape, c - 4, c - 6, r * 0.5, true);
      g.lineStyle(2, 0xffffff, 0.5);
      BubbleScene.shapePath(g, shape, c, c, r, false);
      g.lineStyle(2, color, 0.5);
      BubbleScene.shapePath(g, shape, c + 1, c + 2, r * 0.92, false);
      g.fillStyle(0xffffff, 0.7);
      g.fillEllipse(c - r * 0.34, c - r * 0.42, r * 0.5, r * 0.26);
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(c + r * 0.36, c + r * 0.3, 3);
    } else {
      g.fillStyle(color, 0.05);
      BubbleScene.shapePath(g, shape, c, c + 3, r * 0.9, true);
      g.lineStyle(1.5, 0xffffff, 0.16);
      BubbleScene.shapePath(g, shape, c, c + 3, r * 0.9, false);
      g.lineStyle(1.5, 0xffffff, 0.24);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        const r1 = 4 + Math.random() * 8;
        const r2 = 18 + Math.random() * 14;
        g.lineBetween(c + Math.cos(a) * r1, c + 3 + Math.sin(a) * r1, c + Math.cos(a + 0.25) * r2, c + 3 + Math.sin(a + 0.25) * r2);
      }
    }
    // Render at the screen's real resolution so bubbles stay as sharp as the text.
    const rt = this.make.renderTexture({ width: Math.ceil(S * u), height: Math.ceil(S * u) }, false);
    g.setScale(u);
    rt.draw(g, 0, 0);
    rt.saveTexture(key);
    g.destroy();
    return key;
  }

  /* ---------- sheets ---------- */

  newSheet(animate) {
    if (this.busy) return;
    const A = this.area;
    const style = this.styles()[this.styleIndex % this.styles().length];
    this.style = style;
    const kids = this.kids;
    const cell = style.small ? 82 : kids ? 112 : 98;
    const hexish = style.shape === 'hex' || style.shape === 'circle' || style.shape === 'flower';
    const rowH = hexish ? cell * 0.88 : cell;
    const cols = Math.max(3, Math.floor((A.w - cell / 2) / cell));
    const rows = Math.max(3, Math.floor((A.h - cell * 0.2) / rowH));
    const gridW = (cols - 1) * cell + (hexish ? cell / 2 : 0);
    const gridH = (rows - 1) * rowH;
    const ox = A.x + (A.w - gridW) / 2;
    const oy = A.y + (A.h - gridH) / 2;
    this.cell = cell;

    const sheet = this.add.container(0, 0);
    const plastic = this.add.graphics();
    plastic.fillStyle(kids ? 0xffffff : Palette.MIST, kids ? 0.25 : 0.1);
    plastic.fillRoundedRect(A.x - 6, A.y - 6, A.w + 12, A.h + 12, 26);
    plastic.lineStyle(kids ? 3 : 1.5, kids ? 0xffffff : Palette.MOON, kids ? 0.6 : 0.16);
    plastic.strokeRoundedRect(A.x - 6, A.y - 6, A.w + 12, A.h + 12, 26);
    sheet.add(plastic);

    // pick the special bubbles: a couple of big ones, one golden, one chain, one leaky
    const total = rows * cols;
    const order = Phaser.Utils.Array.Shuffle([...Array(total).keys()]);
    const special = new Map();
    const nBig = Math.min(2, Math.floor(total / 12));
    order.slice(0, nBig).forEach((i) => special.set(i, 'big'));
    if (total >= 12) {
      special.set(order[nBig], 'golden');
      special.set(order[nBig + 1], 'chain');
      special.set(order[nBig + 2], 'leaky');
    }

    const bubbles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = ox + c * cell + (hexish && r % 2 ? cell / 2 : 0);
        const y = oy + r * rowH;
        const kind = special.get(i) || 'plain';
        let color = kids ? Theme.CANDY[(r + c * 2) % Theme.CANDY.length] : style.tint;
        if (kind === 'golden') color = 0xffcf3f;
        const big = kind === 'big';
        const base = ((cell / 100) * (big ? 1.12 : Phaser.Math.FloatBetween(0.94, 1.0))) / AppRouter.k;
        const img = this.add.image(x, y, this.textureFor(style, color, false)).setScale(base);
        const b = { x, y, img, color, base, big, kind, popped: false, r: cell * 0.46, deco: [] };
        this.decorate(b, sheet);
        sheet.add(img);
        bubbles.push(b);
      }
    }

    const old = this.sheetC;
    this.sheetC = sheet;
    this.bubbles = bubbles;
    this.left = bubbles.length;
    this.styleText.setText(`${style.name}  ·  ${bubbles.length} bubbles`);

    if (!animate) return;
    this.busy = true;
    const H = this.H;
    sheet.y = H;
    if (old) this.tweens.add({ targets: old, y: -H, duration: 700, ease: 'Sine.InOut', onComplete: () => old.destroy() });
    this.tweens.add({ targets: sheet, y: 0, duration: 700, ease: 'Sine.InOut', onComplete: () => (this.busy = false) });
  }

  /** Marks that tell the special bubbles apart. */
  decorate(b, sheet) {
    const { x, y } = b;
    if (b.kind === 'big') {
      const ring = this.add.circle(x, y, this.cell * 0.5);
      ring.setStrokeStyle(2, this.kids ? 0xffffff : Palette.SAFFRON, 0.6);
      this.tweens.add({ targets: ring, scale: 1.12, alpha: 0.2, duration: 900, yoyo: true, repeat: -1 });
      sheet.add(ring);
      b.deco.push(ring);
    } else if (b.kind === 'golden') {
      const glint = this.add.star(x + this.cell * 0.22, y - this.cell * 0.24, 4, 3, 9, 0xffffff, 1);
      this.tweens.add({ targets: glint, scale: { from: 0.4, to: 1.2 }, alpha: { from: 0.2, to: 1 }, angle: 90, duration: 700, yoyo: true, repeat: -1 });
      sheet.add(glint);
      b.deco.push(glint);
    } else if (b.kind === 'chain') {
      const ring = this.add.graphics({ x, y });
      const r = this.cell * 0.52;
      Theme.CANDY.forEach((col, i) => {
        ring.lineStyle(4, col, 0.95);
        ring.beginPath();
        ring.arc(0, 0, r, (i / 6) * Math.PI * 2, ((i + 0.7) / 6) * Math.PI * 2);
        ring.strokePath();
      });
      this.tweens.add({ targets: ring, angle: 360, duration: 3000, repeat: -1 });
      sheet.add(ring);
      b.deco.push(ring);
    } else if (b.kind === 'leaky') {
      this.time.addEvent({
        delay: Phaser.Math.Between(1400, 2200),
        loop: true,
        callback: () => {
          if (b.popped || !b.img.active || b.pressing) return;
          this.tweens.add({ targets: b.img, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => b.img.active && b.img.setAngle(0) });
        }
      });
    }
  }

  nextSheet() {
    if (this.busy) return;
    this.bowl.unlock();
    this.styleIndex = (this.styleIndex + 1) % this.styles().length;
    this.newSheet(true);
  }

  /* ---------- pop rush ---------- */

  startRush() {
    if (this.rush || this.busy || this.rest.open) return;
    this.bowl.unlock();
    this.rush = { left: BubbleScene.RUSH_SECS, score: 0 };
    this.rushBtn.setVisible(false);
    this.sheetBtn.setVisible(false);
    this.rushText = UIKit.text(this, this.W / 2, this.land ? 62 : 132, '', { display: true, size: 40, color: Palette.css(Palette.SAFFRON) }).setDepth(40);
    this.styleText.setVisible(false);
    this.bowl.rise();
    this.nextSheet();
    this.updateCounter();
  }

  endRush() {
    const score = this.rush.score;
    this.rush = null;
    if (this.rushText) this.rushText.destroy();
    this.rushText = null;
    this.styleText.setVisible(true);
    const isBest = BestScores.submit('bubbleRush', score);
    this.bowl.fanfare();
    this.updateCounter();
    UIKit.resultCard(this, {
      eyebrow: Theme.pick('Pop rush', 'Pop race'),
      title: `${score} ${Theme.pick('pops', 'pops!')}`,
      lines: [isBest ? Theme.pick('A new best', 'Your best ever!') : `Your best is ${BestScores.get('bubbleRush')}`, Theme.pick('Golden bubbles are worth 10.', 'Gold bubbles give 10!')],
      primary: [Theme.pick('Rush again', 'Again!'), () => this.startRush()],
      secondary: [Theme.pick('Just pop', 'Just pop'), () => {}]
    });
    this.rushBtn.setVisible(true);
    this.sheetBtn.setVisible(true);
  }

  /* ---------- popping ---------- */

  bindInput() {
    const hit = (p) => {
      if (!this.sheetC) return null;
      const lx = p.lx;
      const ly = p.ly - this.sheetC.y;
      let best = null;
      let bd = Infinity;
      for (const b of this.bubbles) {
        if (b.popped) continue;
        const d = Phaser.Math.Distance.Between(lx, ly, b.x, b.y);
        if (d < b.r && d < bd) {
          bd = d;
          best = b;
        }
      }
      return best;
    };

    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open || this.busy) return;
      this.bowl.unlock();
      const b = hit(p);
      if (b) this.press(b, 85);
    });
    this.input.on('pointermove', (p) => {
      if (!p.isDown || this.rest.open || this.busy) return;
      const b = hit(p);
      if (b && b !== this.pressed) this.press(b, 0);
    });
  }

  press(b, delay) {
    if (b.popped || b.pressing) return;
    b.pressing = true;
    this.pressed = b;
    if (b.kind === 'leaky') {
      this.leakAway(b);
      return;
    }
    this.tweens.add({
      targets: b.img,
      scaleX: b.base * 1.12,
      scaleY: b.base * 0.84,
      duration: delay ? 70 : 30,
      ease: 'Quad.Out'
    });
    if (delay) this.bowl.squish();
    this.time.delayedCall(delay || 25, () => this.pop(b));
  }

  /** The leaky bubble lets go: it zips about the screen, whistling, and pops at the end. */
  leakAway(b) {
    const wy = b.y + this.sheetC.y;
    const fly = this.add.image(b.x, wy, b.img.texture.key).setScale(b.base).setDepth(35);
    this.bowl.leak(1.1);
    const pts = [];
    let x = b.x;
    let y = wy;
    for (let i = 0; i < 6; i++) {
      x = Phaser.Math.Clamp(x + Phaser.Math.Between(-260, 260), 60, this.W - 60);
      y = Phaser.Math.Clamp(y + Phaser.Math.Between(-260, 200), 160, this.H - 160);
      pts.push({ x, y });
    }
    const path = new Phaser.Curves.Spline([b.x, wy, ...pts.flatMap((p) => [p.x, p.y])]);
    const prog = { t: 0 };
    this.tweens.add({
      targets: prog,
      t: 1,
      duration: 1100,
      ease: 'Sine.In',
      onUpdate: () => {
        const p = path.getPoint(prog.t);
        const tan = path.getTangent(prog.t);
        fly.setPosition(p.x, p.y);
        fly.setRotation(Math.atan2(tan.y, tan.x) + Math.PI / 2);
        fly.setScale(b.base * (1 - prog.t * 0.55), b.base * (1 - prog.t * 0.7));
      },
      onComplete: () => {
        this.bowl.popKind('cork', 0.2, 9);
        this.fx.emit(this.kids ? Theme.CANDY[Phaser.Math.Between(0, 5)] : 0xffffff, fly.x, fly.y, 10);
        UIKit.floatText(this, fly.x, fly.y - 30, Theme.pick('Pffft!', 'Wheee!'), Palette.LOTUS, 30);
        fly.destroy();
      }
    });
    this.pop(b, true);
  }

  pop(b, quiet) {
    if (b.popped) return;
    b.popped = true;
    this.left -= 1;
    this.popped += 1;
    this.registry.set('bubblesPopped', this.popped);
    if (this.rush) this.rush.score += b.kind === 'golden' ? 10 : 1;

    const now = this.time.now;
    this.chain = now - this.lastPopAt < 420 ? this.chain + 1 : 0;
    this.lastPopAt = now;
    const wy = b.y + this.sheetC.y;
    if (!quiet && now - this.lastSound > 16) {
      this.lastSound = now;
      if (b.big) this.bowl.megaPop();
      else this.bowl.popKind(this.style.sound, 0.35 + Math.random() * 0.25, this.chain > 0 ? Math.min(this.chain, 14) : null);
    }
    try {
      if (navigator.vibrate) navigator.vibrate(b.big ? [12, 30, 18] : 8);
    } catch (e) {
      /* not available */
    }

    this.tweens.killTweensOf(b.img);
    b.img.setAngle(0);
    b.img.setTexture(this.textureFor(this.style, b.color, true));
    b.img.setScale(b.base * 1.18, b.base * 0.92);
    this.tweens.add({ targets: b.img, scaleX: b.base, scaleY: b.base, duration: 220, ease: 'Back.Out' });
    b.deco.forEach((d) => {
      this.tweens.killTweensOf(d);
      d.destroy();
    });
    b.deco = [];

    if (!quiet) this.popFx(b, wy);

    if (b.big) {
      this.cameras.main.shake(140, 0.005);
      if (this.kids) this.bowl.sparkle();
      UIKit.floatText(this, b.x, wy - 30, Theme.pick('BIG POP', 'MEGA POP!'), Palette.SAFFRON, 32);
    } else if (b.kind === 'golden') {
      this.coins(b.x, wy);
      this.bowl.coins();
      UIKit.floatText(this, b.x, wy - 34, this.rush ? '+10' : Theme.pick('Lucky!', 'Gold!'), Palette.SAFFRON, 34);
    } else if (b.kind === 'chain') {
      this.chainReaction(b);
    }
    if (this.chain > 0 && this.chain % 10 === 0) {
      UIKit.floatText(this, b.x, wy - 50, `${this.chain} in a row!`, Palette.LOTUS, 34);
      this.bowl.sparkle(0.8);
    }

    this.updateCounter();
    if (this.left === 0) {
      if (!this.rush) {
        this.bowl.fanfare();
        UIKit.floatText(this, this.W / 2, this.H / 2, Theme.pick('Sheet done', 'All popped!'), Palette.SAFFRON, 52);
      } else {
        this.bowl.sparkle();
      }
      this.time.delayedCall(this.rush ? 250 : 900, () => this.nextSheet());
    }
  }

  /** Every bubble near the chain bubble pops in a ripple, nearest first. */
  chainReaction(b) {
    const reach = this.cell * 2.3;
    const ring = this.add.circle(b.x, b.y + this.sheetC.y, 20).setStrokeStyle(5, Palette.LOTUS, 0.9);
    this.tweens.add({ targets: ring, radius: reach, alpha: 0, duration: 520, onComplete: () => ring.destroy() });
    this.bowl.rise();
    const near = this.bubbles
      .filter((o) => !o.popped && o !== b && Phaser.Math.Distance.Between(o.x, o.y, b.x, b.y) < reach)
      .sort((p, q) => Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) - Phaser.Math.Distance.Between(q.x, q.y, b.x, b.y));
    near.forEach((o, i) => {
      this.time.delayedCall(60 + i * 45, () => {
        if (o.popped) return;
        if (o.kind === 'leaky') this.press(o, 0);
        else this.pop(o);
      });
    });
    UIKit.floatText(this, b.x, b.y + this.sheetC.y - 40, Theme.pick('Chain!', 'Pop-a-lot!'), Palette.LOTUS, 34);
  }

  /** A different little burst for each sheet. */
  popFx(b, wy) {
    const x = b.x;
    const fx = this.style.fx;
    const ring = this.add.circle(x, wy, b.r * 0.7);
    ring.setStrokeStyle(this.kids ? 4 : 2, this.kids ? 0xffffff : b.color, 0.8);
    this.tweens.add({ targets: ring, scale: b.big ? 2.6 : 1.8, alpha: 0, duration: 380, ease: 'Quad.Out', onComplete: () => ring.destroy() });

    const fling = (obj, dist, dur, gravity = 0) => {
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: obj,
        x: obj.x + Math.cos(a) * dist,
        y: obj.y + Math.sin(a) * dist + gravity,
        angle: Phaser.Math.Between(-200, 200),
        alpha: 0,
        duration: dur,
        ease: 'Quad.Out',
        onComplete: () => obj.destroy()
      });
    };
    switch (fx) {
      case 'flaps':
        for (let i = 0; i < 4; i++) fling(this.add.rectangle(x, wy, 10, 5, 0xffffff, 0.55).setDepth(30), Phaser.Math.Between(30, 60), 450, 30);
        break;
      case 'drops':
        for (let i = 0; i < 5; i++) {
          const d = this.add.circle(x, wy, Phaser.Math.Between(3, 6), 0xe8ae4c, 0.95).setDepth(30);
          this.tweens.add({ targets: d, x: x + Phaser.Math.Between(-40, 40), y: wy + Phaser.Math.Between(40, 90), alpha: 0, duration: 650, ease: 'Quad.In', onComplete: () => d.destroy() });
        }
        break;
      case 'sparkle':
        for (let i = 0; i < 4; i++) fling(this.add.star(x, wy, 4, 2, 7, 0xffffff, 1).setDepth(30), Phaser.Math.Between(26, 54), 520);
        break;
      case 'puff':
        for (let i = 0; i < 4; i++) {
          const p = this.add.circle(x + Phaser.Math.Between(-12, 12), wy + Phaser.Math.Between(-12, 12), 9, 0xffffff, 0.35).setDepth(30);
          this.tweens.add({ targets: p, scale: 2.6, alpha: 0, y: p.y - 20, duration: 600, onComplete: () => p.destroy() });
        }
        break;
      case 'hearts':
      case 'stars': {
        const glyph = fx === 'hearts' ? '💖' : '⭐';
        for (let i = 0; i < 2; i++) {
          const t = this.add.text(x, wy, glyph, { fontSize: '26px' }).setOrigin(0.5).setDepth(30).setResolution(AppRouter.k);
          this.tweens.add({ targets: t, y: wy - Phaser.Math.Between(60, 110), x: x + Phaser.Math.Between(-40, 40), scale: 1.4, alpha: 0, duration: 900, ease: 'Sine.Out', onComplete: () => t.destroy() });
        }
        break;
      }
      case 'confetti':
        for (let i = 0; i < 7; i++) fling(this.add.rectangle(x, wy, 8, 5, Theme.CANDY[i % 6], 1).setDepth(30), Phaser.Math.Between(40, 90), 650, 60);
        break;
      case 'petals':
        for (let i = 0; i < 6; i++) fling(this.add.ellipse(x, wy, 12, 7, i % 2 ? 0xff6fa8 : 0xffffff, 1).setDepth(30), Phaser.Math.Between(30, 70), 750, 40);
        break;
      default:
        break;
    }
    this.fx.emit(this.kids ? Theme.CANDY[Phaser.Math.Between(0, 5)] : 0xffffff, x, wy, this.kids ? 8 : 5);
  }

  coins(x, y) {
    for (let i = 0; i < 8; i++) {
      const c = this.add.ellipse(x, y, 16, 16, 0xffcf3f, 1).setStrokeStyle(2, 0xb8860b, 1).setDepth(31);
      const vx = Phaser.Math.Between(-140, 140);
      this.tweens.add({ targets: c, x: x + vx, duration: 800, ease: 'Linear' });
      this.tweens.add({ targets: c, y: y - Phaser.Math.Between(80, 150), duration: 380, ease: 'Quad.Out', yoyo: true, onComplete: () => c.destroy() });
      this.tweens.add({ targets: c, scaleX: 0.2, duration: 120, yoyo: true, repeat: 3 });
    }
  }

  updateCounter() {
    if (this.rush) this.counter.setText(`${this.rush.score} ${Theme.pick('in this rush', 'this race!')}`);
    else this.counter.setText(`${this.popped.toLocaleString()} ${Theme.pick('popped', 'pops!')}`);
  }

  update(time, delta) {
    this.rest.tick(delta);
    if (this.rush && !this.rest.open) {
      this.rush.left -= delta / 1000;
      const s = Math.max(0, Math.ceil(this.rush.left));
      if (this.rushText) {
        this.rushText.setText(`${s}s`);
        if (s <= 5) this.rushText.setColor(Palette.css(Palette.LOTUS));
      }
      if (this.rush.left <= 0) this.endRush();
    }
  }
}
