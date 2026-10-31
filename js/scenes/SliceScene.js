/**
 * SliceScene — Worry Slice (Grown-ups) / Grumble Slice (Kids).
 * Worries (or grumpy blobs) are tossed up from below; swipe to slice them.
 * Several in one swipe is a combo. One-minute rounds, no lives to lose.
 * Throws scale to the screen height, so both orientations play the same.
 *
 * Every slice sings: each item carries its own sound (swish, juicy, glassy tink,
 * paper rip; Kids get bloops and giggles) on a note that climbs the scale the
 * more you cut in one swipe. Each slice also ends its own way: halves fly, the
 * word scatters into letters, paint splats, or the worry turns into birds and
 * flies off (Kids: hearts, stars and confetti).
 *
 * Specials: Golden (+5), Frost (slows time for a few seconds), Frenzy (a burst
 * of extra worries) and Tough worries that take three cuts.
 */
class SliceScene extends Phaser.Scene {
  static WORRIES = [
    'Deadlines', 'Traffic', 'Bills', 'Emails', 'Exams', 'Meetings', 'Overthinking', 'Noise', 'Rush hour',
    'Debt', 'Gossip', 'Late again', 'Inbox 999', 'Pressure', 'Self-doubt', 'Clutter', 'Comparing', 'Pings',
    'Worry', 'Anger', 'FOMO', 'No sleep', 'Small talk', 'To-do list', 'Low battery', 'Bad Wi-Fi', 'Office politics',
    'Rent', 'Homework', 'Spam calls', 'Buffering', 'Queues', 'Mood swings', 'Monday'
  ];

  static KID_WORRIES = [
    'Homework', 'Bedtime', 'Spelling test', 'Broccoli', 'Chores', 'Grumpy', 'Shy', 'Bad dream', 'Waiting',
    'Teasing', 'Lost game', 'Rainy day', 'Bad mood', 'Too loud', 'Tummy ache', 'Long car ride', 'Boring',
    'Tidy up', 'Bath time', 'Fell over', 'Left out', 'Too hard', 'Mud', 'Monday'
  ];

  static COLORS = [0x9b4d63, 0x6a5196, 0x9a6a3c, 0x3f7487, 0x7a3f6e, 0x4f7a54];

  constructor() {
    super('SliceScene');
  }

  init() {
    this.duration = 60;
    this.score = 0;
    this.sliced = 0;
    this.elapsed = 0;
    this.items = [];
    this.halves = [];
    this.trail = [];
    this.running = false;
    this.swiping = false;
    this.swipeHits = 0;
    this.spawnIn = 0.6;
    this.lastWhoosh = 0;
    this.deck = [];
    this.slow = 0;
    this.swipeId = 0;
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    // Throw strength scales with the square root of the screen height.
    this.k = Math.sqrt(H / 1280);
    this.gravity = 1100;

    const bg = this.add.graphics();
    if (this.kids) {
      bg.fillGradientStyle(Palette.BG_TOP, Palette.BG_TOP, Palette.BG_BOTTOM, Palette.BG_BOTTOM, 1);
      bg.fillRect(0, 0, W, H);
      for (let i = 0; i < 30; i++) bg.fillStyle(0xffffff, 0.1).fillCircle(Math.random() * W, Math.random() * H, Phaser.Math.Between(8, 30));
    } else {
      bg.fillGradientStyle(0x2a2340, 0x2a2340, Palette.NIGHT, Palette.NIGHT, 1);
      bg.fillRect(0, 0, W, H);
      for (let i = 0; i < 50; i++) this.add.circle(Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.8 + 0.6, Palette.MOON, Math.random() * 0.4 + 0.1);
    }

    this.fx = new Burst(this, 'fxDot', { speed: { min: 80, max: 360 }, scale: { start: 0.9, end: 0.2 }, gravityY: 900 }, 24);
    this.trailG = this.add.graphics().setDepth(30);
    this.splatG = this.add.graphics().setDepth(1);
    this.frostVeil = this.add.rectangle(0, 0, W, H, 0x9fdcff, 0).setOrigin(0).setDepth(29);
    this.W = W;

    UIKit.leave(this);
    this.scoreText = UIKit.text(this, W / 2, 62, '0', { display: true, size: 56 }).setDepth(41);
    this.timeText = UIKit.text(this, W - 160, 62, '60 s', { size: 26, weight: '600', ox: 1, align: 'right', color: Palette.css(Palette.MIST) }).setDepth(41);

    this.bindInput();
    this.rest = new EyeRest(this);

    const best = BestScores.get('slice');
    const entry = GameLibrary.get('slice');
    UIKit.resultCard(this, {
      eyebrow: entry.title,
      title: Theme.pick('Slice the worries', 'Slice the grumbles!'),
      lines: [
        Theme.pick('Swipe across worries as they fly up.', 'Swipe across the grumpy blobs.'),
        'Three or more in one swipe is a combo.',
        Theme.pick('Gold is +5. Frost slows time.', 'Gold stars +5! Ice slows time!'),
        best ? `One minute. Your best is ${best}.` : 'You have one minute.'
      ],
      primary: [Theme.pick('Start', 'Go!'), () => this.begin()],
      secondary: ['All games', () => this.scene.start('MenuScene')]
    });
  }

