/**
 * ThoughtCloud — a drifting thought. Tap to note it (it names its category and
 * dissolves), or leave it to drift off the far side on its own.
 */
class ThoughtCloud extends Phaser.GameObjects.Container {
  constructor(scene, x, y, thought, category, speed, onNoted, onPassed) {
    super(scene, x, y);
    this.category = category;
    this.speed = speed;
    this.done = false;
    this.onNoted = onNoted;
    this.onPassed = onPassed;
    this.wobble = Math.random() * Math.PI * 2;
    this.baseY = y;

    const puffs = [
      [-100, 12, 120, 78],
      [-38, -16, 150, 104],
      [42, -8, 156, 96],
      [106, 14, 116, 72],
      [0, 20, 260, 72]
    ];
    // Kids see bright white storybook clouds on a day sky; grown-ups see faint mist.
    const kids = Theme.kids;
    puffs.forEach(([px, py, w, h]) => this.add(scene.add.ellipse(px, py, w, h, kids ? 0xffffff : Palette.MOON, kids ? 0.92 : 0.1)));

    this.label = UIKit.text(scene, 0, 4, thought, {
      size: 22,
      wrap: 250,
      alpha: kids ? 1 : 0.88,
      lineSpacing: 4,
      plain: kids,
      color: kids ? '#1d2458' : undefined,
      weight: kids ? '600' : undefined
    });
    this.add(this.label);

    this.tag = UIKit.text(scene, 0, -78, category, {
      size: 22,
      weight: '600',
      color: Palette.css(Palette.SAFFRON),
      spacing: 2,
      alpha: 0
    });
    this.add(this.tag);

    this.setSize(330, 130);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => this.note());

    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 1600 });
    scene.add.existing(this);
  }

  drift(dt) {
    if (this.done) return;
    this.x += this.speed * dt;
    this.wobble += dt * 0.6;
    this.y = this.baseY + Math.sin(this.wobble) * 6;
    if (this.x > Layout.W(this.scene) + 220) {
      this.done = true;
      this.onPassed(this);
      this.destroy();
    }
  }

  note() {
    if (this.done) return;
    this.done = true;
    this.disableInteractive();
    this.onNoted(this);
    this.scene.tweens.add({ targets: this.tag, alpha: 1, y: -92, duration: 500 });
    this.scene.tweens.add({ targets: this.label, alpha: 0, duration: 900 });
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      y: this.y - 40,
      delay: 700,
      duration: 1800,
      ease: 'Sine.Out',
      onComplete: () => this.destroy()
    });
  }

  fadeAway() {
    if (this.done) return;
    this.done = true;
    this.disableInteractive();
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 1500, onComplete: () => this.destroy() });
  }
}
