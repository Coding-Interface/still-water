/**
 * BreakerScene — Glass Breaker (Grown-ups) / Candy Crunch (Kids).
 * A Breakout game where every pane shatters (or every candy crunches).
 * Some blocks are reinforced and crack before they break; some drop a golden
 * orb that splits your ball into three. Play happens in a 720-wide arena,
 * centred in landscape, so every level plays the same in both orientations.
 */
class BreakerScene extends Phaser.Scene {
  static COLORS = [0xe8a5b5, 0xe8ae4c, 0x6fae8c, 0x8fc3d6, 0x9b8fd6, 0xe8743b, 0xd8e6ea];

  static PATTERNS = [
    ['11111111', '11111111', '11111111', '11111111', '11111111'],
    ['00011000', '00111100', '01111110', '11122111', '01111110', '00111100', '00011000'],
    ['12121212', '21212121', '12121212', '21212121', '11111111'],
    ['11000011', '11100111', '22222222', '11111111', '10111101', '10011001'],
    ['22222222', '10000001', '10222201', '10200201', '10222201', '10000001', '11111111']
  ];

  constructor() {
    super({ key: 'BreakerScene', physics: { default: 'arcade', arcade: { debug: false } } });
  }

  init(data) {
    this.level = (data && data.level) || 1;
    this.score = (data && data.score) || 0;
    this.lives = data && data.lives != null ? data.lives : 3;
    this.held = null;
    this.over = false;
    this.lastHit = 0;
    this.streak = 0;
  }