  begin() {
    this.bowl.unlock();
    this.bowl.strike(220, 0.12, 3);
    this.running = true;
    WakeKeeper.hold();
  }

  bindInput() {
    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || !this.running || this.rest.open) return;
      this.bowl.unlock();
      this.swiping = true;
      this.swipeHits = 0;
      this.swipeId += 1;
      this.trail = [{ x: p.lx, y: p.ly, t: this.time.now }];
    });
    this.input.on('pointermove', (p) => {
      if (!this.swiping) return;
      const now = this.time.now;
      const last = this.trail[this.trail.length - 1] || { x: p.lx, y: p.ly, t: now };
      const pt = { x: p.lx, y: p.ly, t: now };
      this.trail.push(pt);
      const d = Phaser.Math.Distance.Between(last.x, last.y, pt.x, pt.y);
      const speed = d / Math.max(1, pt.t - last.t);
      if (speed > 0.3 && d > 2) {
        const ang = Math.atan2(pt.y - last.y, pt.x - last.x);
        for (const item of this.items) {
          if (!item.dead && item.hitSwipe !== this.swipeId && SliceScene.segDist(item.x, item.y, last, pt) < item.r) this.slice(item, ang);
        }
      }
      if (speed > 1.4 && now - this.lastWhoosh > 260) {
        this.lastWhoosh = now;
        this.bowl.whoosh();
      }
    });
    const end = () => {
      if (!this.swiping) return;
      this.swiping = false;
      if (this.swipeHits >= 3) this.combo(this.swipeHits);
    };
    this.input.on('pointerup', end);
    this.input.on('pointerupoutside', end);
  }

  static segDist(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Phaser.Math.Clamp(((px - a.x) * dx + (py - a.y) * dy) / len2, 0, 1) : 0;
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
  }

  nextWord() {
    if (!this.deck.length) this.deck = Phaser.Utils.Array.Shuffle((this.kids ? SliceScene.KID_WORRIES : SliceScene.WORRIES).slice());
    return this.deck.pop();
  }

  spawnWave() {
    const n = Phaser.Math.Between(1, Math.min(4, 1 + Math.floor(this.elapsed / 12)));
    for (let i = 0; i < n; i++) this.time.delayedCall(i * 140, () => this.running && this.spawnItem());
  }

  /** Draw a worry bubble (Grown-ups) or a grumpy blob with a face (Kids). */
  drawItem(g, r, color, golden, kind = 'plain') {
    g.fillStyle(0x000000, 0.25);
    g.fillCircle(4, 6, r);
    if (kind === 'frost' || kind === 'frenzy') {
      g.fillStyle(kind === 'frost' ? 0x9fdcff : 0xffffff, kind === 'frost' ? 0.95 : 0.9);
      g.fillCircle(0, 0, r);
      if (kind === 'frenzy') {
        Theme.CANDY.forEach((col, i) => {
          g.lineStyle(7, col, 1);
          g.beginPath();
          g.arc(0, 0, r - 5, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2);
          g.strokePath();
        });
      } else {
        g.lineStyle(3, 0xffffff, 0.9);
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI;
          g.lineBetween(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, -Math.cos(a) * r * 0.55, -Math.sin(a) * r * 0.55);
        }
        g.strokeCircle(0, 0, r - 3);
      }
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(-r * 0.3, -r * 0.42, r * 0.8, r * 0.4);
      return;
    }
    if (this.kids && golden) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? r * 0.55 : r * 1.05;
        pts.push(new Phaser.Math.Vector2(Math.cos(a) * rr, Math.sin(a) * rr));
      }
      g.fillStyle(color, 1);
      g.fillPoints(pts, true);
      g.lineStyle(4, 0xffffff, 1);
      g.strokePoints(pts, true);
    } else {
      g.fillStyle(color, 0.95);
      g.fillCircle(0, 0, r);
      g.fillStyle(0xffffff, this.kids ? 0.25 : 0.14);
      g.fillEllipse(-r * 0.3, -r * 0.42, r * 0.9, r * 0.45);
      g.lineStyle(this.kids ? 4 : 3, 0xffffff, this.kids ? 0.9 : 0.25);
      g.strokeCircle(0, 0, r - 2);
      if (kind === 'tough') {
        g.lineStyle(6, this.kids ? 0x1d2458 : 0x000000, 0.35);
        g.strokeCircle(0, 0, r - 8);
      }
    }
    if (this.kids) {
      g.fillStyle(0x1d2458, 1);
      if (golden) {
        g.fillCircle(-10, -2, 4);
        g.fillCircle(10, -2, 4);
        g.lineStyle(3, 0x1d2458, 1);
        g.beginPath();
        g.arc(0, 4, 9, 0.3, Math.PI - 0.3);
        g.strokePath();
      } else {
        g.fillCircle(-r * 0.32, -r * 0.18, 6);
        g.fillCircle(r * 0.32, -r * 0.18, 6);
        g.lineStyle(4, 0x1d2458, 1);
        g.lineBetween(-r * 0.5, -r * 0.42, -r * 0.16, -r * 0.3);
        g.lineBetween(r * 0.5, -r * 0.42, r * 0.16, -r * 0.3);
        g.beginPath();
        g.arc(0, r * 0.42, r * 0.22, Math.PI + 0.35, -0.35);
        g.strokePath();
      }
    }
  }

  pickKind() {
    const roll = Math.random();
    const t = this.elapsed;
    if (roll < 0.06) return 'golden';
    if (t > 8 && roll < 0.11 && this.slow <= 0) return 'frost';
    if (t > 14 && roll < 0.15) return 'frenzy';
    if (t > 6 && roll < 0.24) return 'tough';
    return 'plain';
  }

  spawnItem(forced) {
    const { W, H } = Layout.info(this);
    const kind = forced || this.pickKind();
    const golden = kind === 'golden';
    const special = kind === 'frost' || kind === 'frenzy';
    const word = golden ? Theme.pick('Let go', '') : kind === 'frost' ? Theme.pick('Slow down', 'Ice!') : kind === 'frenzy' ? Theme.pick('Flurry', 'Rainbow!') : this.nextWord();
    const color = golden ? Palette.SAFFRON : kind === 'frost' ? 0x9fdcff : this.kids ? Theme.CANDY[Phaser.Math.Between(0, 5)] : Phaser.Utils.Array.GetRandom(SliceScene.COLORS);
    const r = golden || special ? 58 : kind === 'tough' ? 84 : Phaser.Math.Between(60, 70);
    const x = Phaser.Math.Between(130, W - 130);

    const c = this.add.container(x, H + 80).setDepth(20);
    const g = this.add.graphics();
    this.drawItem(g, r, color, golden, kind);
    c.add(g);
    if (word) {
      const label = word.length > 10 && word.includes(' ') ? word.replace(' ', '\n') : word;
      const t = UIKit.text(this, 0, this.kids ? r * 0.12 + 8 : 2, label, {
        size: this.kids ? 18 : 21,
        weight: '600',
        lineSpacing: 2,
        color: Palette.css(golden || special ? 0x1d2458 : 0xffffff),
        plain: !this.kids
      });
      if (this.kids && !special) t.setY(r + 16);
      const fit = (r * 1.62) / Math.max(t.width, t.height);
      if (!this.kids && fit < 1) t.setScale(fit);
      c.add(t);
    }

    const toss = (W / 2 - x) * Phaser.Math.FloatBetween(0.35, 0.75) + Phaser.Math.Between(-40, 40);
    this.items.push({
      c,
      x,
      y: H + 80,
      r,
      vx: toss * this.k,
      vy: -Phaser.Math.Between(1280, 1520) * this.k,
      vr: Phaser.Math.FloatBetween(-0.6, 0.6),
      word: word || 'Smile',
      color,
      golden,
      kind,
      g,
      hp: kind === 'tough' ? 3 : 1,
      sound: Phaser.Utils.Array.GetRandom(this.kids ? ['bloop', 'giggle', 'swish', 'juicy'] : ['swish', 'juicy', 'tink', 'rip']),
      ending: Phaser.Utils.Array.GetRandom(this.kids ? ['hearts', 'stars', 'confetti'] : ['birds', 'letters', 'splat', 'halves']),
      dead: false
    });
  }

  slice(item, ang) {
    item.hitSwipe = this.swipeId;
    // tough worries crack and bounce before they give way
    if (item.hp > 1) {
      item.hp -= 1;
      this.swipeHits += 1;
      this.bowl.crack();
      this.bowl.thunk(0.4);
      item.vy = Math.min(item.vy, -520 * this.k);
      item.vx *= 0.5;
      const cg = item.g;
      cg.lineStyle(4, 0xffffff, 0.85);
      const a0 = ang + Phaser.Math.FloatBetween(-0.4, 0.4);
      cg.lineBetween(-Math.cos(a0) * item.r * 0.8, -Math.sin(a0) * item.r * 0.8, Math.cos(a0) * item.r * 0.2, Math.sin(a0) * item.r * 0.2);
      cg.lineBetween(Math.cos(a0) * item.r * 0.2, Math.sin(a0) * item.r * 0.2, Math.cos(a0 + 0.6) * item.r * 0.7, Math.sin(a0 + 0.6) * item.r * 0.7);
      this.tweens.add({ targets: item.c, scale: { from: 0.86, to: 1 }, duration: 180, ease: 'Back.Out' });
      UIKit.floatText(this, item.x, item.y - item.r - 10, item.hp === 2 ? Theme.pick('Crack', 'Crack!') : Theme.pick('Again', 'One more!'), Palette.MIST, 26);
      return;
    }
    item.dead = true;
    const pts = item.golden ? 5 : item.kind === 'tough' ? 3 : 1;
    this.score += pts;
    this.sliced += 1;
    this.swipeHits += 1;
    this.scoreText.setText(String(this.score));
    this.tweens.add({ targets: this.scoreText, scale: { from: 1.25, to: 1 }, duration: 200 });
    this.bowl.sliceKind(item.sound, this.swipeHits - 1);
    if (item.kind === 'frost') this.startFrost();
    if (item.kind === 'frenzy') this.startFrenzy();
    try {
      if (navigator.vibrate) navigator.vibrate(12);
    } catch (e) {
      /* not available */
    }

    [0, 1].forEach((side) => {
      const g = this.add.graphics({ x: item.x, y: item.y }).setDepth(19);
      g.fillStyle(item.color, 0.95);
      g.slice(0, 0, item.r, ang + side * Math.PI, ang + Math.PI + side * Math.PI, false);
      g.fillPath();
      if (this.kids) {
        g.lineStyle(4, 0xffffff, 0.9);
        g.beginPath();
        g.arc(0, 0, item.r - 2, ang + side * Math.PI, ang + Math.PI + side * Math.PI, false);
        g.strokePath();
      }
      const perp = ang + Math.PI / 2 + side * Math.PI;
      this.halves.push({
        g,
        vx: item.vx * 0.4 + Math.cos(perp) * 260,
        vy: Math.min(item.vy * 0.3, 0) + Math.sin(perp) * 260 - 120,
        vr: side ? 3 : -3
      });
    });

    this.ending(item);
    this.fx.emit(this.kids ? Theme.CANDY[Phaser.Math.Between(0, 5)] : item.color, item.x, item.y, 14);
    if (item.golden) {
      UIKit.floatText(this, item.x, item.y - 50, '+5');
      this.bowl.sparkle();
    }
    item.c.destroy();
  }

  /** The different ways a sliced worry can leave. */
  ending(item) {
    const { x, y } = item;
    const kind = item.kind !== 'plain' && item.kind !== 'tough' ? 'word' : item.ending;
    const outline = Palette.css(this.kids ? Palette.OUTLINE : 0x1b1530);
    if (kind === 'letters' && item.word.length > 1) {
      const chars = item.word.split('');
      chars.forEach((ch, i) => {
        if (ch === ' ') return;
        const t = UIKit.text(this, x + (i - chars.length / 2) * 14, y, ch, { size: 26, weight: '600', plain: true }).setDepth(26);
        t.setStroke(outline, 4);
        this.tweens.add({
          targets: t,
          x: t.x + Phaser.Math.Between(-120, 120),
          y: y + Phaser.Math.Between(-140, 60),
          angle: Phaser.Math.Between(-240, 240),
          alpha: 0,
          duration: 900,
          ease: 'Quad.Out',
          onComplete: () => t.destroy()
        });
      });
      return;
    }
    if (kind === 'birds') {
      // the worry becomes a couple of birds that fly away
      for (let i = 0; i < 3; i++) {
        const b = this.add.graphics({ x: x + (i - 1) * 22, y: y + (i % 2) * 10 }).setDepth(26);
        const draw = (flap) => {
          b.clear();
          b.lineStyle(4, 0xffffff, 0.95);
          b.beginPath();
          b.moveTo(-14, flap);
          b.lineTo(0, 0);
          b.lineTo(14, flap);
          b.strokePath();
        };
        draw(-8);
        const st = { f: 0 };
        this.tweens.add({ targets: st, f: 1, duration: 160, yoyo: true, repeat: 6, onUpdate: () => draw(-10 + st.f * 16) });
        this.tweens.add({
          targets: b,
          x: b.x + Phaser.Math.Between(60, 200) * (i % 2 ? 1 : -1),
          y: y - Phaser.Math.Between(220, 360),
          alpha: 0,
          duration: 1500,
          ease: 'Sine.Out',
          onComplete: () => b.destroy()
        });
      }
    } else if (kind === 'splat') {
      // paint drops land on the backdrop and fade
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(10, item.r * 1.3);
        this.splatG.fillStyle(item.color, 0.5);
        this.splatG.fillCircle(x + Math.cos(a) * d, y + Math.sin(a) * d, Phaser.Math.Between(5, 16));
      }
      this.splatFade = 1;
    } else if (kind === 'hearts' || kind === 'stars') {
      const glyph = kind === 'hearts' ? '💖' : '⭐';
      for (let i = 0; i < 3; i++) {
        const t = this.add.text(x, y, glyph, { fontSize: '34px' }).setOrigin(0.5).setDepth(26).setResolution(AppRouter.k);
        this.tweens.add({ targets: t, x: x + (i - 1) * 50, y: y - Phaser.Math.Between(80, 150), scale: 1.4, alpha: 0, duration: 1000, ease: 'Sine.Out', onComplete: () => t.destroy() });
      }
    } else if (kind === 'confetti') {
      for (let i = 0; i < 12; i++) {
        const r = this.add.rectangle(x, y, 10, 6, Theme.CANDY[i % 6], 1).setDepth(26);
        const a = Math.random() * Math.PI * 2;
        this.tweens.add({ targets: r, x: x + Math.cos(a) * 120, y: y + Math.sin(a) * 120 + 60, angle: 360, alpha: 0, duration: 900, ease: 'Quad.Out', onComplete: () => r.destroy() });
      }
    }
    const label = this.kids && !item.golden && item.kind === 'plain' ? 'Bye!' : item.word;
    const word = UIKit.text(this, x, y, label, { size: 26, weight: '600', plain: true }).setDepth(26);
    word.setStroke(outline, 5);
    this.tweens.add({ targets: word, y: y - 70, alpha: 0, scale: 1.3, duration: 800, onComplete: () => word.destroy() });
  }

  startFrost() {
    this.slow = 4;
    this.bowl.frost();
    this.tweens.add({ targets: this.frostVeil, fillAlpha: 0.16, duration: 300 });
    UIKit.floatText(this, this.W / 2, 220, Theme.pick('Time slows down', 'Slow motion!'), 0x9fdcff, 40);
  }

  startFrenzy() {
    this.bowl.rise();
    UIKit.floatText(this, this.W / 2, 220, Theme.pick('Flurry!', 'Rainbow party!'), Palette.LOTUS, 40);
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 110, () => this.running && this.spawnItem('plain'));
  }

  combo(n) {
    this.score += n;
    this.scoreText.setText(String(this.score));
    const last = this.trail[this.trail.length - 1] || { x: Layout.W(this) / 2, y: 500 };
    UIKit.floatText(this, Phaser.Math.Clamp(last.x, 160, Layout.W(this) - 160), last.y - 40, `Combo ×${n}  +${n}`, Palette.LOTUS, 38);
    this.bowl.strike(300 + n * 30, 0.12, 2.5);
  }

  update(time, delta) {
    const realDt = Math.min(delta, 50) / 1000;
    // Frost slows the whole world (and the clock) for a few seconds
    if (this.slow > 0) {
      this.slow -= realDt;
      if (this.slow <= 0) this.tweens.add({ targets: this.frostVeil, fillAlpha: 0, duration: 400 });
    }
    const dt = this.slow > 0 ? realDt * 0.35 : realDt;
    const H = Layout.H(this);
    this.rest.tick(delta);
    if (this.splatFade > 0) {
      this.splatFade -= realDt * 0.5;
      this.splatG.setAlpha(Math.max(0, this.splatFade));
      if (this.splatFade <= 0) this.splatG.clear().setAlpha(1);
    }

    const now = this.time.now;
    this.trail = this.trail.filter((p) => now - p.t < 140);
    const g = this.trailG;
    g.clear();
    for (let i = 1; i < this.trail.length; i++) {
      const k = i / this.trail.length;
      const a = this.trail[i - 1];
      const b = this.trail[i];
      g.lineStyle(4 + 14 * k, this.kids ? Palette.SAFFRON : Palette.LOTUS, 0.22 * k);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(2 + 6 * k, 0xffffff, 0.9 * k);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    if (this.running && !this.rest.open) {
      this.elapsed += dt;
      const left = Math.max(0, this.duration - this.elapsed);
      this.timeText.setText(`${Math.ceil(left)} s`);
      if (left <= 10) this.timeText.setColor(Palette.css(Palette.SAFFRON));
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        this.spawnWave();
        this.spawnIn = Math.max(0.8, 1.7 - this.elapsed * 0.012) * Phaser.Math.FloatBetween(0.8, 1.2);
      }
      if (left <= 0) this.end();
    }

    for (const it of this.items) {
      if (it.dead) continue;
      it.vy += this.gravity * dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.c.setPosition(it.x, it.y);
      it.c.rotation += it.vr * dt * (this.kids ? 0.4 : 1);
      if (it.y > H + 150 && it.vy > 0) {
        it.dead = true;
        it.c.destroy();
      }
    }
    this.items = this.items.filter((it) => !it.dead);

    for (const h of this.halves) {
      h.vy += 1300 * dt;
      h.g.x += h.vx * dt;
      h.g.y += h.vy * dt;
      h.g.rotation += h.vr * dt;
      h.g.alpha -= dt * 0.9;
    }
    this.halves = this.halves.filter((h) => {
      if (h.g.alpha > 0 && h.g.y < H + 200) return true;
      h.g.destroy();
      return false;
    });
  }

  end() {
    this.running = false;
    this.swiping = false;
    this.bowl.strike(196, 0.2, 5);
    const isBest = BestScores.submit('slice', this.score);
    if (isBest) this.bowl.fanfare();
    this.time.delayedCall(900, () => {
      UIKit.resultCard(this, {
        eyebrow: "Time's up",
        title: `${this.score} points`,
        lines: [`${this.sliced} ${Theme.pick('worries', 'grumbles')} sliced`, isBest ? 'A new best score' : `Your best is ${BestScores.get('slice')}`],
        primary: ['Play again', () => this.scene.restart()],
        secondary: ['All games', () => this.scene.start('MenuScene')]
      });
    });
  }
}
