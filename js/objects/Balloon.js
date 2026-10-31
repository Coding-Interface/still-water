/**
 * Balloon — the Kids breathing guide. It fills up on the in-breath and shrinks on
 * the out-breath, with a happy face and a curly string. setBloom(0..1) matches
 * the Lotus API, so BreathScene can use either.
 */
class Balloon extends Phaser.GameObjects.Container {
  constructor(scene, x, y, size = 120, color = Palette.LOTUS) {
    super(scene, x, y);
    this.size = size;
    this.color = color;
    this.string = scene.add.graphics();
    this.body = scene.add.graphics();
    this.face = scene.add.graphics();
    this.add([this.string, this.body, this.face]);
    scene.add.existing(this);
    this.setBloom(0);
  }

  setBloom(b) {
    const k = Phaser.Math.Clamp(b, 0, 1);
    this.bloom = k;
    const r = this.size * (0.42 + 0.58 * k);
    const cy = -r;
    const g = this.body;
    g.clear();
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(6, cy + 8, r * 2, r * 2.2);
    g.fillStyle(this.color, 1);
    g.fillEllipse(0, cy, r * 2, r * 2.2);
    g.fillTriangle(-10, cy + r * 1.08, 10, cy + r * 1.08, 0, cy + r * 1.08 + 14);
    g.fillStyle(0xffffff, 0.45);
    g.fillEllipse(-r * 0.42, cy - r * 0.45, r * 0.42, r * 0.62);

    const f = this.face;
    f.clear();
    const eye = Math.max(4, r * 0.09);
    f.fillStyle(0x1d2458, 1);
    f.fillCircle(-r * 0.3, cy - r * 0.08, eye);
    f.fillCircle(r * 0.3, cy - r * 0.08, eye);
    f.lineStyle(Math.max(3, r * 0.06), 0x1d2458, 1);
    f.beginPath();
    f.arc(0, cy + r * 0.12, r * (0.18 + 0.12 * k), 0.2, Math.PI - 0.2);
    f.strokePath();
    f.fillStyle(0xffffff, 0.5);
    f.fillCircle(-r * 0.52, cy + r * 0.2, r * 0.1);
    f.fillCircle(r * 0.52, cy + r * 0.2, r * 0.1);

    const s = this.string;
    s.clear();
    s.lineStyle(3, 0xffffff, 0.9);
    s.beginPath();
    const top = cy + r * 1.08 + 12;
    s.moveTo(0, top);
    for (let i = 1; i <= 12; i++) {
      const y = top + i * 7;
      s.lineTo(Math.sin(i * 0.9) * 8, y);
    }
    s.strokePath();
  }
}
