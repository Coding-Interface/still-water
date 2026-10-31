/**
 * Koi — one fish made of a chain of body segments that follow the head.
 * Wanders slowly, turns away from the pond edge, and swims to food when it sees some.
 * Drawn every frame into a shared Graphics object.
 */
class Koi {
  /** Patterns read the current Palette, so Kids get brighter fish. */
  static get PATTERNS() {
    return {
    kohaku: { base: Palette.KOI_WHITE, spots: [[0, Palette.KOI_RED], [1, Palette.KOI_RED], [3, Palette.KOI_ORANGE], [4, Palette.KOI_RED]] },
    ogon: { base: Palette.KOI_GOLD, spots: [[2, 0xf2cc6a], [5, 0xf2cc6a]] },
    showa: { base: Palette.KOI_INK, spots: [[1, Palette.KOI_WHITE], [2, Palette.KOI_ORANGE], [4, Palette.KOI_WHITE], [5, Palette.KOI_ORANGE]] },
    tancho: { base: Palette.KOI_WHITE, spots: [[0, Palette.KOI_RED]] },
    chagoi: { base: Palette.KOI_BROWN, spots: [[3, 0xc39466]] },
    sanke: { base: Palette.KOI_WHITE, spots: [[1, Palette.KOI_ORANGE], [3, Palette.KOI_INK], [5, Palette.KOI_ORANGE], [6, Palette.KOI_INK]] }
    };
  }

  static PROFILE = [0.32, 0.43, 0.48, 0.47, 0.43, 0.37, 0.3, 0.23, 0.17, 0.13];

  constructor(bounds, pattern, size, cute = false) {
    this.b = bounds;
    this.cute = cute;
    this.wiggle = 0;
    this.p = Koi.PATTERNS[pattern] || Koi.PATTERNS.kohaku;
    this.size = size;
    this.R = Koi.PROFILE.map((v) => v * size * 0.5);
    this.gap = size * 0.115;
    this.x = Phaser.Math.Between(bounds.x + 140, bounds.x + bounds.w - 140);
    this.y = Phaser.Math.Between(bounds.y + 200, bounds.y + bounds.h - 200);
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 30;
    this.wander = 0;
    this.phase = Math.random() * 10;
    this.segs = this.R.map((_, i) => ({
      x: this.x - Math.cos(this.angle) * this.gap * i,
      y: this.y - Math.sin(this.angle) * this.gap * i
    }));
  }

  /** Move one step. Returns the pellet eaten this step, if any. */
  update(dt, pellets) {
    const b = this.b;
    let desired;
    let targetSpeed = 34;
    let turnRate = 1.1;
    let eaten = null;

    let best = null;
    let bd = 460;
    for (const pel of pellets) {
      if (pel.eaten) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, pel.x, pel.y);
      if (d < bd) {
        bd = d;
        best = pel;
      }
    }

    if (best) {
      desired = Math.atan2(best.y - this.y, best.x - this.x);
      targetSpeed = 70 + Math.min(60, bd * 0.2);
      turnRate = 2.4;
      if (bd < this.size * 0.2) {
        best.eaten = true;
        eaten = best;
        this.wiggle = 1.2;
      }
    } else {
      this.wander = Phaser.Math.Clamp(this.wander + (Math.random() - 0.5) * dt * 2.6, -1, 1);
      desired = this.angle + this.wander * 0.8;
    }

    const m = 120;
    if (this.x < b.x + m || this.x > b.x + b.w - m || this.y < b.y + m || this.y > b.y + b.h - m) {
      desired = Math.atan2(b.y + b.h / 2 - this.y, b.x + b.w / 2 - this.x);
      turnRate = Math.max(turnRate, 1.6);
    }

