/**
 * SplashScene — the title screen. A lotus rises out of the lake and opens.
 * The first time, it asks "Who's playing today?" (Kids or Grown-ups); after that
 * it simply waits for a tap. That first tap also starts the sound (required by
 * phones and browsers) and then offers full screen.
 */
class SplashScene extends Phaser.Scene {
  constructor() {
    super('SplashScene');
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.bowl = this.registry.get('bowl');
    this.started = false;
    this.sky = new NightSky(this);
    const calm = this.sky.calm;

    for (let i = 0; i < 18; i++) {
      const f = this.add.circle(
        Phaser.Math.Between(40, W - 40),
        Phaser.Math.Between(H * 0.4, this.sky.horizon - 20),
        Phaser.Math.FloatBetween(2, 3.6),
        Theme.kids ? 0xffffff : Palette.SAFFRON,
        0
      );
      this.tweens.add({
        targets: f,
        alpha: Phaser.Math.FloatBetween(0.5, 0.9),
        duration: Phaser.Math.Between(1400, 2600),
        delay: Phaser.Math.Between(0, 2400),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });
      if (!calm) {
        this.tweens.add({
          targets: f,
          x: f.x + Phaser.Math.Between(-60, 60),
          y: f.y + Phaser.Math.Between(-50, 30),
          duration: Phaser.Math.Between(5000, 9000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
      }
    }

    const restY = this.sky.horizon + 14;
    this.lotus = new Lotus(this, W / 2, restY + 70, land ? 110 : 130).setAlpha(0);
    this.lotus.setBloom(0);
    this.tweens.add({ targets: this.lotus, alpha: 1, y: restY, delay: 250, duration: 1700, ease: 'Sine.Out' });
    const bloom = { b: 0 };
    this.tweens.add({ targets: bloom, b: 1, delay: 700, duration: 2600, ease: 'Sine.InOut', onUpdate: () => this.lotus.setBloom(bloom.b) });
    this.time.addEvent({ delay: 2800, loop: true, callback: () => this.sky.ripple(W / 2, restY + 10, Palette.LOTUS, 4) });

    const rise = (obj, delay) => {
      obj.setAlpha(0);
      obj.y += 18;
      this.tweens.add({ targets: obj, alpha: 1, y: obj.y - 18, delay, duration: 900, ease: 'Sine.Out' });
      return obj;
    };

    rise(UIKit.text(this, W / 2, H * (land ? 0.2 : 0.245), 'Still Water', { display: true, size: land ? 104 : 112 }), 500);
    rise(
      UIKit.text(this, W / 2, H * (land ? 0.315 : 0.315), Theme.pick('Let off steam. Find your calm.', 'Play, pop and feel calm!'), {
        display: true,
        size: 34,
        color: Palette.css(Theme.pick(Palette.LOTUS, Palette.SAFFRON))
      }),
      900
    );
    rise(
      UIKit.text(this, W / 2, H * (land ? 0.38 : 0.36), 'Stress-release games, calm play and breathing for kids and grown-ups.', {
        size: 22,
        wrap: land ? 900 : 600,
        color: Palette.css(Palette.MIST)
      }),
      1150
    );

    if (Theme.chosen) this.makeTapPrompt();
    else this.makeChooser();

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.begin());
      this.input.keyboard.on('keydown-ENTER', () => this.begin());
    }
    if (typeof BootLoader !== 'undefined') BootLoader.hide();
  }

  makeTapPrompt() {
    const { W, H, land } = Layout.info(this);
    const y = H * (land ? 0.855 : 0.855);
    const pill = this.add.container(W / 2, y);
    const bg = this.add.graphics();
    bg.fillStyle(Theme.kids ? Palette.NIGHT : Palette.LOTUS, Theme.kids ? 0.9 : 0.14);
    bg.fillRoundedRect(-200, -42, 400, 84, 42);
    bg.lineStyle(Theme.kids ? 4 : 2, Theme.kids ? Palette.SAFFRON : Palette.LOTUS, Theme.kids ? 1 : 0.7);
    bg.strokeRoundedRect(-200, -42, 400, 84, 42);
    pill.add([bg, UIKit.text(this, 0, 0, 'Tap anywhere to begin', { size: 27, weight: '600', color: Palette.css(Theme.kids ? Palette.MOON : Palette.LOTUS) })]);
    pill.setAlpha(0);
    this.tweens.add({
      targets: pill,
      alpha: 1,
      delay: 1500,
      duration: 700,
      onComplete: () => {
        if (!this.sky.calm) this.tweens.add({ targets: pill, scale: 1.04, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      }
    });

    const sw = UIKit.button(
      this,
      W / 2,
      y + (land ? 66 : 92),
      `Playing as ${Theme.label()}  ·  Switch`,
      () => {
        this.started = true;
        AppRouter.setProfile(Theme.kids ? 'adults' : 'kids');
      },
      { w: 380, h: 52, size: 20, fillAlpha: Theme.kids ? 0.8 : 0.06, accent: Palette.MIST }
    );
    sw.setAlpha(0);
    this.tweens.add({ targets: sw, alpha: 1, delay: 1800, duration: 600 });

    this.input.on('pointerup', (p, over) => {
      if (over && over.length) return;
      this.begin();
    });
  }

  makeChooser() {
    const { W, H, land } = Layout.info(this);
    const y = H * (land ? 0.835 : 0.83);
    const ask = UIKit.text(this, W / 2, y - (land ? 92 : 112), "Who's playing today?", { display: true, size: 34 });
    ask.setAlpha(0);
    this.tweens.add({ targets: ask, alpha: 1, delay: 1400, duration: 600 });

    const cards = [
      { id: 'kids', title: 'Kids', sub: 'Bright and playful', x: W / 2 - 170 },
      { id: 'adults', title: 'Grown-ups', sub: 'Calm and quiet', x: W / 2 + 170 }
    ];
    cards.forEach((c, i) => {
      const w = 310;
      const h = 124;
      const box = this.add.container(c.x, y);
      const bg = this.add.graphics();
      const kidsCard = c.id === 'kids';
      const accent = kidsCard ? 0xffc533 : Palette.LOTUS;
      const draw = (hover) => {
        bg.clear();
        bg.fillStyle(0x000000, 0.25);
        bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 28);
        bg.fillStyle(kidsCard ? 0x2b3b86 : Palette.NIGHT, hover ? 1 : 0.9);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
        bg.lineStyle(3, accent, hover ? 1 : 0.75);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 28);
      };
      draw(false);
      const icon = this.add.graphics({ x: -w / 2 + 62, y: 4 });
      if (kidsCard) {
        icon.fillStyle(0xff6fa8, 1);
        icon.fillEllipse(-8, -14, 40, 46);
        icon.fillStyle(0xffc533, 1);
        icon.fillEllipse(16, -4, 34, 40);
        icon.lineStyle(2, 0xffffff, 0.9);
        icon.lineBetween(-8, 9, -2, 34);
        icon.lineBetween(16, 16, 4, 34);
      } else {
        for (let k = -2; k <= 2; k++) {
          const a = Phaser.Math.DegToRad(-90 + k * 28);
          icon.fillStyle(k === 0 ? Palette.LOTUS_PALE : Palette.LOTUS, 1);
          icon.fillEllipse(Math.cos(a) * 14, 10 + Math.sin(a) * 14, 14, 32);
        }
        icon.fillStyle(Palette.LEAF, 1);
        icon.fillEllipse(0, 22, 58, 10);
      }
      const t1 = UIKit.text(this, -w / 2 + 112, -16, c.title, {
        size: 32,
        weight: '600',
        ox: 0,
        align: 'left',
        color: '#ffffff',
        plain: true
      });
      t1.setFontFamily(kidsCard ? Theme.KIDS.FONT_DISPLAY : Theme.ADULT ? Theme.ADULT.FONT_DISPLAY : Palette.FONT_DISPLAY);
      const t2 = UIKit.text(this, -w / 2 + 112, 22, c.sub, { size: 19, ox: 0, align: 'left', color: '#c9d6e2', plain: true });
      box.add([bg, icon, t1, t2]);
      box.setSize(w, h);
      box.setInteractive({ useHandCursor: true });
      box.on('pointerover', () => draw(true));
      box.on('pointerout', () => draw(false));
      box.on('pointerup', () => this.choose(c.id));
      box.setAlpha(0);
      box.y += 20;
      this.tweens.add({ targets: box, alpha: 1, y, delay: 1500 + i * 150, duration: 600, ease: 'Back.Out' });
    });
  }

  choose(profile) {
    if (this.started) return;
    if (profile !== Theme.profile) Theme.apply(profile);
    Theme.save(profile);
    this.begin(true);
  }

  begin(fromChooser) {
    if (this.started) return;
    if (!Theme.chosen && !fromChooser) return;
    this.started = true;
    this.bowl.unlock();
    this.time.delayedCall(60, () => {
      this.bowl.strike(196, 0.22, 7);
      this.bowl.strike(294, 0.07, 5);
      if (Theme.kids) this.bowl.sparkle();
    });
    const { W } = Layout.info(this);
    this.sky.ripple(W / 2, this.sky.horizon + 24, Palette.SAFFRON, 6);
    this.tweens.add({ targets: this.lotus, scale: 1.1, duration: 420, yoyo: true, ease: 'Sine.InOut' });
    FullscreenPrompt.offer();
    const c = Phaser.Display.Color.IntegerToRGB(Palette.NIGHT);
    this.cameras.main.fadeOut(700, c.r, c.g, c.b);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
  }
}
