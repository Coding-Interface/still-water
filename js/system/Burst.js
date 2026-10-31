/**
 * Burst — one-shot particle explosions (shards, splashes) in any colour.
 * Keeps one emitter per colour and reuses it.
 */
class Burst {
  static ensureTextures(scene) {
    if (scene.textures.exists('fxShard')) return;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(0, 0, 16, 4, 5, 12);
    g.generateTexture('fxShard', 16, 12);
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('fxDot', 12, 12);
    g.clear();
    for (let i = 6; i >= 1; i--) {
      g.fillStyle(0xffffff, 0.17);
      g.fillCircle(16, 16, i * 2.6);
    }
    g.generateTexture('fxFlame', 32, 32);
    g.destroy();
  }

  constructor(scene, texture = 'fxShard', config = {}, depth = 25) {
    this.scene = scene;
    this.texture = texture;
    this.config = config;
    this.depth = depth;
    this.emitters = new Map();
    Burst.ensureTextures(scene);
  }

  emit(color, x, y, count = 12) {
    let e = this.emitters.get(color);
    if (!e) {
      const base = {
        speed: { min: 120, max: 460 },
        angle: { min: 0, max: 360 },
        gravityY: 1100,
        lifespan: { min: 600, max: 1200 },
        scale: { start: 1, end: 0.4 },
        rotate: { min: 0, max: 360 },
        alpha: { start: 1, end: 0 },
        emitting: false
      };
      e = this.scene.add.particles(0, 0, this.texture, Object.assign(base, this.config, { tint: color }));
      e.setDepth(this.depth);
      this.emitters.set(color, e);
    }
    e.explode(count, x, y);
  }
}
