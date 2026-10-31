/**
 * LanternScene — Firefly Lantern (Grown-ups) / Balloon Ride (Kids).
 * A one-touch flyer: hold to rise, let go to float down. Drift through gaps and
 * gather fireflies (or stars); each one plays the next note of a pentatonic tune.
 * Three soft bumps and the ride rests. Movement is slow and floaty by design.
 * The course scales to the screen, so it plays in both orientations.
 */
class LanternScene extends Phaser.Scene {
  static NOTES = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

  constructor() {
    super('LanternScene');
  }

  init() {
    this.state = 'ready';
    this.vy = 0;
    this.holding = false;
    this.lives = 3;
    this.score = 0;
    this.speed = 150;
    this.elapsed = 0;
    this.gapDist = 0;
    this.obstacles = [];
    this.flies = [];
    this.invuln = 0;
    this.noteIdx = 0;
    this.noteDir = 1;
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.X = land ? 300 : 200;
    this.top = 96;
    this.bottom = H - 70;
    this.ly = H * 0.47;
    this.sky = new NightSky(this);
    this.world = this.add.container(0, 0);

    this.makeFlyer();
    UIKit.leave(this);
    this.scoreText = UIKit.text(this, W - 160, 62, '0', { display: true, size: 44, ox: 1, align: 'right', color: Palette.css(Palette.SAFFRON) });
    UIKit.text(this, W - 160, 100, Theme.pick('fireflies', 'stars'), { size: 18, ox: 1, align: 'right', color: Palette.css(Palette.MIST) });
    this.lifeG = this.add.graphics().setDepth(30);
    this.drawLives();

    this.readyText = UIKit.text(this, W / 2, H * (land ? 0.3 : 0.33), Theme.pick('Hold to rise\nLet go to float down', 'Hold to float up\nLet go to drift down'), {
      display: true,
      size: 40,
      lineSpacing: 12
    });
    this.readySub = UIKit.text(this, W / 2, H * (land ? 0.44 : 0.41), 'Tap and hold anywhere to begin', { size: 22, color: Palette.css(Palette.MIST) });
    this.tweens.add({ targets: this.readySub, alpha: 0.4, duration: 1200, yoyo: true, repeat: -1 });

    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open) return;
      this.press();
    });
    const up = () => (this.holding = false);
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.press());
      this.input.keyboard.on('keyup-SPACE', up);
    }

    this.rest = new EyeRest(this);
    WakeKeeper.hold();
  }

  press() {
    if (this.state === 'over') return;
    this.bowl.unlock();
    this.holding = true;
    if (this.state === 'ready') {
      this.state = 'play';
      this.tweens.killTweensOf(this.readySub);
      this.tweens.add({ targets: [this.readyText, this.readySub], alpha: 0, duration: 400 });
      this.bowl.strike(196, 0.12, 5);
    }
  }

  makeFlyer() {
    const c = (this.lantern = this.add.container(this.X, this.ly).setDepth(20));
    const g = this.add.graphics();
    if (this.kids) {
      this.glow = this.add.circle(0, -10, 70, 0xffffff, 0.12);
      this.glow2 = this.add.circle(0, -10, 40, 0xffffff, 0.12);
      const stripes = [0xff6fa8, 0xffc533, 0x4fb6ff, 0xff6fa8];
      stripes.forEach((col, i) => {
        g.fillStyle(col, 1);
        g.slice(0, -16, 38, Math.PI + (i / 4) * Math.PI, Math.PI + ((i + 1) / 4) * Math.PI, false);
        g.fillPath();
      });
      g.fillStyle(0xff6fa8, 1);
      g.fillTriangle(-38, -16, 38, -16, 0, 20);
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(-16, -34, 14, 22);
      g.lineStyle(2, 0x8a5a3b, 1);
      g.lineBetween(-10, 16, -10, 32);
      g.lineBetween(10, 16, 10, 32);
      g.fillStyle(0xb07a4a, 1);
      g.fillRoundedRect(-14, 30, 28, 18, 4);
      g.lineStyle(2, 0x7a4f2c, 1);
      g.strokeRoundedRect(-14, 30, 28, 18, 4);
    } else {
      this.glow = this.add.circle(0, 0, 80, Palette.SAFFRON, 0.16);
      this.glow2 = this.add.circle(0, 0, 46, Palette.SAFFRON, 0.18);
      g.lineStyle(2, 0x3a2a1e, 1);
      g.lineBetween(0, -52, 0, -38);
      g.fillStyle(0x3a2a1e, 1);
      g.fillRoundedRect(-15, -40, 30, 9, 3);
      g.fillStyle(0xe9a94b, 1);
      g.fillRoundedRect(-26, -32, 52, 64, 20);
      g.fillStyle(0xfff1c2, 0.6);
      g.fillEllipse(0, 4, 24, 36);
      g.lineStyle(1.5, 0x9a5a22, 0.55);
      [-16, 0, 16].forEach((y) => g.strokeEllipse(0, y, 50, 8));
      g.fillStyle(0x3a2a1e, 1);
      g.fillRoundedRect(-12, 30, 24, 7, 3);
      g.fillStyle(0xd4432b, 1);
      g.fillRect(-1.5, 37, 3, 14);
    }
    c.add([this.glow, this.glow2, g]);
    this.tweens.add({ targets: [this.glow, this.glow2], scale: 1.12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  drawLives() {
    const g = this.lifeG;
    g.clear();
    for (let i = 0; i < 3; i++) {
      const x = 52 + i * 34;
      const y = 134;
      const on = i < this.lives;
      g.fillStyle(on ? (this.kids ? 0xff6fa8 : Palette.SAFFRON) : Palette.MIST, on ? 1 : 0.25);
      g.fillCircle(x, y + 4, 9);
      g.fillTriangle(x - 8, y + 2, x + 8, y + 2, x, y - 16);
    }
  }

  spawnPair() {
    const { W, H, land } = Layout.info(this);
    const x = W + 80;
    const span = this.bottom - this.top;
    const gap = Math.max(span * 0.36, span * 0.5 - this.elapsed * 1.2);
    const center = Phaser.Math.Between(Math.round(this.top + gap / 2 + 30), Math.round(this.bottom - gap / 2 - 30));
    const top = center - gap / 2;
    const bottom = center + gap / 2;

    const g = this.add.graphics({ x, y: 0 });
    if (this.kids) {
      // a stack of puffy clouds hanging from above
      for (let y = top - 30; y > -60; y -= 52) {
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(-18, y, 30);
        g.fillCircle(18, y + 6, 28);
        g.fillCircle(0, y - 14, 30);
      }
      // a tree growing from below
      g.fillStyle(0x8a5a3b, 1);
      g.fillRect(-10, bottom + 40, 20, H - bottom);
      g.fillStyle(0x3faa5a, 1);
      g.fillCircle(0, bottom + 34, 40);
      g.fillCircle(-26, bottom + 60, 30);
      g.fillCircle(26, bottom + 60, 30);
      g.fillStyle(0xff4f6a, 1);
      g.fillCircle(-14, bottom + 26, 6);
      g.fillCircle(18, bottom + 50, 6);
    } else {
      for (let k = -2; k <= 2; k++) {
        const endY = top - Math.abs(k) * 18;
        g.lineStyle(4, 0x1f3a2c, 1);
        g.lineBetween(k * 6, 0, k * 13, endY);
        g.fillStyle(0x2f5a40, 1);
        for (let y = 30; y < endY; y += 26) g.fillEllipse(k * 6 + (k * 7 * y) / endY + (y % 52 ? 5 : -5), y, 8, 16);
      }
      g.fillStyle(Palette.LOTUS, 0.9);
      g.fillCircle(0, top - 6, 6);
      for (let k = -2; k <= 2; k++) {
        const stemTop = bottom + Math.abs(k) * 22 + Phaser.Math.Between(0, 14);
        g.lineStyle(4, 0x24402e, 1);
        g.lineBetween(k * 12, H + 10, k * 10, stemTop);
        g.fillStyle(0x6a4428, 1);
        g.fillRoundedRect(k * 10 - 4, stemTop - 4, 8, 28, 4);
      }
    }
    this.world.add(g);
    this.obstacles.push({ g, x, top, bottom, w: this.kids ? 70 : 56 });

    this.spawnFly(x, center + Phaser.Math.Between(-gap * 0.2, gap * 0.2));
    if (Math.random() < 0.6) this.spawnFly(x + (land ? 300 : 240), Phaser.Math.Between(this.top + 60, this.bottom - 60));
  }

  spawnFly(x, y) {
    const c = this.add.container(x, y);
    if (this.kids) {
      const g = this.add.graphics();
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? 7 : 16;
        pts.push(new Phaser.Math.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
      }
      g.fillStyle(0xffd23f, 1);
      g.fillPoints(pts, true);
      g.lineStyle(2, 0xffffff, 1);
      g.strokePoints(pts, true);
      c.add(g);
      this.tweens.add({ targets: g, angle: 360, duration: 3000, repeat: -1 });
    } else {
      const halo = this.add.circle(0, 0, 20, 0xf6e27a, 0.22);
      const dot = this.add.circle(0, 0, 5.5, 0xfff3a8, 1);
      c.add([halo, dot]);
      this.tweens.add({ targets: halo, scale: 1.5, alpha: 0.08, duration: Phaser.Math.Between(500, 900), yoyo: true, repeat: -1 });
    }
    this.world.add(c);
    this.flies.push({ c, x, y, baseY: y, t: Math.random() * 6, taken: false });
  }

  hitObstacle(o) {
    const r = 22;
    const dx = Math.abs(this.X - o.x);
    if (dx > o.w / 2 + r) return false;
    return this.ly - r < o.top || this.ly + r > o.bottom;
  }

  bump() {
    this.lives -= 1;
    this.invuln = 1.8;
    this.drawLives();
    if (this.kids) this.bowl.toy(0.8);
    else this.bowl.thunk(0.6);
    this.cameras.main.shake(160, 0.005);
    this.tweens.add({ targets: this.lantern, alpha: 0.35, duration: 120, yoyo: true, repeat: 5, onComplete: () => this.lantern.setAlpha(1) });
    if (this.lives <= 0) this.end();
  }

  collect(f) {
    f.taken = true;
    this.score += 1;
    this.scoreText.setText(String(this.score));
    this.bowl.chime(LanternScene.NOTES[this.noteIdx], 0.09);
    this.noteIdx += this.noteDir;
    if (this.noteIdx >= LanternScene.NOTES.length - 1 || this.noteIdx <= 0) this.noteDir *= -1;
    this.tweens.add({ targets: f.c, scale: 2.6, alpha: 0, duration: 400, onComplete: () => f.c.destroy() });
    this.tweens.add({ targets: this.glow, alpha: 0.32, duration: 150, yoyo: true });
  }

  end() {
    this.state = 'over';
    this.holding = false;
    const best = ProgressStore.setBest('lantern', this.score);
    const { W, H } = Layout.info(this);
    this.tweens.add({ targets: this.lantern, y: this.bottom - 40, angle: 0, duration: 2200, ease: 'Sine.InOut' });
    this.bowl.strike(147, 0.22, 8);

    this.time.delayedCall(900, () => {
      UIKit.resultCard(this, {
        eyebrow: GameLibrary.get('lantern').title,
        title: Theme.pick('The lantern rests', 'What a ride!'),
        lines: [
          `${this.score} ${Theme.pick(this.score === 1 ? 'firefly' : 'fireflies', this.score === 1 ? 'star' : 'stars')} gathered`,
          this.score >= best && this.score > 0 ? Theme.pick('Your best night yet', 'Your best ride yet!') : `Best: ${best}`
        ],
        primary: [Theme.pick('Fly again', 'Ride again'), () => this.scene.restart()],
        secondary: ['All games', () => this.scene.start('MenuScene')]
      });
    });
  }

  update(time, delta) {
    this.rest.tick(delta);
    const dt = Math.min(delta, 50) / 1000;

    if (this.state === 'ready') {
      this.lantern.y = this.ly + Math.sin(time / 700) * 14;
      return;
    }
    if (this.state !== 'play' || this.rest.open) return;

    this.elapsed += dt;
    this.speed = Math.min(215, 150 + this.elapsed * 1.4);
    this.vy += (this.holding ? -880 : 520) * dt;
    this.vy = Phaser.Math.Clamp(this.vy, -300, 320);
    this.ly += this.vy * dt;
    if (this.ly < this.top) {
      this.ly = this.top;
      this.vy = 0;
    }
    if (this.ly > this.bottom) {
      this.ly = this.bottom;
      this.vy = 0;
    }
    this.lantern.y = this.ly;
    this.lantern.angle = this.vy * 0.025;

    this.gapDist += this.speed * dt;
    if (this.gapDist >= 470) {
      this.gapDist = 0;
      this.spawnPair();
    }

    const move = this.speed * dt;
    this.obstacles.forEach((o) => {
      o.x -= move;
      o.g.x = o.x;
    });
    this.flies.forEach((f) => {
      f.x -= move;
      f.t += dt;
      f.y = f.baseY + Math.sin(f.t * 2) * 12;
      if (!f.taken) f.c.setPosition(f.x, f.y);
    });

    this.invuln = Math.max(0, this.invuln - dt);
    if (this.invuln === 0 && this.obstacles.some((o) => this.hitObstacle(o))) this.bump();
    if (this.state !== 'play') return;

    this.flies.forEach((f) => {
      if (!f.taken && Phaser.Math.Distance.Between(this.X, this.ly, f.x, f.y) < 44) this.collect(f);
    });

    this.obstacles = this.obstacles.filter((o) => {
      if (o.x < -100) {
        o.g.destroy();
        return false;
      }
      return true;
    });
    this.flies = this.flies.filter((f) => {
      if (f.x < -60) {
        if (!f.taken) f.c.destroy();
        return false;
      }
      return !f.taken || f.c.active;
    });
  }
}
