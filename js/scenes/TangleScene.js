/**
 * TangleScene — Untangle (Grown-ups) / String Sort (Kids).
 * A planar graph is scrambled into a knot; drag the points until no two lines
 * cross. Every knot is generated from random lines, so it always has a solution.
 * Knots grow by one line every two levels (kids start smaller).
 */
class TangleScene extends Phaser.Scene {
  constructor() {
    super('TangleScene');
  }

  init(data) {
    this.level = (data && data.level) || ProgressStore.getBest('tangle') + 1;
    this.nodes = [];
    this.edges = [];
    this.drag = null;
    this.solved = false;
    this.crossing = new Set();
  }

  snapshot() {
    return { level: this.level };
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.A = land ? { x: 150, y: 110, w: W - 520, h: H - 150 } : { x: 54, y: 236, w: 612, h: 836 };
    const A = this.A;

    const bg = this.add.graphics();
    bg.fillGradientStyle(Palette.BG_TOP, Palette.BG_TOP, Palette.BG_BOTTOM, Palette.BG_BOTTOM, 1);
    bg.fillRect(0, 0, W, H);
    bg.fillStyle(this.kids ? 0xffffff : Palette.MOON, this.kids ? 0.18 : 0.05);
    for (let x = A.x; x <= A.x + A.w; x += 40) for (let y = A.y; y <= A.y + A.h; y += 40) bg.fillCircle(x, y, this.kids ? 2 : 1.4);

    UIKit.leave(this);
    UIKit.text(this, W - 160, 62, GameLibrary.get('tangle').title, { display: true, size: 38, ox: 1, align: 'right' });
    const tx = land ? W - 340 : 40;
    this.levelText = UIKit.text(this, tx, land ? 200 : 140, '', { size: 26, weight: '600', ox: 0, align: 'left' });
    this.crossText = UIKit.text(this, tx, land ? 240 : 178, '', { size: 21, ox: 0, align: 'left', wrap: land ? 300 : 600, color: Palette.css(Palette.SAFFRON) });

    this.edgeG = this.add.graphics();
    this.nodeG = this.add.graphics();

    this.doneText = UIKit.text(this, land ? W - 190 : W / 2, land ? 420 : 1112, '', { display: true, size: 40, color: Palette.css(Palette.LEAF_LIGHT) });
    this.mainBtn = UIKit.button(this, land ? W - 190 : W / 2, land ? 520 : 1200, Theme.pick('Shuffle this knot', 'Mix it up'), () => this.onMain(), {
      w: land ? 300 : 360,
      h: 76,
      accent: Theme.kids ? Palette.SAFFRON : Palette.MIST
    });

    this.bindInput();
    this.rest = new EyeRest(this);
    this.newKnot();
    UIKit.toast(this, GameLibrary.get('tangle').hint, land ? 640 : 250);
    WakeKeeper.hold();
  }

  lineCount() {
    return this.kids ? Math.min(7, 3 + Math.floor((this.level - 1) / 2)) : Math.min(8, 4 + Math.floor((this.level - 1) / 2));
  }

