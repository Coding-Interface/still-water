/**
 * NightSky — the shared backdrop, sized to the current canvas.
 *   Grown-ups: twilight sky, twinkling stars, the moon, dark hills, a still lake.
 *   Kids:      a bright day, a smiling sun, drifting clouds, green hills, sparkling water.
 * Also draws ripples on the water.
 */
class NightSky {
  /** opts.noSun hides the moon/sun; opts.sunX / opts.sunY move it. */
  constructor(scene, opts = {}) {
    this.scene = scene;
    const W = Layout.W(scene);
    const H = Layout.H(scene);
    this.W = W;
    this.H = H;
    this.land = W > H;
    this.horizon = Math.round(H * (this.land ? 0.66 : 0.64));
    this.calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.day = Theme.kids;

    const g = scene.add.graphics();
    g.fillGradientStyle(Palette.SKY_TOP, Palette.SKY_TOP, Palette.SKY_LOW, Palette.SKY_LOW, 1);
    g.fillRect(0, 0, W, this.horizon);
    g.fillGradientStyle(Palette.WATER_TOP, Palette.WATER_TOP, Palette.WATER_DEEP, Palette.WATER_DEEP, 1);
    g.fillRect(0, this.horizon, W, H - this.horizon);

    this.sunX = opts.sunX ?? (this.land ? W * 0.78 : W * 0.6);
    this.sunY = opts.sunY ?? (this.land ? H * 0.17 : H * 0.072);

    if (this.day) {
      if (!opts.noSun) this.addSun();
      this.addClouds();
    } else {
      this.addStars();
      if (!opts.noSun) this.addMoon();
    }
    this.addHills();
    this.addGlints();
    scene.add.rectangle(0, this.horizon, W, 2, this.day ? 0xffffff : Palette.MIST, this.day ? 0.35 : 0.16).setOrigin(0, 0.5);
  }

