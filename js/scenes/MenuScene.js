/**
 * MenuScene — the app's home and its three libraries, for both profiles and
 * both orientations.
 *   Home     greeting, "How are you feeling?" check-in, a featured pick,
 *            quick resets, a daily tip and the Kids / Grown-ups switch.
 *   Games    stress-release games.
 *   Unwind   slow, goal-free activities ("Chill" for kids).
 *   Breathe  guided breath practices.
 * Portrait uses a bottom tab bar; landscape uses a side rail.
 * Keyboard: ← → switch tabs.
 */
class MenuScene extends Phaser.Scene {
  static TABS = [
    { id: 'home', label: 'Home' },
    { id: 'games', label: 'Games' },
    { id: 'unwind', label: 'Unwind', kids: 'Chill' },
    { id: 'breathe', label: 'Breathe' }
  ];

  static PAGES = {
    games: {
      title: 'Games',
      sub: 'Real games to let off steam. Smash, slice, shatter and burn.',
      kidsSub: 'Games for when you feel grumpy, mad or full of fizz.',
      footer: 'Scores and levels are saved in this browser. A soft bell offers an eye break every few minutes.'
    },
    unwind: {
      title: 'Unwind',
      kidsTitle: 'Chill',
      sub: 'Slow play with no goal, no clock and nothing to lose.',
      kidsSub: 'Calm, cosy things to do. No rush, no winning or losing.',
      footer: 'Good for winding down before sleep, or a quiet minute between tasks.'
    },
    breathe: {
      title: 'Breathe',
      sub: 'Short guided practices from yoga, Buddhist and Vedantic traditions.',
      kidsSub: 'Breathing games that help your body feel calm.',
      footer: 'Headphones help. You can close your eyes: the tone rises as you breathe in and falls as you breathe out.'
    }
  };

  constructor() {
    super('MenuScene');
  }

