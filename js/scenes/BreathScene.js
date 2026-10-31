/**
 * BreathScene — guided breathing for both profiles.
 * Grown-ups watch a lotus open and close; kids watch a smiling balloon fill up
 * and shrink. The player holds the screen (or Space) while the breath fills or
 * is held full, and lets go while it empties. Each finished round lights a dot.
 * Upright: words above the circle. Sideways: words on the left, circle on the right.
 */
class BreathScene extends Phaser.Scene {
  constructor() {
    super('BreathScene');
  }

  init(data) {
    this.practice = PracticeLibrary.get(data && data.id);
    this.running = false;
    this.holding = false;
    this.scores = [];
    this.cycle = 0;
    this.hint = '';
  }

  create() {
    const { W, H, land } = Layout.info(this);
    const p = this.practice;
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.sky = new NightSky(this);

    if (land) {
      this.cx = W * 0.64;
      this.cy = this.sky.horizon - 50;
      this.rMin = 96;
      this.rMax = 186;
    } else {
      this.cx = W / 2;
      this.cy = this.sky.horizon - 40;
      this.rMin = 110;
      this.rMax = 220;
    }

    this.ring = this.add.graphics();
    if (this.kids) this.guideObj = new Balloon(this, this.cx, this.cy + this.rMax * 0.5, land ? 100 : 120, Palette.LOTUS);
    else this.guideObj = new Lotus(this, this.cx, this.sky.horizon + 10, land ? 86 : 100);

    const tx = land ? W * 0.25 : W / 2;
    this.phaseText = UIKit.text(this, tx, land ? H * 0.34 : H * 0.19, '', { display: true, size: land ? 58 : 66 });
    this.countText = UIKit.text(this, tx, land ? H * 0.46 : H * 0.265, '', { size: 42, weight: '500', color: Palette.css(Palette.SAFFRON) });
    this.hintText = UIKit.text(this, tx, land ? H * 0.6 : H * 0.845, '', { size: 24, color: Palette.css(Palette.MIST), wrap: land ? 440 : 580 });

    this.dots = [];
    const span = land ? 380 : 560;
    const gap = Math.min(36, span / p.cycles);
    const dotY = land ? H * 0.74 : H * 0.905;
    const startX = tx - ((p.cycles - 1) * gap) / 2;
    for (let i = 0; i < p.cycles; i++) this.dots.push(this.add.circle(startX + i * gap, dotY, 7, Palette.MOON, 0.2));
    UIKit.text(this, tx, land ? H * 0.79 : H * 0.94, `${p.cycles} rounds`, { size: 19, color: Palette.css(Palette.MIST), alpha: 0.85 });

    UIKit.leave(this);
    this.bindInput();
    this.drawRing(0, 0);
    this.guideObj.setBloom(0.05);

    UIKit.intro(this, p, () => this.settle());
  }

