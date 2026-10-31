/**
 * HudScene — runs on top of every scene: the sound toggle and, where the browser
 * allows it, a full-screen toggle. Hidden on the splash screen.
 */
class HudScene extends Phaser.Scene {
  constructor() {
    super('HudScene');
  }

  create() {
    const W = Layout.W(this);
    this.bowl = this.registry.get('bowl');

    this.soundBtn = this.iconButton(W - 52, 62, 'Sound', () => AppRouter.toggleSound());
    this.fsBtn = AppRouter.canFullscreen() ? this.iconButton(W - 122, 62, 'Full screen', () => AppRouter.toggleFullscreen()) : null;
    this.refresh();

    const onSound = () => this.refresh();
    const onFs = () => this.refresh();
    const onScene = (key) => this.setShown(key !== 'SplashScene');
    this.game.events.on('sw:sound', onSound);
    this.game.events.on('sw:fullscreen', onFs);
    this.game.events.on('sw:scene', onScene);
    this.events.once('shutdown', () => {
      this.game.events.off('sw:sound', onSound);
      this.game.events.off('sw:fullscreen', onFs);
      this.game.events.off('sw:scene', onScene);
    });
    this.setShown(!!AppRouter.current && AppRouter.current !== 'SplashScene');
  }

  iconButton(x, y, name, onTap) {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    const icon = this.add.graphics();
    const draw = (hover) => {
      bg.clear();
      bg.fillStyle(Palette.NIGHT, hover ? 0.85 : 0.6);
      bg.fillCircle(0, 0, 28);
      bg.lineStyle(1.5, Palette.MOON, hover ? 0.6 : 0.28);
      bg.strokeCircle(0, 0, 28);
    };
    draw(false);
    c.add([bg, icon]);
    c.icon = icon;
    c.name = name;
    c.setSize(64, 64);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerup', () => onTap());
    return c;
  }

  refresh() {
    HudScene.drawSpeaker(this.soundBtn.icon, !this.bowl.muted);
    if (this.fsBtn) HudScene.drawFullscreen(this.fsBtn.icon, AppRouter.isFullscreen());
  }

  setShown(on) {
    [this.soundBtn, this.fsBtn].forEach((b) => {
      if (!b) return;
      b.setVisible(on);
      if (on) b.setInteractive();
      else b.disableInteractive();
    });
  }

  static drawSpeaker(g, on) {
    g.clear();
    g.fillStyle(Palette.MOON, 1);
    g.fillRect(-14, -6, 8, 12);
    g.fillPoints(
      [new Phaser.Math.Vector2(-7, -6), new Phaser.Math.Vector2(3, -14), new Phaser.Math.Vector2(3, 14), new Phaser.Math.Vector2(-7, 6)],
      true
    );
    if (on) {
      g.lineStyle(2.5, Palette.MOON, 1);
      g.beginPath();
      g.arc(4, 0, 8, -0.75, 0.75);
      g.strokePath();
      g.beginPath();
      g.arc(4, 0, 14, -0.75, 0.75);
      g.strokePath();
    } else {
      g.lineStyle(3, Palette.LOTUS, 1);
      g.lineBetween(9, -7, 19, 7);
      g.lineBetween(19, -7, 9, 7);
    }
  }

  static drawFullscreen(g, isFull) {
    g.clear();
    g.lineStyle(2.5, Palette.MOON, 1);
    const a = 12;
    const b = 5;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    corners.forEach(([sx, sy]) => {
      const cx = sx * a;
      const cy = sy * a;
      if (!isFull) {
        g.lineBetween(cx, cy, cx - sx * b, cy);
        g.lineBetween(cx, cy, cx, cy - sy * b);
      } else {
        const ix = sx * (a - b);
        const iy = sy * (a - b);
        g.lineBetween(ix, iy, ix + sx * b, iy);
        g.lineBetween(ix, iy, ix, iy + sy * b);
      }
    });
  }
}