  addStars() {
    const scene = this.scene;
    const n = Math.round((this.W * this.horizon) / 9000);
    for (let i = 0; i < n; i++) {
      const x = Phaser.Math.Between(0, this.W);
      const y = Phaser.Math.Between(0, Math.floor(this.horizon * 0.8));
      const r = Phaser.Math.FloatBetween(0.8, 2.1);
      const a = Phaser.Math.FloatBetween(0.2, 0.75);
      const star = scene.add.circle(x, y, r, Palette.MOON, a);
      if (!this.calm) {
        scene.tweens.add({
          targets: star,
          alpha: a * 0.25,
          duration: Phaser.Math.Between(1800, 4800),
          delay: Phaser.Math.Between(0, 4000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
      }
    }
  }

  addMoon() {
    const scene = this.scene;
    const mx = this.sunX;
    const my = this.sunY;
    scene.add.circle(mx, my, 90, Palette.SUN, 0.03);
    scene.add.circle(mx, my, 60, Palette.SUN, 0.06);
    scene.add.circle(mx, my, 34, Palette.SUN, 0.95);
    this.addReflection(Palette.SUN, 0.28);
  }

  addSun() {
    const scene = this.scene;
    const sx = this.sunX;
    const sy = this.sunY;
    const rays = scene.add.graphics({ x: sx, y: sy });
    rays.fillStyle(Palette.SUN, 0.35);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillTriangle(Math.cos(a - 0.12) * 52, Math.sin(a - 0.12) * 52, Math.cos(a + 0.12) * 52, Math.sin(a + 0.12) * 52, Math.cos(a) * 84, Math.sin(a) * 84);
    }
    if (!this.calm) scene.tweens.add({ targets: rays, angle: 360, duration: 40000, repeat: -1 });
    scene.add.circle(sx, sy, 62, 0xffffff, 0.18);
    scene.add.circle(sx, sy, 44, Palette.SUN, 1);
    const face = scene.add.graphics({ x: sx, y: sy });
    face.fillStyle(0x7a4a12, 1);
    face.fillCircle(-14, -6, 4);
    face.fillCircle(14, -6, 4);
    face.lineStyle(4, 0x7a4a12, 1);
    face.beginPath();
    face.arc(0, 4, 14, 0.25, Math.PI - 0.25);
    face.strokePath();
    face.fillStyle(0xff8aa0, 0.6);
    face.fillCircle(-24, 8, 6);
    face.fillCircle(24, 8, 6);
    this.addReflection(Palette.SUN, 0.5);
  }

  addClouds() {
    const scene = this.scene;
    const n = this.land ? 5 : 4;
    for (let i = 0; i < n; i++) {
      const c = scene.add.container(Phaser.Math.Between(0, this.W), Phaser.Math.Between(this.horizon * 0.12, this.horizon * 0.6));
      const s = Phaser.Math.FloatBetween(0.6, 1.1);
      [[-40, 8, 70, 46], [0, -10, 90, 70], [44, 6, 76, 50], [0, 14, 150, 40]].forEach(([x, y, w, h]) => {
        c.add(scene.add.ellipse(x * s, y * s, w * s, h * s, 0xffffff, 0.92));
      });
      c.setAlpha(0.95);
      if (!this.calm) {
        const dur = Phaser.Math.Between(60000, 110000);
        scene.tweens.add({ targets: c, x: c.x + Phaser.Math.Between(120, 260), duration: dur, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    }
  }

  addReflection(color, alpha) {
    const scene = this.scene;
    for (let i = 0; i < 7; i++) {
      const line = scene.add.rectangle(this.sunX, this.horizon + 14 + i * 24, 76 - i * 8, 3, color, alpha - i * 0.03);
      if (!this.calm) {
        scene.tweens.add({
          targets: line,
          scaleX: 0.55,
          duration: Phaser.Math.Between(1600, 2600),
          delay: i * 180,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
      }
    }
  }

  addHills() {
    const g = this.scene.add.graphics();
    const h = this.horizon;
    if (this.day) {
      g.fillStyle(0x4aa85a, 1);
      const back = [new Phaser.Math.Vector2(0, h)];
      for (let x = 0; x <= this.W; x += 20) back.push(new Phaser.Math.Vector2(x, h - 60 - Math.sin(x / 160 + 0.8) * 30));
      back.push(new Phaser.Math.Vector2(this.W, h));
      g.fillPoints(back, true);
    }
    g.fillStyle(Palette.HILLS, 1);
    const pts = [new Phaser.Math.Vector2(0, h)];
    for (let x = 0; x <= this.W; x += 20) {
      const y = h - 26 - Math.sin(x / 110) * 16 - Math.sin(x / 37 + 1.3) * 6 - Math.max(0, Math.sin(x / 240 - 0.6)) * 34;
      pts.push(new Phaser.Math.Vector2(x, y));
    }
    pts.push(new Phaser.Math.Vector2(this.W, h));
    g.fillPoints(pts, true);
    if (this.day) {
      for (let i = 0; i < 10; i++) {
        const x = Phaser.Math.Between(20, this.W - 20);
        const y = h - Phaser.Math.Between(6, 26);
        g.fillStyle(Theme.CANDY[i % Theme.CANDY.length], 1);
        g.fillCircle(x, y, 4);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(x, y, 1.6);
      }
    }
  }

  addGlints() {
    if (!this.day || this.calm) return;
    const scene = this.scene;
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(20, this.W - 20);
      const y = Phaser.Math.Between(this.horizon + 20, this.H - 20);
      const s = scene.add.rectangle(x, y, Phaser.Math.Between(14, 30), 3, 0xffffff, 0);
      scene.tweens.add({ targets: s, alpha: 0.6, duration: 900, delay: Phaser.Math.Between(0, 5000), yoyo: true, repeat: -1, repeatDelay: Phaser.Math.Between(1000, 4000) });
    }
  }

  ripple(x, y, color = Palette.MOON, scale = 3.2) {
    const e = this.scene.add.ellipse(x, y, 90, 18);
    e.setStrokeStyle(2, color, 0.45);
    this.scene.tweens.add({
      targets: e,
      scaleX: scale,
      scaleY: scale,
      alpha: 0,
      duration: 2600,
      ease: 'Sine.Out',
      onComplete: () => e.destroy()
    });
  }
}