  generate(L) {
    const A = this.A;
    const cx = A.x + A.w / 2;
    const cy = A.y + A.h / 2;
    for (let attempt = 0; attempt < 80; attempt++) {
      const lines = [];
      for (let i = 0; i < L; i++) {
        const a = Math.random() * Math.PI;
        lines.push({ px: cx + Phaser.Math.Between(-A.w * 0.25, A.w * 0.25), py: cy + Phaser.Math.Between(-A.h * 0.25, A.h * 0.25), dx: Math.cos(a), dy: Math.sin(a) });
      }
      const perLine = lines.map(() => []);
      let count = 0;
      let ok = true;
      for (let i = 0; i < L && ok; i++) {
        for (let j = i + 1; j < L; j++) {
          const li = lines[i];
          const lj = lines[j];
          const den = li.dx * lj.dy - li.dy * lj.dx;
          if (Math.abs(den) < 0.2) {
            ok = false;
            break;
          }
          const wx = lj.px - li.px;
          const wy = lj.py - li.py;
          const t = (wx * lj.dy - wy * lj.dx) / den;
          const s = (wx * li.dy - wy * li.dx) / den;
          perLine[i].push([t, count]);
          perLine[j].push([s, count]);
          count += 1;
        }
      }
      if (!ok) continue;
      const edges = [];
      perLine.forEach((arr) => {
        arr.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k + 1 < arr.length; k++) edges.push([arr[k][1], arr[k + 1][1]]);
      });
      return { count, edges };
    }
    return null;
  }

  newKnot() {
    const A = this.A;
    const cx = A.x + A.w / 2;
    const cy = A.y + A.h / 2;
    const g = this.generate(this.lineCount());
    this.edges = g.edges;
    this.solved = false;
    this.doneText.setText('');
    this.mainBtn.label.setText(Theme.pick('Shuffle this knot', 'Mix it up'));

    const n = g.count;
    const r = Math.min(280, Math.min(A.w, A.h) / 2 - 30);
    for (let tries = 0; tries < 30; tries++) {
      const order = Phaser.Utils.Array.Shuffle([...Array(n).keys()]);
      this.nodes = order.map((slot) => ({
        x: cx + Math.cos((slot / n) * Math.PI * 2 - Math.PI / 2) * r,
        y: cy + Math.sin((slot / n) * Math.PI * 2 - Math.PI / 2) * r,
        color: Theme.CANDY[slot % Theme.CANDY.length]
      }));
      if (this.countCrossings() > 0) break;
    }

    const targets = this.nodes.map((p) => ({ x: p.x, y: p.y }));
    this.nodes.forEach((p) => {
      p.x = cx;
      p.y = cy;
    });
    const prog = { t: 0 };
    this.tweens.add({
      targets: prog,
      t: 1,
      duration: 600,
      ease: 'Back.Out',
      onUpdate: () => {
        const t = prog.t;
        this.nodes.forEach((p, i) => {
          p.x = cx + (targets[i].x - cx) * t;
          p.y = cy + (targets[i].y - cy) * t;
        });
      },
      onComplete: () => {
        this.nodes.forEach((p, i) => {
          p.x = targets[i].x;
          p.y = targets[i].y;
        });
      }
    });

    this.levelText.setText(`${Theme.pick('Knot', 'Level')} ${this.level}  ·  ${n} ${Theme.pick('points', 'dots')}`);
  }

  static orient(ax, ay, bx, by, cx, cy) {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  }

  countCrossings() {
    const N = this.nodes;
    const E = this.edges;
    const crossing = new Set();
    let count = 0;
    for (let i = 0; i < E.length; i++) {
      for (let j = i + 1; j < E.length; j++) {
        const [a, b] = E[i];
        const [c, d] = E[j];
        if (a === c || a === d || b === c || b === d) continue;
        const o = TangleScene.orient;
        const o1 = o(N[a].x, N[a].y, N[b].x, N[b].y, N[c].x, N[c].y);
        const o2 = o(N[a].x, N[a].y, N[b].x, N[b].y, N[d].x, N[d].y);
        const o3 = o(N[c].x, N[c].y, N[d].x, N[d].y, N[a].x, N[a].y);
        const o4 = o(N[c].x, N[c].y, N[d].x, N[d].y, N[b].x, N[b].y);
        if (o1 * o2 < 0 && o3 * o4 < 0) {
          count += 1;
          crossing.add(i);
          crossing.add(j);
        }
      }
    }
    this.crossing = crossing;
    return count;
  }

  bindInput() {
    const A = this.A;
    this.input.on('pointerdown', (p, over) => {
      if ((over && over.length) || this.rest.open || this.solved) return;
      this.bowl.unlock();
      let best = null;
      let bd = this.kids ? 64 : 54;
      this.nodes.forEach((n) => {
        const d = Phaser.Math.Distance.Between(p.lx, p.ly, n.x, n.y);
        if (d < bd) {
          bd = d;
          best = n;
        }
      });
      if (best) {
        this.drag = best;
        this.bowl.chime(659.25, 0.035);
      }
    });
    this.input.on('pointermove', (p) => {
      if (!this.drag) return;
      this.drag.x = Phaser.Math.Clamp(p.lx, A.x, A.x + A.w);
      this.drag.y = Phaser.Math.Clamp(p.ly, A.y, A.y + A.h);
    });
    const up = () => {
      if (!this.drag) return;
      this.drag = null;
      this.bowl.chime(523.25, 0.03);
      if (this.countCrossings() === 0) this.onSolved();
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  onSolved() {
    this.solved = true;
    ProgressStore.setBest('tangle', this.level);
    this.bowl.fanfare();
    if (this.kids) this.bowl.sparkle();
    this.doneText.setText(Theme.pick('Untangled', 'You did it!')).setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: this.doneText, scale: 1, alpha: 1, duration: 400, ease: 'Back.Out' });
    this.mainBtn.label.setText(Theme.pick('Next knot', 'Next level'));
    this.nodes.forEach((n, i) => {
      const ring = this.add.circle(n.x, n.y, 22);
      ring.setStrokeStyle(3, Palette.LEAF_LIGHT, 0.9);
      this.tweens.add({ targets: ring, scale: 2.4, alpha: 0, delay: i * 30, duration: 800, onComplete: () => ring.destroy() });
    });
  }

  onMain() {
    if (this.rest.open) return;
    this.bowl.unlock();
    if (this.solved) this.level += 1;
    this.newKnot();
  }

  update(time, delta) {
    this.rest.tick(delta);
    const crossings = this.countCrossings();
    if (!this.solved) {
      this.crossText.setText(
        crossings === 0
          ? Theme.pick('No crossings. Let go to finish.', 'No crossings! Let go!')
          : `${crossings} ${crossings === 1 ? 'crossing' : 'crossings'} left`
      );
    } else {
      this.crossText.setText(Theme.pick('Every line is free.', 'All the strings are free!'));
    }

    const eg = this.edgeG;
    eg.clear();
    this.edges.forEach(([a, b], i) => {
      const cross = this.crossing.has(i);
      const color = this.solved ? Palette.LEAF_LIGHT : cross ? (this.kids ? 0xff4f6a : Palette.SAFFRON) : this.kids ? 0xffffff : Palette.LEAF_LIGHT;
      eg.lineStyle(this.kids ? 8 : this.solved ? 6 : 5, color, cross ? 0.95 : 0.8);
      eg.lineBetween(this.nodes[a].x, this.nodes[a].y, this.nodes[b].x, this.nodes[b].y);
    });

    const ng = this.nodeG;
    ng.clear();
    this.nodes.forEach((n) => {
      const active = n === this.drag;
      const r = (this.kids ? 25 : 19) + (active ? 6 : 0);
      ng.fillStyle(0x000000, 0.3);
      ng.fillCircle(n.x + 2, n.y + 4, r + 1);
      if (this.kids) {
        ng.fillStyle(n.color, 1);
        ng.fillCircle(n.x, n.y, r);
        ng.lineStyle(4, 0xffffff, 1);
        ng.strokeCircle(n.x, n.y, r);
        ng.fillStyle(0x1d2458, 1);
        ng.fillCircle(n.x - 7, n.y - 3, 3.5);
        ng.fillCircle(n.x + 7, n.y - 3, 3.5);
        ng.lineStyle(3, 0x1d2458, 1);
        ng.beginPath();
        ng.arc(n.x, n.y + 3, 7, 0.3, Math.PI - 0.3);
        ng.strokePath();
      } else {
        ng.fillStyle(active ? Palette.SAFFRON : Palette.MOON, 1);
        ng.fillCircle(n.x, n.y, r);
        ng.fillStyle(Palette.NIGHT, 0.5);
        ng.fillCircle(n.x, n.y, active ? 9 : 7);
      }
    });
  }
}