    const diff = Phaser.Math.Angle.Wrap(desired - this.angle);
    const max = turnRate * dt;
    this.angle += Phaser.Math.Clamp(diff, -max, max);
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 1.4);
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.wiggle = Math.max(0, this.wiggle - dt);
    this.phase += dt * (2.2 + this.speed / 22 + this.wiggle * 8);

    this.segs[0].x = this.x;
    this.segs[0].y = this.y;
    for (let i = 1; i < this.segs.length; i++) {
      const a = this.segs[i - 1];
      const s = this.segs[i];
      const dx = s.x - a.x;
      const dy = s.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      s.x = a.x + (dx / d) * this.gap;
      s.y = a.y + (dy / d) * this.gap;
    }
    return eaten;
  }

  /** Body positions with a gentle side-to-side swim wave. */
  shape() {
    const s = this.segs;
    return s.map((seg, i) => {
      const prev = s[Math.max(0, i - 1)];
      const next = s[Math.min(s.length - 1, i + 1)];
      const a = Math.atan2(prev.y - next.y, prev.x - next.x);
      const wave = Math.sin(this.phase - i * 0.7) * i * 0.55;
      return { x: seg.x - Math.sin(a) * wave, y: seg.y + Math.cos(a) * wave, a };
    });
  }

  draw(g) {
    const pts = this.shape();
    const R = this.R;
    const n = pts.length;
    const base = this.p.base;

    // shadow on the pond floor
    g.fillStyle(0x000000, 0.2);
    for (let i = 0; i < n; i++) g.fillCircle(pts[i].x + 12, pts[i].y + 16, R[i]);

    // pectoral fins
    const f = pts[2];
    const flutter = Math.sin(this.phase * 1.3) * 0.25;
    g.fillStyle(base, 0.55);
    [-1, 1].forEach((side) => {
      const ox = f.x + Math.cos(f.a + side * Math.PI / 2) * R[2] * 0.7;
      const oy = f.y + Math.sin(f.a + side * Math.PI / 2) * R[2] * 0.7;
      const da = f.a + side * (Math.PI * 0.72 + flutter);
      const tx = ox + Math.cos(da) * R[2] * 1.5;
      const ty = oy + Math.sin(da) * R[2] * 1.5;
      const bx = ox - Math.cos(f.a) * R[2] * 0.9;
      const by = oy - Math.sin(f.a) * R[2] * 0.9;
      g.fillTriangle(ox, oy, tx, ty, bx, by);
    });

    // tail fan
    const last = pts[n - 1];
    const ta = last.a + Math.PI + Math.sin(this.phase) * 0.4;
    const len = this.size * 0.36;
    g.fillStyle(base, 0.6);
    g.fillTriangle(
      last.x,
      last.y,
      last.x + Math.cos(ta + 0.45) * len,
      last.y + Math.sin(ta + 0.45) * len,
      last.x + Math.cos(ta - 0.45) * len,
      last.y + Math.sin(ta - 0.45) * len
    );

    // body, tail end first so the head sits on top
    g.fillStyle(base, 1);
    for (let i = n - 1; i >= 0; i--) g.fillCircle(pts[i].x, pts[i].y, R[i]);

    // colour patches
    this.p.spots.forEach(([i, color]) => {
      const p = pts[i];
      if (!p) return;
      g.fillStyle(color, 0.95);
      g.fillCircle(p.x + Math.cos(p.a + 1.2) * R[i] * 0.15, p.y + Math.sin(p.a + 1.2) * R[i] * 0.15, R[i] * 0.78);
    });

    // back highlight and eyes
    g.fillStyle(0xffffff, 0.12);
    for (let i = 1; i < 6; i++) g.fillCircle(pts[i].x, pts[i].y, R[i] * 0.35);
    const h = pts[0];
    if (this.cute) {
      [-1, 1].forEach((side) => {
        const ex = h.x + Math.cos(h.a) * R[0] * 0.25 + Math.cos(h.a + side * Math.PI / 2) * R[0] * 0.55;
        const ey = h.y + Math.sin(h.a) * R[0] * 0.25 + Math.sin(h.a + side * Math.PI / 2) * R[0] * 0.55;
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex, ey, Math.max(4, R[0] * 0.34));
        g.fillStyle(0x1d2458, 1);
        g.fillCircle(ex + Math.cos(h.a) * 2, ey + Math.sin(h.a) * 2, Math.max(2.5, R[0] * 0.18));
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ex + Math.cos(h.a) * 1, ey + Math.sin(h.a) * 1 - 2, 1.6);
      });
      g.fillStyle(0xff8aa0, 0.6);
      g.fillCircle(h.x + Math.cos(h.a) * R[0] * 0.7, h.y + Math.sin(h.a) * R[0] * 0.7, Math.max(2, R[0] * 0.14));
    } else {
      g.fillStyle(0x111111, 0.85);
      [-1, 1].forEach((side) => {
        g.fillCircle(
          h.x + Math.cos(h.a) * R[0] * 0.35 + Math.cos(h.a + side * Math.PI / 2) * R[0] * 0.6,
          h.y + Math.sin(h.a) * R[0] * 0.35 + Math.sin(h.a + side * Math.PI / 2) * R[0] * 0.6,
          Math.max(1.5, R[0] * 0.14)
        );
      });
    }
  }
}
