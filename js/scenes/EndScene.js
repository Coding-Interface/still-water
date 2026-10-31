/**
 * EndScene — a quiet close after a breath practice: what was done, a short
 * teaching (or a calm tip for kids), and what next.
 * Upright: everything stacked around the lotus. Sideways: flower left, words right.
 */
class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  init(data) {
    this.data0 = data || {};
  }

  snapshot() {
    return Object.assign({}, this.data0, { recorded: true });
  }

  create() {
    const data = this.data0;
    const { W, H, land } = Layout.info(this);
    const kids = Theme.kids;
    const practice = PracticeLibrary.get(data.id);
    // Record once, even if the screen is rotated and the scene restarts.
    const progress = data.recorded ? ProgressStore.read() : ProgressStore.record(data.seconds || 0);
    this.data0.recorded = true;
    WakeKeeper.release();

    const sky = new NightSky(this, land ? { sunX: W * 0.24, sunY: H * 0.18 } : {});
    const fx = land ? W * 0.24 : W / 2;
    const flower = kids ? new Balloon(this, fx, sky.horizon + 40, land ? 100 : 120, Palette.LOTUS) : new Lotus(this, fx, sky.horizon + 10, 110);
    const counter = { b: 0 };
    this.tweens.add({ targets: counter, b: 1, duration: 3200, ease: 'Sine.InOut', onUpdate: () => flower.setBloom(counter.b) });
    this.time.delayedCall(600, () => sky.ripple(fx, sky.horizon + 16, Palette.LOTUS, 4));
    if (kids) this.time.delayedCall(800, () => this.registry.get('bowl').sparkle());

    const tx = land ? W * 0.62 : W / 2;
    const wrap = land ? 640 : 580;
    const y = (p, l) => H * (land ? l : p);

    UIKit.text(this, tx, y(0.12, 0.16), Theme.pick('Rest here a moment', 'You did it!'), { display: true, size: 58 });
    UIKit.text(this, tx, y(0.175, 0.25), Theme.pick('Notice how your body feels now, before you move on.', 'How does your body feel now? Calm and cosy?'), {
      size: 23,
      color: Palette.css(Palette.MIST),
      wrap
    });

    (data.lines || []).forEach((line, i) => {
      UIKit.text(this, tx, y(0.245, 0.34) + i * 40, line, {
        size: 26,
        weight: i === 0 ? '500' : 'normal',
        color: Palette.css(i === 0 ? Palette.SAFFRON : Palette.MOON)
      });
    });

    UIKit.text(this, tx, y(0.735, 0.55), practice.teaching.text, { display: true, size: 30, wrap: land ? 620 : 600, lineSpacing: 10 });
    UIKit.text(this, tx, y(0.8, 0.66), practice.teaching.source.toUpperCase(), {
      size: 18,
      weight: '600',
      color: Palette.css(Palette.MIST),
      spacing: 2
    });

    const by = y(0.875, 0.79);
    const again = UIKit.button(this, tx - 160, by, Theme.pick('Sit again', 'Again!'), () => this.scene.start(practice.scene, { id: practice.id }), {
      w: 290,
      h: 76,
      accent: Palette.LOTUS
    });
    const menu = UIKit.button(this, tx + 160, by, 'All practices', () => this.scene.start('MenuScene'), { w: 290, h: 76 });
    [again, menu].forEach((b) => {
      b.setAlpha(0);
      this.tweens.add({ targets: b, alpha: 1, delay: 1600, duration: 600 });
    });

    UIKit.text(
      this,
      tx,
      y(0.945, 0.92),
      `${progress.sits} ${progress.sits === 1 ? 'sit' : 'sits'} · ${Math.max(1, Math.round(progress.minutes))} min of ${Theme.pick('stillness', 'calm')} so far`,
      { size: 20, color: Palette.css(Palette.MIST) }
    );
  }
}
