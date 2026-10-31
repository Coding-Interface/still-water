/**
 * KoiScene — Koi Pond (Grown-ups) / Fish Friends (Kids).
 * A pond seen from above. Fish drift under lily pads; tap the water to scatter
 * food and they glide over to eat it. Kids' fish are brighter, have big cartoon
 * eyes, wiggle happily after a snack and blow bubbles. The pond fills any shape.
 */
class KoiScene extends Phaser.Scene {
  constructor() {
    super('KoiScene');
  }

  init() {
    this.pellets = [];
    this.koi = [];
    this.nextRipple = 4;
    this.fed = 0;
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    const bounds = { x: 0, y: 0, w: W, h: H };

    const bg = this.add.graphics();
    bg.fillGradientStyle(Palette.POND, Palette.POND_DEEP, Palette.POND_DEEP, Palette.POND, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      bg.fillStyle(Math.random() < 0.5 ? 0x000000 : this.kids ? 0xffffff : Palette.MIST, Math.random() * 0.08 + 0.03);
      bg.fillEllipse(Math.random() * W, Math.random() * H, Phaser.Math.Between(14, 50), Phaser.Math.Between(10, 34));
    }

    for (let i = 0; i < 7; i++) {
      const light = this.add.ellipse(Math.random() * W, Math.random() * H, Phaser.Math.Between(220, 420), Phaser.Math.Between(90, 180), 0xffffff, this.kids ? 0.07 : 0.03);
      this.tweens.add({
        targets: light,
        x: light.x + Phaser.Math.Between(-140, 140),
        y: light.y + Phaser.Math.Between(-100, 100),
        duration: Phaser.Math.Between(9000, 16000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
    }

    this.foodLayer = this.add.container(0, 0);
    this.koiG = this.add.graphics();
    const names = ['kohaku', 'ogon', 'showa', 'tancho', 'chagoi', 'sanke', 'kohaku'];
    const count = land ? 8 : 7;
    for (let i = 0; i < count; i++) {
      this.koi.push(new Koi(bounds, names[i % names.length], Phaser.Math.Between(150, 200) - i * 4, this.kids));
    }

    this.addPads(W, H, land);

    UIKit.leave(this);
    UIKit.text(this, W - 160, 62, GameLibrary.get('koi').title, { display: true, size: 38, ox: 1, align: 'right' });
    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open) return;
      this.bowl.unlock();
      this.feed(p.lx, p.ly);
    });

    this.rest = new EyeRest(this);
    UIKit.toast(this, GameLibrary.get('koi').hint, 160);
    WakeKeeper.hold();
  }

