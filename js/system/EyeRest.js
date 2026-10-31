/**
 * EyeRest — keeps the games from becoming more screen time.
 * After every few minutes of play it offers a 20-second eye break: the screen
 * goes dark, the player looks at something far away, and a bell calls them back.
 * Play time is counted across all games in this visit.
 */
class EyeRest {
  static INTERVAL = 240; // seconds of play between reminders
  static REST_SECS = 20;

  constructor(scene) {
    this.scene = scene;
    this.open = false;
    this.layer = null;
    this.bowl = scene.registry.get('bowl');
  }

  tick(delta) {
    if (this.open) return;
    const reg = this.scene.registry;
    const s = (reg.get('playSeconds') || 0) + Math.min(delta, 200) / 1000;
    reg.set('playSeconds', s);
    const next = reg.get('nextRest') ?? EyeRest.INTERVAL;
    if (s >= next) {
      reg.set('nextRest', s + EyeRest.INTERVAL);
      this.offer(Math.max(1, Math.round(s / 60)));
    }
  }

  build(color, alpha) {
    const s = this.scene;
    if (this.layer) this.layer.destroy();
    this.layer = s.add.container(0, 0).setDepth(80).setScrollFactor(0);
    const shade = s.add.rectangle(0, 0, Layout.W(s), Layout.H(s), color, alpha).setOrigin(0).setInteractive();
    this.layer.add(shade);
    return this.layer;
  }

  offer(mins) {
    this.open = true;
    const s = this.scene;
    const W = Layout.W(s);
    const H = Layout.H(s);
    const layer = this.build(Palette.NIGHT, 0.92);

    const land = W > H;
    const minsText = `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    layer.add(UIKit.text(s, W / 2, H * (land ? 0.2 : 0.27), Theme.pick('Rest your eyes', 'Eye break time!'), { display: true, size: 62 }));
    layer.add(
      UIKit.text(
        s,
        W / 2,
        H * (land ? 0.3 : 0.33),
        Theme.pick(
          `You have been playing for about ${minsText}.\n\nLook away from the screen at something far off, a window or the far wall, until the bell rings. It takes 20 seconds and lets your eyes relax.`,
          `You have played for ${minsText}. Great job!\n\nLook out of a window or at the far wall until the bell rings. Your eyes will say thank you.`
        ),
        { size: 26, wrap: land ? 900 : 560, lineSpacing: 10, oy: 0, color: Palette.css(Palette.MOON) }
      )
    );
    const restLabel = Theme.pick('Rest my eyes', 'Rest my eyes');
    if (land) {
      layer.add(UIKit.button(s, W / 2 - 220, H * 0.78, restLabel, () => this.rest(), { w: 400, h: 80, accent: Palette.LOTUS }));
      layer.add(UIKit.button(s, W / 2 + 220, H * 0.78, 'Keep playing', () => this.close(), { w: 400, h: 80 }));
    } else {
      layer.add(UIKit.button(s, W / 2, H * 0.64, restLabel, () => this.rest(), { w: 400, h: 80, accent: Palette.LOTUS }));
      layer.add(UIKit.button(s, W / 2, H * 0.64 + 100, 'Keep playing', () => this.close(), { w: 400, h: 80 }));
    }

    layer.setAlpha(0);
    s.tweens.add({ targets: layer, alpha: 1, duration: 600 });
    this.bowl.strike(220, 0.1, 4);
  }

  rest() {
    const s = this.scene;
    const W = Layout.W(s);
    const H = Layout.H(s);
    const layer = this.build(0x000000, 0.97);

    const title = UIKit.text(s, W / 2, H * 0.44, 'Look away now', { display: true, size: 40, color: Palette.css(Palette.MIST), alpha: 0.7 });
    const sub = UIKit.text(s, W / 2, H * 0.49, 'The bell will call you back.', { size: 22, color: Palette.css(Palette.MIST), alpha: 0.5 });
    let left = EyeRest.REST_SECS;
    const count = UIKit.text(s, W / 2, H * 0.56, String(left), { size: 26, color: Palette.css(Palette.MIST), alpha: 0.3 });
    layer.add([title, sub, count]);
    this.bowl.strike(147, 0.2, 8);

    s.time.addEvent({
      delay: 1000,
      repeat: EyeRest.REST_SECS - 1,
      callback: () => {
        left -= 1;
        count.setText(left > 0 ? String(left) : '');
        if (left === 0) this.welcome();
      }
    });
  }

  welcome() {
    const s = this.scene;
    const W = Layout.W(s);
    const H = Layout.H(s);
    this.bowl.strike(220, 0.22, 7);
    const layer = this.build(Palette.NIGHT, 0.92);
    layer.add(UIKit.text(s, W / 2, H * 0.34, 'Welcome back', { display: true, size: 58 }));
    layer.add(
      UIKit.text(s, W / 2, H * 0.4, Theme.pick('Blink a few times. Roll your shoulders. Then play on, or stop here for today.', 'Blink, blink! Roll your shoulders. Play on, or take a break.'), {
        size: 24,
        wrap: 540,
        color: Palette.css(Palette.MIST)
      })
    );
    layer.add(UIKit.button(s, W / 2, H * 0.56, 'Continue playing', () => this.close(), { w: 400, h: 80, accent: Palette.LOTUS }));
    layer.add(
      UIKit.button(
        s,
        W / 2,
        H * 0.56 + 100,
        'Finish for now',
        () => {
          WakeKeeper.release();
          s.scene.start('MenuScene');
        },
        { w: 400, h: 80 }
      )
    );
  }

  close() {
    const layer = this.layer;
    this.layer = null;
    this.scene.tweens.add({
      targets: layer,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        layer.destroy();
        this.open = false;
      }
    });
  }
}