  bindInput() {
    this.input.on('pointerdown', (pointer, over) => {
      if (over && over.length) return;
      this.holding = true;
    });
    const release = () => {
      this.holding = false;
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    if (this.input.keyboard) {
      const space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      space.on('down', () => (this.holding = true));
      space.on('up', release);
    }
  }

  settle() {
    WakeKeeper.hold();
    this.bowl.unlock();
    this.bowl.strike(196, 0.22, 7);
    this.phaseText.setText(Theme.pick('Settle in', 'Get comfy'));
    this.setHint(Theme.pick('Sit tall. Let your shoulders drop.', 'Sit nice and tall. Wiggle, then be still.'));
    let n = 3;
    this.countText.setText(String(n));
    this.time.addEvent({
      delay: 1000,
      repeat: 2,
      callback: () => {
        n -= 1;
        this.countText.setText(n > 0 ? String(n) : '');
        if (n === 0) this.beginRounds();
      }
    });
  }

  beginRounds() {
    this.cycle = 0;
    this.running = true;
    this.startPhase(0);
  }

  startPhase(i) {
    const ph = this.practice.phases[i];
    this.phaseIndex = i;
    this.phaseT = 0;
    if (i === 0) {
      this.matched = 0;
      this.total = 0;
    }
    this.phaseText.setText(ph.label).setAlpha(0.3);
    this.tweens.add({ targets: this.phaseText, alpha: 1, duration: 600 });
    this.sky.ripple(this.cx, this.sky.horizon + 16, ph.type === 'in' ? Palette.LOTUS : Palette.MOON);
    if (ph.type === 'in') this.bowl.swell(ph.secs, true);
    if (ph.type === 'out') this.bowl.swell(ph.secs, false);
  }

  update(time, delta) {
    if (!this.running) return;
    const dt = Math.min(delta, 100) / 1000;
    const phases = this.practice.phases;
    const ph = phases[this.phaseIndex];
    this.phaseT += dt;
    const u = Phaser.Math.Clamp(this.phaseT / ph.secs, 0, 1);

    const fill = this.fillFor(ph.type, u);
    this.guideObj.setBloom(0.06 + 0.94 * fill);
    this.drawRing(fill, u);
    this.countText.setText(String(Math.max(1, Math.ceil(ph.secs - this.phaseT))));

    const expected = ph.type === 'in' || ph.type === 'holdFull';
    if (this.phaseT > 0.6) {
      this.total += 1;
      if (this.holding === expected) this.matched += 1;
    }
    this.setHint(this.holding === expected ? Theme.pick('In rhythm. Keep following the circle.', 'Great job! Keep going.') : this.guideFor(ph.type));

    if (this.phaseT >= ph.secs) {
      const next = this.phaseIndex + 1;
      if (next >= phases.length) this.completeRound();
      else this.startPhase(next);
    }
  }

  fillFor(type, u) {
    const ease = Phaser.Math.Easing.Sine.InOut;
    switch (type) {
      case 'in':
        return ease(u);
      case 'holdFull':
        return 1;
      case 'out':
        return 1 - ease(u);
      default:
        return 0;
    }
  }

  guideFor(type) {
    switch (type) {
      case 'in':
        return 'Hold the screen as you breathe in.';
      case 'holdFull':
        return 'Keep holding through the full pause.';
      case 'out':
        return 'Let go as you breathe out.';
      default:
        return 'Stay released through the empty pause.';
    }
  }

  setHint(text) {
    if (text === this.hint) return;
    this.hint = text;
    this.hintText.setText(text);
  }

  drawRing(fill, u) {
    const g = this.ring;
    g.clear();
    g.lineStyle(this.kids ? 3 : 1, 0xffffff, this.kids ? 0.4 : 0.12);
    g.strokeCircle(this.cx, this.cy, this.rMin);
    g.strokeCircle(this.cx, this.cy, this.rMax);

    const r = this.rMin + (this.rMax - this.rMin) * fill;
    g.fillStyle(this.kids ? 0xffffff : Palette.LOTUS, (this.kids ? 0.12 : 0.05) + 0.06 * fill + (this.holding ? 0.05 : 0));
    g.fillCircle(this.cx, this.cy, r);
    g.lineStyle(this.kids ? 4 : 3, this.kids ? 0xffffff : Palette.MOON, this.kids ? 0.8 : 0.55);
    g.strokeCircle(this.cx, this.cy, r);

    if (this.running) {
      g.lineStyle(this.kids ? 6 : 4, Palette.SAFFRON, 0.9);
      g.beginPath();
      g.arc(this.cx, this.cy, this.rMax + 22, -Math.PI / 2, -Math.PI / 2 + u * Math.PI * 2, false);
      g.strokePath();
    }
  }

  completeRound() {
    const score = this.total ? this.matched / this.total : 1;
    this.scores.push(score);
    const dot = this.dots[this.cycle];
    if (dot) {
      dot.setFillStyle(score >= 0.75 ? (this.kids ? Palette.SAFFRON : Palette.LOTUS) : Palette.MIST, score >= 0.75 ? 1 : 0.7);
      this.tweens.add({ targets: dot, scale: 1.6, duration: 260, yoyo: true });
      if (this.kids && score >= 0.75) this.bowl.sparkle(0.5);
    }
    this.cycle += 1;
    if (this.cycle >= this.practice.cycles) this.finish();
    else this.startPhase(0);
  }

  finish() {
    this.running = false;
    const p = this.practice;
    this.phaseText.setText(Theme.pick('Rest', 'All done!'));
    this.countText.setText('');
    this.setHint(Theme.pick('Let the breath find its own pace.', 'Notice how calm your body feels.'));
    this.drawRing(1, 0);
    const counter = { b: this.guideObj.bloom };
    this.tweens.add({ targets: counter, b: 1, duration: 1500, onUpdate: () => this.guideObj.setBloom(counter.b) });
    this.bowl.strike(147, 0.25, 9);

    const avg = this.scores.reduce((a, b) => a + b, 0) / Math.max(1, this.scores.length);
    const seconds = p.cycles * p.phases.reduce((a, ph) => a + ph.secs, 0);
    this.time.delayedCall(3000, () => {
      this.scene.start('EndScene', {
        id: p.id,
        seconds,
        lines: [`${p.cycles} slow breaths · ${UIKit.duration(seconds)}`, `${Math.round(avg * 100)}% in rhythm with the guide`]
      });
    });
  }
}
