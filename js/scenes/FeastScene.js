/**
 * FeastScene — Koi Feast (Grown-ups) / Hungry Fish (Kids). A game.
 * The fish pond, as a game. Fish swim calmly until one gets hungry: a thought
 * bubble shows the food it wants, with a ring that slowly runs down. Pick that
 * food from the tray and tap the water near the fish; it swims over and eats.
 * The right food in time scores, and quick feeds in a row build a combo. If the
 * ring runs out the fish swims off to sulk and a lily pad is lost (three pads).
 * Feed enough fish to clear the level; later levels bring more fish, a third
 * food and less patience. Now and then a golden koi wants anything at all.
 *
 * Fish only go for the food they want, and only when hungry, so tapping food
 * everywhere doesn't help — dropped food that nobody eats breaks the combo.
 */
class FeastScene extends Phaser.Scene {
  static FOODS_ADULT = [
    { id: 'pellet', name: 'Pellets', color: 0xe8ae4c, shape: 'dot' },
    { id: 'berry', name: 'Berries', color: 0xd94f6a, shape: 'berry' },
    { id: 'leaf', name: 'Greens', color: 0x6fbf73, shape: 'leaf' }
  ];

  static FOODS_KIDS = [
    { id: 'cookie', name: 'Cookies', color: 0xffc533, shape: 'dot' },
    { id: 'heart', name: 'Hearts', color: 0xff6fa8, shape: 'heart' },
    { id: 'star', name: 'Stars', color: 0x4fb6ff, shape: 'star' }
  ];

  constructor() {
    super('FeastScene');
  }

  init(data) {
    this.level = (data && data.level) || ProgressStore.getBest('feast') + 1;
    this.fish = [];
    this.pellets = [];
    this.selected = 0;
    this.state = 'intro';
    this.drops = {};
    this.dropId = 0;
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
    this.foods = this.kids ? FeastScene.FOODS_KIDS : FeastScene.FOODS_ADULT;

    const bg = this.add.graphics();
    bg.fillGradientStyle(Palette.POND, Palette.POND_DEEP, Palette.POND_DEEP, Palette.POND, 1);
    bg.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      bg.fillStyle(Math.random() < 0.5 ? 0x000000 : 0xffffff, Math.random() * 0.06 + 0.03);
      bg.fillEllipse(Math.random() * W, Math.random() * H, Phaser.Math.Between(14, 50), Phaser.Math.Between(10, 34));
    }
    for (let i = 0; i < 6; i++) {
      const light = this.add.ellipse(Math.random() * W, Math.random() * H, Phaser.Math.Between(220, 420), Phaser.Math.Between(90, 180), 0xffffff, this.kids ? 0.07 : 0.03);
      this.tweens.add({ targets: light, x: light.x + Phaser.Math.Between(-140, 140), y: light.y + Phaser.Math.Between(-100, 100), duration: Phaser.Math.Between(9000, 16000), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    // where the fish may swim: clear of the top bar and the food tray
    this.bounds = land ? { x: 0, y: 120, w: W - 250, h: H - 120 } : { x: 0, y: 220, w: W, h: H - 220 - 170 };

    this.foodLayer = this.add.container(0, 0);
    this.fishG = this.add.graphics();
    this.bubbleLayer = this.add.container(0, 0).setDepth(20);

    UIKit.leave(this);
    UIKit.text(this, W - 160, 62, GameLibrary.get('feast').title, { display: true, size: 38, ox: 1, align: 'right' }).setDepth(40);
    this.levelText = UIKit.text(this, 34, 132, '', { size: 26, weight: '600', ox: 0, align: 'left' }).setDepth(40);
    this.goalText = UIKit.text(this, 34, 168, '', { size: 21, ox: 0, align: 'left', color: Palette.css(Palette.MIST) }).setDepth(40);
    this.scoreText = UIKit.text(this, land ? W - 130 : W - 34, land ? 132 : 132, '', { display: true, size: 34, ox: land ? 0.5 : 1, align: 'right', color: Palette.css(Palette.SAFFRON) }).setDepth(40);
    this.padsG = this.add.graphics().setDepth(40);

    this.makeTray();

    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open || this.state !== 'play') return;
      this.bowl.unlock();
      const b = this.bounds;
      if (p.lx < b.x || p.lx > b.x + b.w || p.ly < b.y || p.ly > b.y + b.h) return;
      this.drop(p.lx, p.ly);
    });

