/**
 * Lotus — a lotus on a leaf pad that opens and closes with the breath.
 * setBloom(0) is a closed bud, setBloom(1) is fully open.
 */
class Lotus extends Phaser.GameObjects.Container {
  constructor(scene, x, y, size = 100) {
    super(scene, x, y);
    this.size = size;

    this.glow = scene.add.circle(0, -size * 0.45, size * 1.1, Palette.SAFFRON, 0);
    this.add(this.glow);
    this.add(scene.add.ellipse(0, 4, size * 2.4, size * 0.42, Palette.LEAF, 0.65));
    this.add(scene.add.ellipse(-size * 0.2, 0, size * 1.4, size * 0.18, Palette.LEAF_LIGHT, 0.3));

    const layers = [
      { n: 7, len: 0.95, wid: 0.36, spread: 78, color: Palette.LOTUS_DEEP, alpha: 0.92 },
      { n: 6, len: 0.85, wid: 0.34, spread: 50, color: Palette.LOTUS, alpha: 0.94 },
      { n: 3, len: 0.68, wid: 0.3, spread: 20, color: Palette.LOTUS_PALE, alpha: 0.97 }
    ];

    this.petals = [];
    layers.forEach((L) => {
      const mid = (L.n - 1) / 2;
      const order = [...Array(L.n).keys()].sort((a, b) => Math.abs(b - mid) - Math.abs(a - mid));
      order.forEach((i) => {
        const t = L.n === 1 ? 0 : (i - mid) / mid;
        const petal = scene.add.ellipse(0, -2, size * L.wid, size * L.len, L.color, L.alpha);
        petal.setOrigin(0.5, 1);
        petal.setStrokeStyle(1.5, 0xfbe6ec, 0.35);
        this.add(petal);
        this.petals.push({ petal, t, spread: L.spread });
      });
    });

    this.seed = scene.add.circle(0, -size * 0.32, size * 0.07, Palette.SAFFRON, 0);
    this.add(this.seed);

    scene.add.existing(this);
    this.setBloom(0);
  }

  setBloom(b) {
    const bloom = Phaser.Math.Clamp(b, 0, 1);
    this.bloom = bloom;
    const bud = 6;
    this.petals.forEach(({ petal, t, spread }) => {
      petal.angle = t * (bud + (spread - bud) * bloom);
      petal.scaleY = 0.82 + 0.18 * bloom;
      petal.scaleX = 0.85 + 0.15 * bloom;
    });
    this.glow.setFillStyle(Palette.SAFFRON, 0.04 + 0.15 * bloom);
    this.seed.setFillStyle(Palette.SAFFRON, Math.max(0, bloom - 0.6) * 2.2);
  }
}