  addPads(W, H, land) {
    const portrait = [
      [0.15, 0.23, 70],
      [0.83, 0.16, 58],
      [0.89, 0.59, 82],
      [0.19, 0.79, 64],
      [0.65, 0.9, 50],
      [0.42, 0.44, 40]
    ];
    const landscape = [
      [0.1, 0.3, 70],
      [0.36, 0.2, 58],
      [0.84, 0.32, 82],
      [0.2, 0.8, 64],
      [0.62, 0.84, 50],
      [0.52, 0.5, 40],
      [0.93, 0.82, 56]
    ];
    (land ? landscape : portrait).forEach(([fx, fy, r], i) => {
      const x = fx * W;
      const y = fy * H;
      const g = this.add.graphics({ x, y });
      const notch = Math.random() * Math.PI * 2;
      g.fillStyle(0x000000, 0.18);
      g.slice(8, 12, r, notch + 0.22, notch - 0.22 + Math.PI * 2, false);
      g.fillPath();
      g.fillStyle(i % 2 ? Palette.LEAF : this.kids ? 0x5fd38a : 0x4d8a63, 0.97);
      g.slice(0, 0, r, notch + 0.22, notch - 0.22 + Math.PI * 2, false);
      g.fillPath();
      g.lineStyle(1.5, Palette.LEAF_LIGHT, 0.35);
      for (let k = 1; k < 8; k++) {
        const a = notch + (k / 8) * Math.PI * 2;
        g.lineBetween(0, 0, Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      }
      g.lineStyle(2, Palette.LEAF_LIGHT, 0.25);
      g.strokeCircle(0, 0, r - 2);
      this.tweens.add({
        targets: g,
        angle: Phaser.Math.Between(-8, 8),
        x: x + Phaser.Math.Between(-10, 10),
        duration: Phaser.Math.Between(7000, 12000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      if (i === 2) {
        const lotus = new Lotus(this, x - 6, y + 18, 34);
        lotus.setBloom(1);
        this.tweens.add({ targets: lotus, x: lotus.x + 6, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
      if (this.kids && i === 0) this.addFrog(x, y);
    });
  }

  /** A small frog that sits on a pad and croaks when tapped. */
  addFrog(x, y) {
    const c = this.add.container(x + 4, y - 6);
    const g = this.add.graphics();
    g.fillStyle(0x3fbf5a, 1);
    g.fillEllipse(0, 6, 46, 30);
    g.fillCircle(-12, -8, 10);
    g.fillCircle(12, -8, 10);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-12, -9, 6);
    g.fillCircle(12, -9, 6);
    g.fillStyle(0x1d2458, 1);
    g.fillCircle(-12, -9, 3);
    g.fillCircle(12, -9, 3);
    g.lineStyle(2.5, 0x1d2458, 1);
    g.beginPath();
    g.arc(0, 4, 9, 0.3, Math.PI - 0.3);
    g.strokePath();
    c.add(g);
    c.setSize(60, 50);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      this.bowl.unlock();
      this.bowl.croak();
      this.tweens.add({ targets: c, y: c.y - 30, duration: 220, yoyo: true, ease: 'Quad.Out' });
    });
  }

  ripple(x, y, scale = 3, alpha = 0.4) {
    const c = this.add.circle(x, y, 14);
    c.setStrokeStyle(2, 0xffffff, alpha);
    this.tweens.add({
      targets: c,
      scale,
      alpha: 0,
      duration: 1800,
      ease: 'Sine.Out',
      onComplete: () => c.destroy()
    });
  }

  bubbles(x, y) {
    for (let i = 0; i < 3; i++) {
      const b = this.add.circle(x + Phaser.Math.Between(-8, 8), y, Phaser.Math.Between(3, 6));
      b.setStrokeStyle(2, 0xffffff, 0.8);
      this.tweens.add({ targets: b, y: y - 50 - i * 14, alpha: 0, delay: i * 120, duration: 900, onComplete: () => b.destroy() });
    }
  }

  feed(x, y) {
    this.ripple(x, y, 3.5);
    this.time.delayedCall(220, () => this.ripple(x, y, 2, 0.25));
    this.bowl.plip();
    const n = Phaser.Math.Between(3, 5);
    for (let i = 0; i < n; i++) {
      const px = x + Phaser.Math.Between(-26, 26);
      const py = y + Phaser.Math.Between(-26, 26);
      const color = this.kids ? Theme.CANDY[Phaser.Math.Between(0, 5)] : Palette.SAFFRON;
      const dot = this.add.circle(px, py, this.kids ? 6 : 4.5, color, 0.95);
      this.foodLayer.add(dot);
      this.pellets.push({ x: px, y: py, dot, age: 0, eaten: false });
    }
  }

  update(time, delta) {
    const dt = Math.min(delta, 60) / 1000;
    this.rest.tick(delta);

    this.koi.forEach((k) => {
      const eaten = k.update(dt, this.pellets);
      if (eaten) {
        eaten.dot.destroy();
        this.ripple(eaten.x, eaten.y, 1.8, 0.3);
        this.bowl.plip(0.35);
        this.fed += 1;
        if (this.kids) {
          this.bubbles(eaten.x, eaten.y);
          if (this.fed % 12 === 0) {
            UIKit.floatText(this, eaten.x, eaten.y - 30, 'Yum!', Palette.SAFFRON, 34);
            this.bowl.sparkle(0.6);
          }
        }
      }
    });

    this.pellets.forEach((p) => {
      p.age += dt;
      if (!p.eaten && p.age > 16) {
        p.eaten = true;
        this.tweens.add({ targets: p.dot, alpha: 0, duration: 1200, onComplete: () => p.dot.destroy() });
      }
    });
    this.pellets = this.pellets.filter((p) => !p.eaten);

    this.nextRipple -= dt;
    if (this.nextRipple <= 0) {
      const k = Phaser.Utils.Array.GetRandom(this.koi);
      if (this.kids) this.bubbles(k.x, k.y);
      else this.ripple(k.x, k.y, 2.5, 0.22);
      this.nextRipple = Phaser.Math.FloatBetween(4, 9);
    }

    this.koiG.clear();
    this.koi.forEach((k) => k.draw(this.koiG));
  }
}