    this.rest = new EyeRest(this);
    WakeKeeper.hold();
    this.setupLevel();
    const entry = GameLibrary.get('feast');
    UIKit.resultCard(this, {
      eyebrow: entry.title,
      title: `Level ${this.level}`,
      lines: [
        Theme.pick('A hungry fish shows the food it wants.', 'A hungry fish shows what it wants to eat.'),
        Theme.pick('Pick that food, then tap the water near it.', 'Pick that food, then tap near the fish!'),
        `Feed ${this.goal} ${Theme.pick('fish', 'fish')} before you run out of lily pads.`
      ],
      primary: [Theme.pick('Start', 'Go!'), () => this.begin()],
      secondary: ['All games', () => this.scene.start('MenuScene')]
    });
  }

  /* ---------- the food tray ---------- */

  makeTray() {
    const { W, H, land } = this;
    const n = this.foods.length;
    this.trayBtns = [];
    const tray = this.add.graphics().setDepth(30);
    if (land) {
      tray.fillStyle(0x000000, 0.18);
      tray.fillRoundedRect(W - 230, 200, 200, 470, 28);
    } else {
      tray.fillStyle(0x000000, 0.18);
      tray.fillRoundedRect(30, H - 160, W - 60, 140, 28);
    }
    this.foods.forEach((f, i) => {
      const x = land ? W - 130 : W / 2 + (i - (n - 1) / 2) * 200;
      const y = land ? 290 + i * 150 : H - 90;
      const c = this.add.container(x, y).setDepth(31);
      const ring = this.add.circle(0, 0, 50, 0xffffff, 0.12);
      const g = this.add.graphics();
      FeastScene.drawFood(g, f, 0, 0, 2.4);
      const label = UIKit.text(this, 0, 64, f.name, { size: 18, weight: '600' });
      c.add([ring, g, label]);
      c.setSize(120, 120);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => this.pick(i));
      c.ring = ring;
      c.food = f;
      this.trayBtns.push(c);
    });
    if (this.input.keyboard) {
      ['ONE', 'TWO', 'THREE'].forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.pick(i)));
    }
    this.refreshTray();
  }

  pick(i) {
    if (i >= this.foodCount) return;
    this.selected = i;
    this.bowl.unlock();
    this.bowl.tok(0.4);
    this.refreshTray();
  }

  refreshTray() {
    this.trayBtns.forEach((c, i) => {
      const on = i === this.selected;
      const usable = i < (this.foodCount || 2);
      c.setAlpha(usable ? 1 : 0.25);
      c.ring.setFillStyle(on ? c.food.color : 0xffffff, on ? 0.45 : 0.12);
      c.ring.setStrokeStyle(on ? 4 : 0, 0xffffff, 1);
      c.setScale(on ? 1.08 : 1);
    });
  }

  /** A food piece: pellet, berry, leaf, heart or star. s = size scale. */
  static drawFood(g, f, x, y, s = 1) {
    g.fillStyle(f.color, 1);
    switch (f.shape) {
      case 'berry':
        g.fillCircle(x - 3 * s, y + 1 * s, 4.2 * s);
        g.fillCircle(x + 3 * s, y + 1 * s, 4.2 * s);
        g.fillCircle(x, y - 3 * s, 4.2 * s);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(x - 1.5 * s, y - 4 * s, 1.2 * s);
        break;
      case 'leaf':
        g.fillEllipse(x, y, 13 * s, 7 * s);
        g.lineStyle(1.2 * s, 0x3f7a4a, 1);
        g.lineBetween(x - 6 * s, y, x + 6 * s, y);
        break;
      case 'heart': {
        g.fillCircle(x - 2.6 * s, y - 1.5 * s, 3.4 * s);
        g.fillCircle(x + 2.6 * s, y - 1.5 * s, 3.4 * s);
        g.fillTriangle(x - 5.8 * s, y - 0.4 * s, x + 5.8 * s, y - 0.4 * s, x, y + 6 * s);
        break;
      }
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          const r = (i % 2 ? 2.8 : 6.5) * s;
          pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
        }
        g.fillPoints(pts, true);
        break;
      }
      default:
        g.fillCircle(x, y, 4.6 * s);
        g.fillStyle(0xffffff, 0.45);
        g.fillCircle(x - 1.5 * s, y - 1.5 * s, 1.4 * s);
    }
  }

  /* ---------- levels ---------- */

  setupLevel() {
    const L = this.level;
    this.goal = 6 + L * 2;
    this.fed = 0;
    this.score = this.score || 0;
    this.combo = 0;
    this.lives = 3;
    this.foodCount = L >= 3 ? 3 : 2;
    this.selected = Math.min(this.selected, this.foodCount - 1);
    this.patience = Math.max(6, (this.kids ? 13 : 11) - L * 0.6);
    this.hungerEvery = Math.max(1.4, 3.6 - L * 0.22);
    this.hungerIn = 1.5;
    this.maxHungry = Math.min(4, 1 + Math.floor((L + 1) / 2));

    this.fish.forEach((f) => f.bubble && f.bubble.destroy());
    this.fish = [];
    const names = ['kohaku', 'ogon', 'showa', 'tancho', 'chagoi', 'sanke', 'kohaku', 'ogon'];
    const count = Math.min(8, 3 + Math.floor(L / 2));
    for (let i = 0; i < count; i++) {
      const k = new Koi(this.bounds, names[i % names.length], Phaser.Math.Between(140, 185) - i * 3, this.kids);
      this.fish.push({ k, want: null, wait: 0, golden: false, bubble: null, sulk: 0 });
    }
    this.levelText.setText(`Level ${this.level}`);
    this.refreshTray();
    this.updateHud();
  }

  begin() {
    this.bowl.unlock();
    this.state = 'play';
    this.stream = this.bowl.startStream();
    if (this.stream) this.stream.set(0.25);
    this.events.once('shutdown', () => this.stream && this.stream.stop());
    this.bowl.strike(262, 0.1, 3);
  }

  updateHud() {
    this.goalText.setText(`${Theme.pick('Fed', 'Fed')} ${this.fed} of ${this.goal}${this.combo > 1 ? `  ·  combo ×${this.combo}` : ''}`);
    this.scoreText.setText(String(this.score));
    // lily pads for lives
    const g = this.padsG;
    g.clear();
    const x0 = this.land ? this.W - 200 : this.W - 150;
    const y0 = this.land ? 176 : 176;
    for (let i = 0; i < 3; i++) {
      const on = i < this.lives;
      g.fillStyle(on ? Palette.LEAF : 0x000000, on ? 1 : 0.2);
      g.slice(x0 + i * 46, y0, 17, 0.3, Math.PI * 2 - 0.3, false);
      g.fillPath();
      if (on) {
        g.fillStyle(Palette.LOTUS, 1);
        g.fillCircle(x0 + i * 46 - 3, y0 - 2, 5);
      }
    }
  }

  /* ---------- hunger ---------- */

  makeHungry() {
    const hungry = this.fish.filter((f) => f.want).length;
    if (hungry >= this.maxHungry) return;
    const calm = this.fish.filter((f) => !f.want && f.sulk <= 0);
    if (!calm.length) return;
    const f = Phaser.Utils.Array.GetRandom(calm);
    f.golden = this.level >= 3 && Math.random() < 0.12;
    f.want = f.golden ? 'any' : this.foods[Phaser.Math.Between(0, this.foodCount - 1)].id;
    f.wait = this.patience;
    f.bubble = this.makeBubble(f);
    this.bowl.plip(0.4);
  }

  makeBubble(f) {
    const c = this.add.container(f.k.x, f.k.y - 70);
    const g = this.add.graphics();
    const ring = this.add.graphics();
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(0, 0, 30);
    g.fillCircle(-18, 30, 6);
    g.fillCircle(-26, 42, 3.5);
    if (f.golden) {
      g.fillStyle(0xffcf3f, 1);
      g.fillCircle(0, 0, 24);
      const t = UIKit.text(this, 0, 0, '?', { size: 30, weight: '700', color: '#ffffff', plain: true });
      c.add([g, ring, t]);
    } else {
      const food = this.foods.find((x) => x.id === f.want);
      FeastScene.drawFood(g, food, 0, 0, 2.6);
      c.add([g, ring]);
    }
    c.ring = ring;
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.Out' });
    this.bubbleLayer.add(c);
    if (f.golden) {
      f.home = f.k.p;
      f.k.p = Object.assign({}, f.k.p, { base: 0xffcf3f });
    }
    return c;
  }

  clearHunger(f) {
    if (f.bubble) {
      const b = f.bubble;
      this.tweens.add({ targets: b, scale: 0, duration: 200, onComplete: () => b.destroy() });
    }
    if (f.golden && f.home) f.k.p = f.home;
    f.bubble = null;
    f.want = null;
    f.golden = false;
  }

  /* ---------- food ---------- */

  drop(x, y) {
    const food = this.foods[this.selected];
    this.ripple(x, y, 3);
    this.bowl.plip(0.5);
    for (let i = 0; i < 3; i++) {
      const px = x + Phaser.Math.Between(-22, 22);
      const py = y + Phaser.Math.Between(-22, 22);
      const g = this.add.graphics({ x: px, y: py });
      FeastScene.drawFood(g, food, 0, 0, 1.2);
      this.foodLayer.add(g);
      this.pellets.push({ x: px, y: py, g, food: food.id, age: 0, eaten: false, drop: this.dropId });
    }
    this.drops[this.dropId] = { left: 3, ate: false };
    this.dropId += 1;
  }

  ripple(x, y, scale = 3, alpha = 0.4) {
    const c = this.add.circle(x, y, 14);
    c.setStrokeStyle(2, 0xffffff, alpha);
    this.tweens.add({ targets: c, scale, alpha: 0, duration: 1400, ease: 'Sine.Out', onComplete: () => c.destroy() });
  }

  fedFish(f, pel) {
    const golden = f.golden;
    this.combo += 1;
    const gain = (golden ? 30 : 10) * Math.min(5, this.combo);
    this.score += gain;
    this.fed += 1;
    const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];
    this.bowl.chime(notes[Math.min(notes.length - 1, this.combo - 1)], 0.06);
    if (golden) this.bowl.coins();
    else if (this.kids) this.bowl.sparkle(0.4);
    f.k.wiggle = 1.6;
    // a few hearts or bubbles rise from the happy fish
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(pel.x + (i - 1) * 16, pel.y, this.kids ? '💖' : '·', { fontSize: this.kids ? '22px' : '40px', color: '#ffffff' }).setOrigin(0.5).setResolution(AppRouter.k).setDepth(21);
      this.tweens.add({ targets: t, y: pel.y - 60 - i * 12, alpha: 0, delay: i * 90, duration: 900, onComplete: () => t.destroy() });
    }
    UIKit.floatText(this, pel.x, pel.y - 40, `+${gain}`, golden ? Palette.SAFFRON : 0xffffff, 28);
    this.clearHunger(f);
    this.updateHud();
    if (this.fed >= this.goal) this.levelDone();
  }

  missFish(f) {
    this.lives -= 1;
    this.combo = 0;
    this.bowl.aww();
    f.sulk = 4;
    const puff = this.add.circle(f.k.x, f.k.y, 26, 0xffffff, 0.35);
    this.tweens.add({ targets: puff, scale: 2.4, alpha: 0, duration: 800, onComplete: () => puff.destroy() });
    UIKit.floatText(this, f.k.x, f.k.y - 60, Theme.pick('Swam off', 'Too slow!'), Palette.MIST, 26);
    this.clearHunger(f);
    this.updateHud();
    if (this.lives <= 0) this.levelLost();
  }

  levelDone() {
    this.state = 'done';
    ProgressStore.setBest('feast', this.level);
    this.bowl.fanfare();
    this.fish.forEach((f) => this.clearHunger(f));
    const stars = this.lives;
    this.time.delayedCall(700, () => {
      UIKit.resultCard(this, {
        eyebrow: `Level ${this.level}`,
        title: Theme.pick('The pond is content', 'All the fish are full!'),
        lines: [`${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, `Score ${this.score}`],
        primary: ['Next level', () => this.nextLevel()],
        secondary: ['All games', () => this.scene.start('MenuScene')]
      });
    });
  }

  levelLost() {
    this.state = 'done';
    this.fish.forEach((f) => this.clearHunger(f));
    this.time.delayedCall(600, () => {
      UIKit.resultCard(this, {
        eyebrow: `Level ${this.level}`,
        title: Theme.pick('The fish drifted off', 'The fish went for a nap'),
        lines: [`${this.fed} of ${this.goal} fed`, Theme.pick('Watch the rings. Feed the emptiest first.', 'Feed the fish whose ring is smallest first!')],
        primary: ['Try again', () => this.retry()],
        secondary: ['All games', () => this.scene.start('MenuScene')]
      });
    });
  }

  nextLevel() {
    this.level += 1;
    this.clearFood();
    this.setupLevel();
    this.state = 'play';
  }

  retry() {
    this.score = 0;
    this.clearFood();
    this.setupLevel();
    this.state = 'play';
  }

  clearFood() {
    this.pellets.forEach((p) => p.g.destroy());
    this.pellets = [];
  }

  /* ---------- the loop ---------- */

  update(time, delta) {
    const dt = Math.min(delta, 60) / 1000;
    this.rest.tick(delta);
    const playing = this.state === 'play' && !this.rest.open;

    if (playing) {
      this.hungerIn -= dt;
      if (this.hungerIn <= 0) {
        this.makeHungry();
        this.hungerIn = this.hungerEvery * Phaser.Math.FloatBetween(0.7, 1.3);
      }
    }

    this.fish.forEach((f) => {
      // a fish only sees the food it wants, and only when it's hungry
      const visible = f.want ? this.pellets.filter((p) => !p.eaten && (f.want === 'any' || p.food === f.want)) : [];
      const eaten = f.k.update(dt, visible);
      if (eaten) {
        eaten.g.destroy();
        if (this.drops[eaten.drop]) this.drops[eaten.drop].ate = true;
        this.ripple(eaten.x, eaten.y, 1.8, 0.3);
        if (f.want && playing) this.fedFish(f, eaten);
      }
      if (f.sulk > 0) f.sulk -= dt;
      if (f.want && playing) {
        f.wait -= dt;
        if (f.bubble) {
          f.bubble.setPosition(f.k.x, f.k.y - 72);
          const frac = Math.max(0, f.wait / this.patience);
          const r = f.bubble.ring;
          r.clear();
          r.lineStyle(6, frac > 0.35 ? 0x5fd38a : frac > 0.15 ? 0xffc533 : 0xff4f6a, 1);
          r.beginPath();
          r.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
          r.strokePath();
          if (frac < 0.2) f.bubble.setAngle(Math.sin(time / 50) * 6);
        }
        if (f.wait <= 0) this.missFish(f);
      }
    });

    // food that nobody wants sinks away; an unused handful breaks the combo
    for (const p of this.pellets) {
      if (p.eaten) continue;
      p.age += dt;
      p.g.setAlpha(Math.min(1, (7 - p.age) / 2));
      if (p.age > 7) {
        p.eaten = true;
        p.g.destroy();
        const d = this.drops[p.drop];
        if (d) {
          d.left -= 1;
          if (d.left <= 0) {
            if (!d.ate && playing && this.combo > 0) {
              this.combo = 0;
              this.updateHud();
            }
            delete this.drops[p.drop];
          }
        }
      }
    }
    this.pellets = this.pellets.filter((p) => !p.eaten);

    this.fishG.clear();
    this.fish.forEach((f) => f.k.draw(this.fishG));
  }
}