  create() {
    this.L = Layout.info(this);
    this.bowl = this.registry.get('bowl');
    this.tab = this.registry.get('menuTab') || 'home';
    if (!MenuScene.TABS.some((t) => t.id === this.tab)) this.tab = 'home';
    // In landscape the moon would sit on the cards, so it moves (home) or rests (library tabs).
    const { W, land } = this.L;
    new NightSky(this, land ? (this.tab === 'home' ? { sunX: W * 0.48, sunY: 100 } : { noSun: true }) : { sunX: W * 0.71 });

    this.page = this.add.container(0, 0);
    this.lastHome = this.tab === 'home';
    this.makeNav();
    this.render(false);

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.shiftTab(-1));
      this.input.keyboard.on('keydown-RIGHT', () => this.shiftTab(1));
    }
  }

  /** Content area, clear of the navigation. */
  area() {
    const { W, H, land } = this.L;
    return land ? { x: 168, y: 0, w: W - 168 - 40, h: H } : { x: 40, y: 0, w: W - 80, h: 1150 };
  }

  /* ---------- navigation ---------- */

  makeNav() {
    const { W, H, land } = this.L;
    const bar = this.add.graphics().setDepth(30);
    bar.fillStyle(Palette.NIGHT, Theme.kids ? 0.92 : 0.95);
    if (land) {
      bar.fillRect(0, 0, 136, H);
      bar.lineStyle(Theme.kids ? 4 : 1.5, Theme.kids ? Palette.SAFFRON : Palette.MOON, Theme.kids ? 1 : 0.12);
      bar.lineBetween(136, 0, 136, H);
    } else {
      bar.fillRect(0, 1150, W, H - 1150);
      bar.lineStyle(Theme.kids ? 4 : 1.5, Theme.kids ? Palette.SAFFRON : Palette.MOON, Theme.kids ? 1 : 0.12);
      bar.lineBetween(0, 1150, W, 1150);
    }

    const n = MenuScene.TABS.length;
    this.tabItems = MenuScene.TABS.map((t, i) => {
      const x = land ? 68 : W / n / 2 + (i * W) / n;
      const y = land ? 150 + i * 132 : 1150 + 64;
      const c = this.add.container(x, y).setDepth(31);
      const pill = this.add.graphics();
      const icon = this.add.graphics();
      const label = UIKit.text(this, 0, 38, Theme.kids && t.kids ? t.kids : t.label, { size: 21, weight: '600' });
      c.add([pill, icon, label]);
      c.setSize(land ? 136 : W / n, land ? 120 : 128);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.setTab(t.id));
      return { id: t.id, pill, icon, label };
    });
  }

  refreshNav() {
    this.tabItems.forEach((item) => {
      const on = item.id === this.tab;
      const color = on ? (Theme.kids ? Palette.SAFFRON : Palette.LOTUS) : Palette.MIST;
      item.pill.clear();
      if (on) {
        item.pill.fillStyle(Theme.kids ? Palette.SAFFRON : Palette.LOTUS, Theme.kids ? 0.25 : 0.16);
        item.pill.fillRoundedRect(-44, -40, 88, 48, 24);
      }
      item.icon.clear();
      Glyphs.tab(item.icon, item.id, 0, -16, color);
      item.label.setColor(Palette.css(on ? Palette.MOON : Palette.MIST));
    });
  }

  shiftTab(dir) {
    const tabs = MenuScene.TABS;
    const i = tabs.findIndex((t) => t.id === this.tab);
    this.setTab(tabs[(i + dir + tabs.length) % tabs.length].id);
  }

  setTab(id) {
    if (id === this.tab) return;
    this.tab = id;
    this.registry.set('menuTab', id);
    this.bowl.unlock();
    this.bowl.tick();
    if (this.L.land && (id === 'home') !== (this.lastHome ?? true)) {
      this.scene.restart();
      return;
    }
    this.lastHome = id === 'home';
    this.render(true);
  }

  render(animate) {
    this.page.removeAll(true);
    if (this.tab === 'home') this.renderHome();
    else this.renderList();
    this.refreshNav();
    if (animate) {
      this.page.setAlpha(0).setY(18);
      this.tweens.add({ targets: this.page, alpha: 1, y: 0, duration: 280, ease: 'Sine.Out' });
    }
  }

  add2(obj) {
    this.page.add(obj);
    return obj;
  }

  launch(entry) {
    this.bowl.unlock();
    this.bowl.tick();
    this.registry.set('menuTab', this.tab);
    this.scene.start(entry.scene, { id: entry.id });
  }

  /* ---------- home ---------- */

  renderHome() {
    const { land } = this.L;
    const A = this.area();
    const hour = new Date().getHours();
    const greet = MoodLibrary.greeting(hour);
    const accent = Theme.kids ? Palette.SAFFRON : Palette.LOTUS;

    this.add2(UIKit.text(this, A.x, 62, 'Still Water', { display: true, size: 30, ox: 0, align: 'left', color: Palette.css(accent) }));
    this.makeProfileSwitch(A.x + 190, 62);

    const colW = land ? 460 : A.w;
    this.add2(UIKit.text(this, A.x - 2, land ? 150 : 168, greet.title, { display: true, size: land ? 60 : 70, ox: 0, align: 'left' }));
    this.add2(UIKit.text(this, A.x + 2, land ? 206 : 228, greet.line, { size: 24, ox: 0, align: 'left', wrap: colW, color: Palette.css(Palette.MIST) }));

    this.renderMoods(A.x, land ? 266 : 306, A.x + colW);
    this.featured = this.add2(this.add.container(0, 0));
    this.featBox = land ? { x: A.x + colW + 30, y: 96, w: A.x + A.w - (A.x + colW + 30), h: 330 } : { x: A.x, y: 482, w: A.w, h: 330 };
    this.fillFeatured(false);
    if (land) {
      const rows = this.chips.length ? Math.max(...this.chips.map((c) => c.row)) + 1 : 3;
      this.renderQuick(this.featBox.x, 470, this.featBox.w);
      this.renderTip(A.x + colW / 2, Math.max(500, 266 + rows * 74 + 40), colW);
    } else {
      this.renderQuick(A.x, 866, A.w);
      this.renderTip(this.L.W / 2, 1036, 600);
    }
  }

  makeProfileSwitch(x, y) {
    const label = Theme.kids ? 'Kids  ⇄' : 'Grown-ups  ⇄';
    const b = UIKit.button(this, 0, y, label, () => AppRouter.setProfile(Theme.kids ? 'adults' : 'kids'), {
      w: Theme.kids ? 130 : 180,
      h: 48,
      size: 19,
      fillAlpha: Theme.kids ? 0.85 : 0.06,
      accent: Palette.MIST
    });
    b.x = x + (Theme.kids ? 65 : 90);
    this.add2(b);
  }

  renderMoods(x0, y0, xMax) {
    const selected = this.registry.get('mood');
    let x = x0;
    let y = y0;
    let row = 0;
    this.chips = MoodLibrary.MOODS.map((m) => {
      const t = UIKit.text(this, 0, 0, m.label, { size: 23, weight: '600' });
      const w = Math.ceil(t.width) + 46;
      if (x + w > xMax) {
        x = x0;
        y += 74;
        row += 1;
      }
      const c = this.add.container(x + w / 2, y);
      const bg = this.add.graphics();
      c.add([bg, t]);
      c.setSize(w, 60);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.chooseMood(m.id));
      this.add2(c);
      x += w + 12;
      const chip = { id: m.id, bg, t, w, row };
      this.drawChip(chip, m.id === selected);
      return chip;
    });
  }

  drawChip(chip, on) {
    const { bg, t, w } = chip;
    const accent = Theme.kids ? Palette.SAFFRON : Palette.LOTUS;
    bg.clear();
    if (Theme.kids) {
      bg.fillStyle(0x000000, 0.15);
      bg.fillRoundedRect(-w / 2, -26, w, 60, 30);
      bg.fillStyle(on ? accent : Palette.NIGHT, on ? 1 : 0.85);
      bg.fillRoundedRect(-w / 2, -30, w, 60, 30);
      bg.lineStyle(3, accent, 1);
      bg.strokeRoundedRect(-w / 2, -30, w, 60, 30);
    } else {
      bg.fillStyle(on ? accent : Palette.MOON, on ? 0.95 : 0.07);
      bg.fillRoundedRect(-w / 2, -30, w, 60, 30);
      bg.lineStyle(1.5, on ? accent : Palette.MOON, on ? 1 : 0.24);
      bg.strokeRoundedRect(-w / 2, -30, w, 60, 30);
      t.setColor(Palette.css(on ? Palette.NIGHT : Palette.MOON));
    }
  }

  chooseMood(id) {
    this.bowl.unlock();
    const current = this.registry.get('mood');
    const next = current === id ? null : id;
    this.registry.set('mood', next);
    this.chips.forEach((c) => this.drawChip(c, c.id === next));
    if (next) {
      this.bowl.strike(392, 0.07, 2.2);
      if (Theme.kids) this.bowl.sparkle(0.7);
    }
    this.fillFeatured(true);
  }

  currentPick() {
    const mood = MoodLibrary.mood(this.registry.get('mood'));
    if (mood) {
      const eyebrow = Theme.kids ? `When you feel ${mood.label.toLowerCase()}` : `For feeling ${mood.label.toLowerCase()}`;
      return { entry: MoodLibrary.entry(mood.target), eyebrow, reason: mood.reason };
    }
    const p = MoodLibrary.timePick(new Date().getHours());
    return { entry: MoodLibrary.entry(p.target), eyebrow: p.eyebrow, reason: p.reason };
  }

  fillFeatured(animate) {
    const c = this.featured;
    c.removeAll(true);
    const pick = this.currentPick();
    const { x: x0, y: y0, w, h } = this.featBox;
    const accent = Theme.kids ? Palette.SAFFRON : Palette.LOTUS;
    const narrow = w < 560;

    const zone = this.add.zone(x0 + w / 2, y0 + h / 2, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.launch(pick.entry));

    const bg = this.add.graphics();
    if (Theme.kids) {
      bg.fillStyle(0x000000, 0.18);
      bg.fillRoundedRect(x0, y0 + 8, w, h, 30);
    }
    bg.fillStyle(Palette.NIGHT, Theme.kids ? 0.92 : 0.8);
    bg.fillRoundedRect(x0, y0, w, h, 30);
    bg.lineStyle(Theme.kids ? 4 : 2, accent, Theme.kids ? 1 : 0.5);
    bg.strokeRoundedRect(x0, y0, w, h, 30);
    const gx = x0 + w - (narrow ? 84 : 104);
    const gy = y0 + (narrow ? 96 : 118);
    bg.fillStyle(accent, 0.12);
    bg.fillCircle(gx, gy, narrow ? 66 : 92);
    bg.lineStyle(1.5, accent, 0.3);
    bg.strokeCircle(gx, gy, narrow ? 66 : 92);

    const glyph = this.add.graphics({ x: gx, y: gy });
    Glyphs.draw(glyph, pick.entry.id, 0, 0, accent);
    const gs = narrow ? 1.7 : 2.3;
    glyph.setScale(gs);

    const textW = w - (narrow ? 180 : 220);
    const eyebrow = UIKit.text(this, x0 + 32, y0 + 48, pick.eyebrow.toUpperCase(), {
      size: 18,
      weight: '600',
      color: Palette.css(Palette.SAFFRON),
      spacing: 3,
      ox: 0,
      align: 'left'
    });
    const title = UIKit.text(this, x0 + 32, y0 + 104, pick.entry.title, { display: true, size: narrow ? 44 : 52, ox: 0, align: 'left' });
    if (title.width > textW + 40) title.setScale((textW + 40) / title.width);
    const reason = UIKit.text(this, x0 + 32, y0 + 146, pick.reason, {
      size: 23,
      wrap: textW + 20,
      ox: 0,
      oy: 0,
      align: 'left',
      lineSpacing: 6,
      alpha: 0.9
    });
    const play = UIKit.button(this, x0 + 32 + 125, y0 + h - 62, Theme.pick('Play now  ›', "Let's play  ›"), () => this.launch(pick.entry), {
      w: 250,
      h: 72,
      accent,
      fillAlpha: Theme.kids ? 0.9 : 0.18
    });
    c.add([zone, bg, glyph, eyebrow, title, reason, play]);

    if (animate) {
      c.setAlpha(0.2);
      this.tweens.add({ targets: c, alpha: 1, duration: 300 });
      this.tweens.add({ targets: glyph, scale: { from: gs * 0.7, to: gs }, duration: 420, ease: 'Back.Out' });
    }
  }

  renderQuick(x0, y, width) {
    this.add2(UIKit.text(this, x0, y, Theme.pick('QUICK RESETS', 'QUICK CALM'), { size: 18, weight: '600', color: Palette.css(Palette.SAFFRON), spacing: 3, ox: 0, align: 'left' }));
    const gap = 20;
    const w = (width - gap * 2) / 3;
    const h = 96;
    MoodLibrary.QUICK.forEach((q, i) => {
      const entry = MoodLibrary.entry(q.target);
      const cx = x0 + w / 2 + i * (w + gap);
      const cy = y + 32 + h / 2;
      const c = this.add.container(cx, cy);
      const bg = this.add.graphics();
      const draw = (hover) => {
        bg.clear();
        bg.fillStyle(Palette.NIGHT, hover ? 0.95 : Theme.kids ? 0.85 : 0.66);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
        bg.lineStyle(Theme.kids ? 3 : 1.5, hover || Theme.kids ? (Theme.kids ? Palette.SAFFRON : Palette.LOTUS) : Palette.MOON, hover ? 0.9 : Theme.kids ? 0.7 : 0.16);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      };
      draw(false);
      const g = this.add.graphics({ x: -w / 2 + 40, y: 0 });
      Glyphs.draw(g, entry.id, 0, 0, Theme.kids ? Palette.SAFFRON : Palette.LOTUS);
      g.setScale(0.66);
      const t = UIKit.text(this, -w / 2 + 74, 0, q.label, { size: 20, weight: '600', ox: 0, align: 'left', wrap: w - 86, lineSpacing: 2 });
      c.add([bg, g, t]);
      c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => draw(true));
      c.on('pointerout', () => draw(false));
      c.on('pointerup', () => this.launch(entry));
      this.add2(c);
    });
  }

  renderTip(cx, y, width) {
    this.add2(
      UIKit.text(this, cx, y, Theme.pick('A SMALL THING FOR TODAY', 'TRY THIS TODAY'), {
        size: 17,
        weight: '600',
        color: Palette.css(Palette.MIST),
        spacing: 3
      })
    );
    this.add2(UIKit.text(this, cx, y + 46, MoodLibrary.tip(), { display: true, size: 26, wrap: width, alpha: 0.95 }));
  }

  /* ---------- library tabs ---------- */

  renderList() {
    const { land } = this.L;
    const A = this.area();
    const page = MenuScene.PAGES[this.tab];
    const title = Theme.kids && page.kidsTitle ? page.kidsTitle : page.title;
    const sub = Theme.kids && page.kidsSub ? page.kidsSub : page.sub;
    this.add2(UIKit.text(this, A.x - 2, land ? 66 : 136, title, { display: true, size: land ? 56 : 70, ox: 0, align: 'left' }));
    this.add2(
      UIKit.text(this, land ? A.x + 280 : A.x + 2, land ? 66 : 186, sub, {
        size: land ? 21 : 23,
        ox: 0,
        oy: land ? 0.5 : 0,
        align: 'left',
        wrap: land ? A.w - 420 : A.w,
        color: Palette.css(Palette.MIST),
        lineSpacing: 6
      })
    );

    const list = this.tab === 'games' ? GameLibrary.games() : this.tab === 'unwind' ? GameLibrary.activities() : PracticeLibrary.list();
    if (land) {
      const cols = 2;
      const gap = 24;
      const cw = (A.w - gap) / cols;
      const top = 132;
      const rowsNeeded = Math.ceil(list.length / cols);
      // shrink the cards a little when there are many, so the footer still fits
      const step = Math.min(128, Math.floor((this.L.H - top - 46) / rowsNeeded));
      list.forEach((p, i) => this.makeCard(p, A.x + (i % cols) * (cw + gap), top + Math.floor(i / cols) * step, cw, step - 16, i));
      const rows = Math.ceil(list.length / cols);
      this.add2(UIKit.text(this, A.x + 2, top + rows * step + 8, page.footer, { size: 18, ox: 0, oy: 0, align: 'left', wrap: A.w, color: Palette.css(Palette.MIST) }));
    } else {
      const top = 262;
      const step = Math.min(132, Math.floor((1150 - top - 70) / list.length));
      list.forEach((p, i) => this.makeCard(p, A.x, top + i * step, A.w, step - 14, i));
      this.add2(
        UIKit.text(this, A.x + 2, top + list.length * step + 6, page.footer, {
          size: 19,
          ox: 0,
          oy: 0,
          align: 'left',
          wrap: A.w,
          color: Palette.css(Palette.MIST),
          lineSpacing: 5
        })
      );
    }
  }

  makeCard(p, x, y, w, h, index) {
    const c = this.add.container(x + w / 2, y + h / 2);
    const bg = this.add.graphics();
    const accent = Theme.kids ? Theme.CANDY[index % Theme.CANDY.length] : Palette.LOTUS;
    const draw = (on) => {
      bg.clear();
      // shadow, face, top highlight, border
      bg.fillStyle(0x000000, Theme.kids ? 0.18 : 0.28);
      bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 22);
      bg.fillStyle(Palette.NIGHT, on ? 0.98 : Theme.kids ? 0.9 : 0.78);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
      bg.fillStyle(0xffffff, Theme.kids ? 0.07 : 0.035);
      bg.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.46, { tl: 20, tr: 20, bl: 4, br: 4 });
      bg.lineStyle(Theme.kids ? 3 : 1.5, on || Theme.kids ? accent : Palette.MOON, on ? 1 : Theme.kids ? 0.85 : 0.14);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
      // icon badge
      bg.fillStyle(accent, Theme.kids ? 0.22 : 0.12);
      bg.fillCircle(-w / 2 + 62, 0, Math.min(38, h / 2 - 8));
      bg.lineStyle(1.5, accent, on ? 0.7 : 0.3);
      bg.strokeCircle(-w / 2 + 62, 0, Math.min(38, h / 2 - 8));
    };
    draw(false);

    const glyph = this.add.graphics({ x: -w / 2 + 62, y: 0 });
    Glyphs.draw(glyph, p.id, 0, 0, accent);
    glyph.setScale(0.82);

    const compact = h < 104;
    const tiny = h < 84;
    const title = UIKit.text(this, -w / 2 + 120, tiny ? -13 : compact ? -15 : -18, p.title, { display: true, size: tiny ? 26 : compact ? 29 : 32, ox: 0, align: 'left' });
    const meta = UIKit.text(this, -w / 2 + 122, tiny ? 17 : compact ? 20 : 22, p.meta, { size: 19, color: Palette.css(Palette.MIST), ox: 0, align: 'left' });
    const maxMeta = w - 150;
    if (meta.width > maxMeta) meta.setScale(maxMeta / meta.width);
    const label = p.bestKey ? GameLibrary.cardLabel(p) : p.duration;
    const dur = UIKit.text(this, w / 2 - 24, -18, label, {
      size: 19,
      weight: '600',
      color: Palette.css(Palette.SAFFRON),
      ox: 1,
      align: 'right'
    });
    const maxTitle = w - 150 - dur.width - 20;
    if (title.width > maxTitle) title.setScale(maxTitle / title.width);

    c.add([bg, glyph, title, meta, dur]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerup', () => this.launch(p));
    this.add2(c);

    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 320, delay: 45 * index });
  }
}
