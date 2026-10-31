/**
 * CloudScene — Passing Thoughts (Grown-ups) / Thought Clouds (Kids).
 * Vipassana-style noting. A breath orb pulses (5 s in, 5 s out) while thoughts
 * drift across the sky. Tap a thought to name it and let it go, or simply let it
 * pass. Cloud lanes and text positions adapt to either orientation.
 */
class CloudScene extends Phaser.Scene {
  constructor() {
    super('CloudScene');
  }

  init() {
    this.practice = PracticeLibrary.get('clouds');
    this.duration = this.practice.seconds;
    this.running = false;
    this.elapsed = 0;
    this.noted = 0;
    this.passed = 0;
    this.clouds = [];
    this.nextSpawn = 2;
    this.lastLane = -1;
    this.lastHalf = -1;
    this.deck = PracticeLibrary.shuffledThoughts();
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.land = land;
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.sky = new NightSky(this);

    this.orbX = W / 2;
    this.orbY = this.sky.horizon - (land ? 80 : 100);
    this.orb = this.add.graphics();
    this.cue = UIKit.text(this, W / 2, this.sky.horizon + (land ? 46 : 70), '', {
      display: true,
      size: 34,
      color: Palette.css(Palette.MOON),
      alpha: 0.9
    });
    this.noteText = UIKit.text(this, W / 2, H * (land ? 0.8 : 0.79), '', {
      size: 24,
      color: Palette.css(Palette.SAFFRON),
      alpha: 0
    });
    UIKit.text(this, W / 2, H * (land ? 0.86 : 0.85), Theme.pick('Tap a thought to name it, or let it drift.', 'Tap a thought cloud, or just watch it float away.'), {
      size: 23,
      color: Palette.css(Palette.MIST)
    });

    const barW = 480;
    const barY = H * (land ? 0.92 : 0.91);
    this.add.rectangle(W / 2, barY, barW, 4, 0xffffff, this.kids ? 0.4 : 0.12);
    this.bar = this.add.rectangle(W / 2 - barW / 2, barY, barW, 4, Palette.SAFFRON, 0.9).setOrigin(0, 0.5);
    this.bar.scaleX = 0;
    this.barLabel = UIKit.text(this, W / 2, H * (land ? 0.96 : 0.94), UIKit.duration(this.duration) + ' left', {
      size: 19,
      color: Palette.css(Palette.MIST)
    });

    UIKit.leave(this);
    this.drawOrb(0);
    UIKit.intro(this, this.practice, () => this.begin());
  }

  begin() {
    WakeKeeper.hold();
    this.bowl.unlock();
    this.bowl.strike(196, 0.2, 7);
    this.running = true;
  }

  update(time, delta) {
    if (!this.running) return;
    const dt = Math.min(delta, 100) / 1000;
    this.elapsed += dt;

    const half = Math.floor(this.elapsed / 5);
    if (half !== this.lastHalf) {
      this.lastHalf = half;
      const inhale = half % 2 === 0;
      this.cue.setText(inhale ? 'breathe in' : 'breathe out');
      this.bowl.swell(5, inhale);
    }
    const ph = (this.elapsed % 10) / 10;
    const ease = Phaser.Math.Easing.Sine.InOut;
    this.drawOrb(ph < 0.5 ? ease(ph * 2) : 1 - ease((ph - 0.5) * 2));

    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0 && this.elapsed < this.duration - 14) {
      this.spawn();
      this.nextSpawn = Phaser.Math.FloatBetween(5, 8);
    }
    this.clouds.forEach((c) => c.drift(dt));
    this.clouds = this.clouds.filter((c) => !c.done);

    const left = Math.max(0, this.duration - this.elapsed);
    this.bar.scaleX = Math.min(1, this.elapsed / this.duration);
    this.barLabel.setText(left > 0 ? UIKit.duration(Math.ceil(left)) + ' left' : '');

    if (this.elapsed >= this.duration) this.finish();
  }

  spawn() {
    const H = Layout.H(this);
    const lanes = this.land ? [0.15, 0.29, 0.43] : [0.13, 0.22, 0.31, 0.4];
    let lane = Phaser.Math.Between(0, lanes.length - 1);
    if (lane === this.lastLane) lane = (lane + 2) % lanes.length;
    this.lastLane = lane;
    if (this.deck.length === 0) this.deck = PracticeLibrary.shuffledThoughts();
    const [thought, category] = this.deck.pop();
    const cloud = new ThoughtCloud(
      this,
      -200,
      H * lanes[lane],
      thought,
      category,
      Phaser.Math.FloatBetween(32, 46),
      (c) => this.onNoted(c),
      () => (this.passed += 1)
    );
    this.clouds.push(cloud);
  }

  onNoted(cloud) {
    this.noted += 1;
    this.bowl.tick();
    this.noteText.setText(Theme.pick(`Noted: ${cloud.category}. Back to the breath.`, `A ${cloud.category} thought! Back to breathing.`));
    if (this.kids) this.bowl.sparkle(0.4);
    this.tweens.killTweensOf(this.noteText);
    this.noteText.setAlpha(0);
    this.tweens.add({ targets: this.noteText, alpha: 1, duration: 400, hold: 2200, yoyo: true });
  }

  drawOrb(fill) {
    const g = this.orb;
    g.clear();
    const r = 44 + 40 * fill;
    const core = this.kids ? 0xffffff : Palette.SAFFRON;
    for (let k = 3; k >= 1; k--) {
      g.fillStyle(core, this.kids ? 0.12 : 0.05);
      g.fillCircle(this.orbX, this.orbY, r + k * 20 * (0.6 + fill));
    }
    g.fillStyle(core, 0.85);
    g.fillCircle(this.orbX, this.orbY, r * 0.55);
    g.lineStyle(this.kids ? 4 : 2, 0xffffff, this.kids ? 0.9 : 0.5);
    g.strokeCircle(this.orbX, this.orbY, r);
  }

  finish() {
    this.running = false;
    this.clouds.forEach((c) => c.fadeAway());
    this.cue.setText(Theme.pick('rest', 'all done'));
    this.bowl.strike(147, 0.25, 9);
    this.time.delayedCall(2800, () => {
      this.scene.start('EndScene', {
        id: 'clouds',
        seconds: this.duration,
        lines: [
          `${this.noted} ${this.noted === 1 ? 'thought' : 'thoughts'} noticed and named`,
          `${this.passed} drifted past on their own`
        ]
      });
    });
  }
}