  snapshot() {
    return { level: this.level, score: this.score, lives: Math.max(1, this.lives) };
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.F = land ? { x: (W - 720) / 2, w: 720, top: 112, paddleY: H - 62, rowsY: 160 } : { x: 0, w: 720, top: 122, paddleY: 1150, rowsY: 210 };
    this.speedK = land ? 0.85 : 1;
    this.targetX = this.F.x + this.F.w / 2;

    const bg = this.add.graphics();
    bg.fillGradientStyle(Palette.BG_TOP, Palette.BG_TOP, Palette.BG_BOTTOM, Palette.BG_BOTTOM, 1);
    bg.fillRect(0, 0, W, H);
    if (land) {
      bg.fillStyle(0x000000, this.kids ? 0.12 : 0.3);
      bg.fillRect(0, 0, this.F.x, H);
      bg.fillRect(this.F.x + this.F.w, 0, W - this.F.x - this.F.w, H);
      bg.lineStyle(this.kids ? 4 : 2, this.kids ? 0xffffff : Palette.MIST, this.kids ? 0.7 : 0.25);
      bg.lineBetween(this.F.x, this.F.top, this.F.x, H);
      bg.lineBetween(this.F.x + this.F.w, this.F.top, this.F.x + this.F.w, H);
    }
    bg.lineStyle(2, this.kids ? 0xffffff : Palette.MIST, this.kids ? 0.6 : 0.2);
    bg.lineBetween(this.F.x, this.F.top - 2, this.F.x + this.F.w, this.F.top - 2);

    this.makeTextures();
    this.fx = this.kids ? new Burst(this, 'fxDot', { speed: { min: 100, max: 420 }, scale: { start: 0.8, end: 0.2 } }, 25) : new Burst(this, 'fxShard', { speed: { min: 100, max: 420 } }, 25);
    this.trailG = this.add.graphics();

    this.physics.world.setBounds(this.F.x, this.F.top, this.F.w, H);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.bricks = this.physics.add.staticGroup();
    this.buildPanes();

    this.paddle = this.physics.add.image(this.targetX, this.F.paddleY, this.tex('brkPaddle')).setImmovable(true);
    this.paddle.body.setAllowGravity(false);
    this.balls = this.physics.add.group();
    this.orbs = this.physics.add.group();
    this.holdBall();

    this.physics.add.collider(this.balls, this.bricks, (a, b) => this.hitPane(a, b));
    this.physics.add.collider(this.balls, this.paddle, (a, b) => this.hitPaddle(a, b));
    this.physics.add.overlap(this.orbs, this.paddle, (a, b) => this.catchOrb(a, b));

    UIKit.leave(this);
    this.levelText = UIKit.text(this, W - 160, 44, `Level ${this.level}`, { display: true, size: 32, ox: 1, align: 'right' });
    this.scoreText = UIKit.text(this, W - 160, 86, '', { size: 22, weight: '500', ox: 1, align: 'right', color: Palette.css(Palette.MIST) });
    this.updateHud();

    this.input.on('pointermove', (p) => (this.targetX = p.lx));
    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open) return;
      this.bowl.unlock();
      this.targetX = p.lx;
      this.launch();
    });
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.createCursorKeys();
      this.input.keyboard.on('keydown-SPACE', () => this.launch());
    }

    this.rest = new EyeRest(this);
    if (this.level === 1) UIKit.toast(this, GameLibrary.get('breaker').hint, this.F.paddleY - 120, 3000);
    WakeKeeper.hold();
  }

  tex(key) {
    return this.kids ? key + 'K' : key;
  }

  makeTextures() {
    const kids = this.kids;
    if (this.textures.exists(this.tex('brkPane'))) return;
    const g = this.make.graphics({ add: false });
    const w = 78;
    const h = 34;
    const pane = (key, reinforced, cracked) => {
      g.clear();
      if (kids) {
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(0, 0, w, h, 14);
        g.fillStyle(0x000000, 0.12);
        for (let x = -10; x < w; x += 16) g.fillTriangle(x, h, x + 8, h, x + 20, 0);
        g.fillStyle(0xffffff, 0.55);
        g.fillRoundedRect(6, 4, w - 12, 8, 4);
        g.lineStyle(3, 0xffffff, 1);
        g.strokeRoundedRect(1.5, 1.5, w - 3, h - 3, 13);
        if (reinforced) {
          g.fillStyle(0x000000, 0.18);
          g.fillCircle(w / 2, h / 2, 7);
        }
        if (cracked) {
          g.lineStyle(3, 0x1d2458, 0.6);
          g.lineBetween(w * 0.3, 4, w * 0.45, h - 4);
          g.lineBetween(w * 0.55, 4, w * 0.7, h - 4);
        }
      } else {
        g.fillStyle(0xffffff, 0.32);
        g.fillRoundedRect(0, 0, w, h, 5);
        g.fillStyle(0xffffff, 0.18);
        g.fillRoundedRect(4, 4, w - 8, h - 8, 3);
        g.lineStyle(2, 0xffffff, 0.85);
        g.strokeRoundedRect(1, 1, w - 2, h - 2, 5);
        g.lineStyle(3, 0xffffff, 0.6);
        g.lineBetween(10, h - 8, 26, 8);
        g.lineStyle(2, 0xffffff, 0.45);
        g.lineBetween(20, h - 8, 34, 8);
        if (reinforced) {
          g.lineStyle(2, 0xffffff, 0.7);
          g.strokeRoundedRect(6, 6, w - 12, h - 12, 3);
        }
        if (cracked) {
          g.lineStyle(2, 0x0c1620, 0.7);
          g.beginPath();
          g.moveTo(w * 0.55, 2);
          g.lineTo(w * 0.48, h * 0.45);
          g.lineTo(w * 0.62, h * 0.6);
          g.lineTo(w * 0.52, h - 2);
          g.strokePath();
          g.lineBetween(w * 0.48, h * 0.45, w * 0.25, h * 0.3);
          g.lineBetween(w * 0.62, h * 0.6, w * 0.85, h * 0.75);
        }
      }
      g.generateTexture(this.tex(key), w, h);
    };
    pane('brkPane', false, false);
    pane('brkPane2', true, false);
    pane('brkCrack', true, true);

    g.clear();
    g.fillStyle(kids ? 0xff6fa8 : 0xe8a5b5, 1);
    g.fillRoundedRect(0, 0, 150, 22, 11);
    g.fillStyle(0xffffff, kids ? 0.5 : 0.3);
    g.fillRoundedRect(8, 3, 134, 6, 3);
    if (kids) {
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRoundedRect(1.5, 1.5, 147, 19, 10);
    }
    g.generateTexture(this.tex('brkPaddle'), 150, 22);

    g.clear();
    g.fillStyle(kids ? 0xffffff : 0xe9e4d6, 0.25);
    g.fillCircle(14, 14, 14);
    g.fillStyle(kids ? 0xffc533 : 0xffffff, 1);
    g.fillCircle(14, 14, 10);
    if (kids) {
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(11, 11, 3);
    }
    g.generateTexture(this.tex('brkBall'), 28, 28);

    g.clear();
    g.fillStyle(0xe8ae4c, 0.3);
    g.fillCircle(16, 16, 16);
    g.fillStyle(kids ? 0xa77bff : 0xe8ae4c, 1);
    g.fillCircle(16, 16, 11);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(12, 12, 4);
    g.generateTexture(this.tex('brkOrb'), 32, 32);
    g.destroy();
  }

  pattern() {
    const P = BreakerScene.PATTERNS;
    if (this.level <= P.length) return P[this.level - 1];
    const rows = [];
    const strong = Math.min(0.6, 0.15 + (this.level - P.length) * 0.08);
    for (let r = 0; r < 7; r++) {
      let row = '';
      for (let c = 0; c < 8; c++) row += Math.random() < 0.18 ? '0' : Math.random() < strong ? '2' : '1';
      rows.push(row);
    }
    return rows;
  }

  buildPanes() {
    const rows = this.pattern();
    const colors = this.kids ? Theme.CANDY : BreakerScene.COLORS;
    rows.forEach((row, r) => {
      const color = colors[(r + this.level) % colors.length];
      [...row].forEach((ch, c) => {
        if (ch === '0') return;
        const pane = this.bricks.create(this.F.x + 66 + c * 84, this.F.rowsY + r * 42, this.tex(ch === '2' ? 'brkPane2' : 'brkPane'));
        pane.setTint(color);
        pane.hits = ch === '2' ? 2 : 1;
        pane.color = color;
        pane.orb = Math.random() < 0.1;
      });
    });
  }

  speed() {
    return Math.min(900, 540 + (this.level - 1) * 45) * this.speedK;
  }

  newBall(x, y, vx = 0, vy = 0) {
    const b = this.balls.create(x, y, this.tex('brkBall'));
    b.setCircle(10, 4, 4);
    b.setBounce(1);
    b.setCollideWorldBounds(true);
    b.body.setVelocity(vx, vy);
    b.isBall = true;
    b.trail = [];
    return b;
  }

  holdBall() {
    this.held = this.newBall(this.paddle.x, this.paddle.y - 26);
  }

  launch() {
    if (!this.held || this.over) return;
    const ang = Phaser.Math.DegToRad(-90 + Phaser.Math.Between(-22, 22));
    const s = this.speed();
    this.held.body.setVelocity(Math.cos(ang) * s, Math.sin(ang) * s);
    this.held = null;
    this.bowl.bounce(1);
  }

  hitPaddle(a, b) {
    const ball = a.isBall ? a : b;
    if (ball === this.held) return;
    const diff = Phaser.Math.Clamp((ball.x - this.paddle.x) / 75, -1, 1);
    const ang = Phaser.Math.DegToRad(-90 + diff * 62);
    const s = this.speed();
    ball.body.setVelocity(Math.cos(ang) * s, Math.sin(ang) * s);
    this.streak = 0;
    this.bowl.bounce(0.9 + Math.abs(diff) * 0.2);
    this.tweens.add({ targets: this.paddle, scaleY: 0.7, scaleX: 1.08, duration: 60, yoyo: true });
  }

  hitPane(a, b) {
    const pane = a.hits !== undefined ? a : b;
    if (!pane.active) return;
    pane.hits -= 1;
    if (pane.hits > 0) {
      pane.setTexture(this.tex('brkCrack'));
      this.fx.emit(pane.color, pane.x, pane.y, 4);
      if (this.kids) this.bowl.toy(0.5);
      else this.bowl.crack();
      this.score += 5;
      this.updateHud();
      return;
    }
    this.streak += 1;
    this.score += 10 * this.level + (this.streak > 1 ? this.streak * 2 : 0);
    this.fx.emit(pane.color, pane.x, pane.y, 16);
    if (this.kids) this.bowl.confettiPop(0.7);
    else this.bowl.shatter(0.7, true);
    if (this.streak >= 4 && this.streak % 2 === 0) UIKit.floatText(this, pane.x, pane.y, Theme.pick(`${this.streak} in a row`, `${this.streak} in a row!`), Palette.LOTUS, 30);
    if (pane.orb) {
      const orb = this.orbs.create(pane.x, pane.y, this.tex('brkOrb'));
      orb.body.setVelocity(0, 230);
      orb.isOrb = true;
    }
    pane.destroy();
    this.updateHud();
    if (this.bricks.countActive(true) === 0) this.levelClear();
  }

  catchOrb(a, b) {
    const orb = a.isOrb ? a : b;
    if (!orb.active) return;
    orb.destroy();
    if (this.held) this.launch();
    const s = this.speed();
    const live = this.balls.getChildren().filter((x) => x.active && x !== this.held).slice(0, 3);
    for (const ball of live) {
      for (const turn of [-0.4, 0.4]) {
        if (this.balls.countActive(true) >= 9) break;
        const ang = Math.atan2(ball.body.velocity.y, ball.body.velocity.x) + turn;
        this.newBall(ball.x, ball.y, Math.cos(ang) * s, Math.sin(ang) * s);
      }
    }
    UIKit.floatText(this, this.paddle.x, this.paddle.y - 60, Theme.pick('Multi-ball', 'Triple ball!'), Palette.SAFFRON, 34);
    this.bowl.strike(392, 0.12, 2.5);
    if (this.kids) this.bowl.sparkle();
  }

  updateHud() {
    this.scoreText.setText(`Score ${this.score}  ·  ${'●'.repeat(Math.max(0, this.lives))}${'○'.repeat(Math.max(0, 3 - this.lives))}`);
  }

  update(time, delta) {
    const H = Layout.H(this);
    const F = this.F;
    this.rest.tick(delta);

    if (this.keys) {
      if (this.keys.left.isDown) this.targetX = this.paddle.x - 40;
      if (this.keys.right.isDown) this.targetX = this.paddle.x + 40;
    }
    const tx = Phaser.Math.Clamp(this.targetX, F.x + 80, F.x + F.w - 80);
    this.paddle.x += (tx - this.paddle.x) * Math.min(1, delta / 45);
    if (this.paddle.body.updateFromGameObject) this.paddle.body.updateFromGameObject();

    if (this.held) this.held.body.reset(this.paddle.x, this.paddle.y - 26);

    const s = this.speed();
    const tg = this.trailG;
    tg.clear();
    this.balls.getChildren().forEach((ball) => {
      if (!ball.active) return;
      if (ball !== this.held) {
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 9) ball.trail.shift();
        ball.trail.forEach((p, i) => {
          tg.fillStyle(this.kids ? 0xffc533 : 0xffffff, (i / ball.trail.length) * 0.35);
          tg.fillCircle(p.x, p.y, 3 + (i / ball.trail.length) * 6);
        });
      }
      if (ball === this.held) return;
      if (ball.y > H + 30) {
        ball.destroy();
        return;
      }
      const v = ball.body.velocity;
      let vx = v.x;
      let vy = v.y;
      const minY = s * 0.3;
      if (Math.abs(vy) < minY) vy = (vy < 0 ? -1 : 1) * minY;
      const len = Math.hypot(vx, vy) || 1;
      ball.body.setVelocity((vx / len) * s, (vy / len) * s);
    });

    this.orbs.getChildren().forEach((o) => o.active && o.y > H + 40 && o.destroy());

    if (!this.over && !this.held && this.balls.countActive(true) === 0) this.loseBall();
  }

  loseBall() {
    this.lives -= 1;
    this.streak = 0;
    this.updateHud();
    this.bowl.strike(130, 0.18, 3);
    if (this.lives <= 0) {
      this.over = true;
      const isBest = BestScores.submit('breaker', this.score);
      if (isBest) this.bowl.fanfare();
      this.time.delayedCall(600, () =>
        UIKit.resultCard(this, {
          eyebrow: `Level ${this.level}`,
          title: Theme.pick('Round over', 'Great game!'),
          lines: [`Score ${this.score}`, isBest ? 'A new best score' : `Your best is ${BestScores.get('breaker')}`],
          primary: ['Play again', () => this.scene.restart({})],
          secondary: ['All games', () => this.scene.start('MenuScene')]
        })
      );
      return;
    }
    this.holdBall();
    UIKit.toast(this, 'Tap to launch the next ball.', this.F.paddleY - 120, 1800);
  }

  levelClear() {
    this.over = true;
    this.balls.getChildren().forEach((b) => b.body && b.body.setVelocity(0, 0));
    this.orbs.clear(true, true);
    this.bowl.fanfare();
    BestScores.submit('breaker', this.score);
    this.time.delayedCall(700, () =>
      UIKit.resultCard(this, {
        eyebrow: `Level ${this.level}`,
        title: Theme.pick('All clear', 'All crunched!'),
        lines: [`Score ${this.score}`, this.lives < 3 ? 'You win back a ball.' : 'Not a single ball lost.'],
        primary: ['Next level', () => this.scene.restart({ level: this.level + 1, score: this.score, lives: Math.min(3, this.lives + 1) })],
        secondary: ['All games', () => this.scene.start('MenuScene')]
      })
    );
  }
}
