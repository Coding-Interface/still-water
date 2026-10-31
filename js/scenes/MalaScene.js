/**
 * MalaScene — Breath Mala (Grown-ups, "So Hum") / Breath Beads (Kids, "In… Out…").
 * One tap per out-breath lights one bead. Taps faster than about one breath are
 * ignored with a gentle reminder. Upright: the mala sits above the cue words.
 * Sideways: the mala on the left, the cue words on the right.
 */
class MalaScene extends Phaser.Scene {
  constructor() {
    super('MalaScene');
  }

  init() {
    this.practice = PracticeLibrary.get('mala');
    this.count = 0;
    this.total = 0;
    this.beads = [];
    this.active = false;
    this.lastTap = -99999;
    this.minGap = Theme.kids ? 1600 : 2000;
    this.defaultHint = Theme.pick('Tap anywhere once on each out-breath.', 'Tap once every time you breathe out.');
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.sky = new NightSky(this);

    if (land) {
      this.cx = W * 0.36;
      this.cy = H * 0.52;
      this.R = 236;
    } else {
      this.cx = W / 2;
      this.cy = H * 0.37;
      this.R = 240;
    }

    this.string = this.add.graphics();
    this.beadLayer = this.add.container(0, 0);
    this.glow = this.add.circle(0, 0, 12).setStrokeStyle(3, Palette.SAFFRON, 0.9).setVisible(false);

    this.countText = UIKit.text(this, this.cx, this.cy - 18, '', { display: true, size: 92 });
    this.ofText = UIKit.text(this, this.cx, this.cy + 50, '', { size: 24, color: Palette.css(Palette.MIST) });
    const cueX = land ? W * 0.76 : W / 2;
    const cueY = land ? H * 0.4 : this.sky.horizon + 90;
    this.cueText = UIKit.text(this, cueX, cueY, '', { display: true, size: 64, color: Palette.css(Palette.SAFFRON), alpha: 0 });
    this.cueSub = UIKit.text(this, cueX, cueY + 60, '', { size: 21, color: Palette.css(Palette.MIST) });
    this.hintText = UIKit.text(this, cueX, land ? H * 0.68 : H * 0.88, '', { size: 24, color: Palette.css(Palette.MIST), wrap: land ? 420 : 580 });

    UIKit.leave(this);
    this.input.on('pointerdown', (pointer, over) => {
      if (over && over.length) return;
      this.tap();
    });
    if (this.input.keyboard) {
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', () => this.tap());
    }

    UIKit.intro(this, this.practice, (n) => this.begin(n || (this.kids ? 10 : 27)));
  }

  begin(n) {
    this.total = n;
    this.build();
    this.active = true;
    this.startedAt = this.time.now;
    this.hintText.setText(this.defaultHint);
    WakeKeeper.hold();
    this.bowl.unlock();
    this.bowl.strike(196, 0.22, 7);
    this.cue(true);
  }

  build() {
    const n = this.total;
    const r = n > 30 ? 6.5 : n <= 12 ? 20 : 13;
    this.beadR = r;
    const step = (Math.PI * 2) / (n + 1);

    this.string.lineStyle(this.kids ? 4 : 1.5, 0xffffff, this.kids ? 0.6 : 0.16);
    this.string.strokeCircle(this.cx, this.cy, this.R);

    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + step * (i + 1);
      const bead = this.add.circle(this.cx + Math.cos(a) * this.R, this.cy + Math.sin(a) * this.R, r, this.kids ? 0xffffff : Palette.MIST, this.kids ? 0.55 : 0.45);
      bead.setStrokeStyle(this.kids ? 3 : 1, this.kids ? Palette.OUTLINE : Palette.MOON, this.kids ? 0.5 : 0.25);
      bead.litColor = this.kids ? Theme.CANDY[i % Theme.CANDY.length] : Palette.LOTUS;
      this.beadLayer.add(bead);
      this.beads.push(bead);
    }

    const meruY = this.cy - this.R;
    const meruR = Math.max(12, r * 1.9);
    this.string.lineStyle(2, Palette.SAFFRON, 0.8);
    for (let k = -2; k <= 2; k++) {
      this.string.lineBetween(this.cx, meruY - meruR, this.cx + k * 6, meruY - meruR - 36);
    }
    this.add.circle(this.cx, meruY, meruR, Palette.SAFFRON, 1);

    this.ofText.setText(`of ${n} breaths`);
    this.countText.setText('0');
    this.glow.setRadius(r + 7).setVisible(true);
    this.moveGlow();
    this.tweens.add({ targets: this.glow, scale: 1.25, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  moveGlow() {
    const bead = this.beads[this.count];
    if (bead) this.glow.setPosition(bead.x, bead.y);
  }

  /** Gentle cue: the in-word for about four seconds, the out-word for about six. */
  cue(isIn) {
    if (!this.active) return;
    this.cueText.setText(isIn ? this.practice.cueIn : this.practice.cueOut);
    this.cueSub.setText(isIn ? 'breathing in' : 'breathing out');
    this.cueText.setAlpha(0);
    this.tweens.add({ targets: this.cueText, alpha: 0.95, duration: 1200, yoyo: true, hold: isIn ? 1600 : 3600 });
    this.time.delayedCall(isIn ? 4000 : 6000, () => this.cue(!isIn));
  }

  tap() {
    if (!this.active) return;
    const now = this.time.now;
    if (now - this.lastTap < this.minGap) {
      this.showHint(Theme.pick('One bead for each breath. Let it be slow.', 'Slow down a little. One bead per breath.'));
      return;
    }
    this.lastTap = now;

    const bead = this.beads[this.count];
    bead.setFillStyle(bead.litColor, 1);
    bead.setStrokeStyle(this.kids ? 3 : 1, 0xffffff, 0.8);
    this.tweens.add({ targets: bead, scale: 1.6, duration: 240, yoyo: true });
    this.count += 1;
    this.countText.setText(String(this.count));
    if (this.kids) this.bowl.chime([523.25, 587.33, 659.25, 783.99, 880][this.count % 5], 0.07);
    else this.bowl.tick();

    if (this.count >= this.total) {
      this.finish();
      return;
    }
    if (this.count % 27 === 0) this.bowl.strike(196, 0.14, 5);
    this.moveGlow();
  }

  showHint(text) {
    this.hintText.setText(text).setColor(Palette.css(Palette.SAFFRON));
    if (this.hintTimer) this.hintTimer.remove();
    this.hintTimer = this.time.delayedCall(2600, () => {
      this.hintText.setText(this.defaultHint).setColor(Palette.css(Palette.MIST));
    });
  }

  finish() {
    this.active = false;
    this.glow.setVisible(false);
    this.cueText.setAlpha(0);
    this.cueSub.setText('');
    this.hintText.setText(Theme.pick('The mala is complete.', 'You lit every bead!'));
    this.bowl.strike(147, 0.25, 9);
    if (this.kids) this.bowl.fanfare();
    const seconds = (this.time.now - this.startedAt) / 1000;
    this.time.delayedCall(2800, () => {
      this.scene.start('EndScene', {
        id: 'mala',
        seconds,
        lines: [`${this.total} beads · ${this.total} breaths`, Theme.pick(`${UIKit.duration(seconds)} with So Hum`, `${UIKit.duration(seconds)} of calm breathing`)]
      });
    });
  }
}
