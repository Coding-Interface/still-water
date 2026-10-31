/**
 * UIKit — text, buttons, toasts, result cards and the practice intro panel,
 * styled once for all scenes and both profiles. Text is rasterised at the screen's
 * real resolution; kids titles get a chunky outline and smaller kids text a drop shadow.
 */
class UIKit {
  static text(scene, x, y, str, opts = {}) {
    const style = {
      fontFamily: opts.display ? Palette.FONT_DISPLAY : Palette.FONT_BODY,
      fontSize: (opts.size || 28) + 'px',
      fontStyle: opts.weight || (Theme.kids && opts.display ? '600' : 'normal'),
      color: opts.color || Palette.css(Palette.MOON),
      align: opts.align || 'center',
      lineSpacing: opts.lineSpacing || 8
    };
    if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: false };
    const t = scene.add.text(x, y, str, style);
    t.setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
    // Rasterise at the canvas's real resolution so text stays sharp when the camera zooms.
    t.setResolution(Math.max(1, AppRouter.k));
    const size = opts.size || 28;
    const big = opts.display || size >= 34;
    const outlined = Theme.outline && !opts.plain;
    // Kids: big titles get a chunky outline; smaller text gets a clean drop shadow,
    // which stays readable on the bright sky without making letters look smudged.
    if (opts.spacing && !(outlined && big)) t.setLetterSpacing(opts.spacing);
    if (opts.alpha != null) t.setAlpha(opts.alpha);
    if (outlined) {
      if (big) t.setStroke(Palette.css(Palette.OUTLINE), Math.max(4, Math.round(size * 0.11)));
      t.setShadow(0, big ? 4 : 2, Palette.css(Palette.OUTLINE), 0, false, true);
    }
    return t;
  }

  /** A pill button. Call setSelected(true) on it to show it as the active tool. */
  static button(scene, x, y, label, onTap, opts = {}) {
    const w = opts.w || 300;
    const h = opts.h || 76;
    const c = scene.add.container(x, y);
    const bg = scene.add.graphics();
    const accent = opts.accent ?? Palette.MOON;
    const base = opts.fillAlpha ?? (Theme.kids ? 0.85 : 0.1);
    const kids = Theme.kids;
    c.selected = false;
    const r = h / 2;
    const draw = (hover) => {
      bg.clear();
      if (kids) {
        // a chunky toy button: drop shadow, solid face, glossy top
        bg.fillStyle(0x000000, 0.22);
        bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
        bg.fillStyle(c.selected ? accent : Palette.NIGHT, c.selected ? 1 : hover ? 1 : base);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        bg.fillStyle(0xffffff, c.selected ? 0.28 : 0.12);
        bg.fillRoundedRect(-w / 2 + 6, -h / 2 + 4, w - 12, h * 0.38, { tl: r - 4, tr: r - 4, bl: 6, br: 6 });
        bg.lineStyle(3, accent, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      } else {
        // a quiet glass pill: soft shadow, tinted fill, a hairline highlight on top
        bg.fillStyle(0x000000, 0.22);
        bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, r);
        bg.fillStyle(Palette.NIGHT, 0.55);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        bg.fillStyle(accent, c.selected ? 0.3 : hover ? 0.22 : base + 0.04);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        bg.lineStyle(1.5, 0xffffff, 0.12);
        bg.beginPath();
        bg.arc(-w / 2 + r, -h / 2 + r, r - 1.5, Math.PI * 1.15, Math.PI * 1.5);
        bg.lineTo(w / 2 - r, -h / 2 + 1.5);
        bg.arc(w / 2 - r, -h / 2 + r, r - 1.5, Math.PI * 1.5, Math.PI * 1.85);
        bg.strokePath();
        bg.lineStyle(1.5, accent, c.selected || hover ? 0.9 : 0.55);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      }
    };
    draw(false);
    const t = UIKit.text(scene, 0, 0, label, {
      size: opts.size || 26,
      weight: kids ? '600' : '500',
      color: Palette.css(kids ? Palette.MOON : accent)
    });
    c.add([bg, t]);
    c.label = t;
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => {
      draw(false);
      c.setScale(1);
    });
    c.on('pointerdown', () => c.setScale(0.96));
    c.on('pointerup', () => {
      c.setScale(1);
      onTap();
    });
    c.setSelected = (v) => {
      c.selected = v;
      if (kids) t.setColor(Palette.css(v ? Palette.NIGHT : Palette.MOON));
      draw(false);
      return c;
    };
    return c;
  }

  /** "‹ Home" in the top-left corner of every practice and game. */
  static leave(scene) {
    const b = UIKit.button(
      scene,
      100,
      62,
      '‹  Home',
      () => {
        WakeKeeper.release();
        scene.scene.start('MenuScene');
      },
      { w: 150, h: 56, size: 22, fillAlpha: Theme.kids ? 0.85 : 0.12, accent: Theme.kids ? Palette.SAFFRON : Palette.MIST }
    );
    b.setDepth(40).setScrollFactor(0);
    return b;
  }

  /** A short message that fades in, stays a few seconds and fades out. */
  static toast(scene, message, y, hold = 4200) {
    const W = Layout.W(scene);
    const H = Layout.H(scene);
    const ty = Math.min(y ?? H * 0.14, H - 80);
    if (scene.__toast) scene.__toast.destroy();
    const c = scene.add.container(W / 2, ty).setDepth(55).setScrollFactor(0);
    const t = UIKit.text(scene, 0, 0, message, { size: 23, wrap: Math.min(560, W - 120), lineSpacing: 6 });
    const pw = Math.min(W - 60, t.width + 56);
    const ph = t.height + 30;
    const bg = scene.add.graphics();
    bg.fillStyle(Palette.NIGHT, Theme.kids ? 0.92 : 0.82);
    bg.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 18);
    bg.lineStyle(Theme.kids ? 3 : 1.5, Theme.kids ? Palette.SAFFRON : Palette.MOON, Theme.kids ? 1 : 0.18);
    bg.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 18);
    c.add([bg, t]);
    c.setAlpha(0);
    scene.__toast = c;
    scene.tweens.add({
      targets: c,
      alpha: 1,
      duration: 500,
      hold,
      yoyo: true,
      onComplete: () => {
        if (scene.__toast === c) scene.__toast = null;
        c.destroy();
      }
    });
    return c;
  }

  /** Text that rises and fades: "+5", "Chain ×4". */
  static floatText(scene, x, y, str, color = Palette.SAFFRON, size = 36) {
    const t = UIKit.text(scene, x, y, str, { display: true, size, color: Palette.css(color), plain: true }).setDepth(50);
    t.setStroke(Palette.css(Theme.kids ? Palette.OUTLINE : Palette.NIGHT), Theme.kids ? 8 : 6);
    scene.tweens.add({
      targets: t,
      y: y - 80,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.Out',
      onComplete: () => t.destroy()
    });
    return t;
  }

  /**
   * A centred card for game start, level clear and game over.
   * primary / secondary are [label, callback]; the card closes before the callback runs.
   */
  static resultCard(scene, { eyebrow, title, lines = [], primary, secondary }) {
    const W = Layout.W(scene);
    const H = Layout.H(scene);
    const land = W > H;
    const layer = scene.add.container(0, 0).setDepth(70).setScrollFactor(0);
    const shade = scene.add.rectangle(0, 0, W, H, Palette.NIGHT, Theme.kids ? 0.55 : 0.72).setOrigin(0).setInteractive();
    const pw = 600;
    const lineGap = land ? 40 : 46;
    const sideBySide = land && secondary;
    const panelH = 190 + lines.length * lineGap + 40 + (secondary && !sideBySide ? 100 : 0) + 70;
    const top = Math.max(20, (H - panelH) / 2);
    const linesTop = top + 190;
    const btnY = linesTop + lines.length * lineGap + 40;

    const panel = scene.add.graphics();
    panel.fillStyle(Palette.NIGHT, 0.97);
    panel.fillRoundedRect(W / 2 - pw / 2, top, pw, panelH, 28);
    panel.lineStyle(Theme.kids ? 4 : 1.5, Theme.kids ? Palette.SAFFRON : Palette.MOON, Theme.kids ? 1 : 0.2);
    panel.strokeRoundedRect(W / 2 - pw / 2, top, pw, panelH, 28);
    layer.add([shade, panel]);

    if (eyebrow) {
      layer.add(UIKit.text(scene, W / 2, top + 58, eyebrow.toUpperCase(), { size: 20, weight: '600', color: Palette.css(Palette.SAFFRON), spacing: 3 }));
    }
    layer.add(UIKit.text(scene, W / 2, top + 122, title, { display: true, size: 54, wrap: 540 }));
    lines.forEach((line, i) => {
      layer.add(UIKit.text(scene, W / 2, linesTop + i * lineGap, line, { size: 25, wrap: 540, color: Palette.css(i === 0 ? Palette.MOON : Palette.MIST) }));
    });

    let closed = false;
    const run = (fn) => () => {
      if (closed) return;
      closed = true;
      layer.destroy();
      fn();
    };
    if (sideBySide) {
      layer.add(UIKit.button(scene, W / 2 - 140, btnY, primary[0], run(primary[1]), { w: 260, h: 76, accent: Palette.LOTUS }));
      layer.add(UIKit.button(scene, W / 2 + 140, btnY, secondary[0], run(secondary[1]), { w: 260, h: 76 }));
    } else {
      if (primary) layer.add(UIKit.button(scene, W / 2, btnY, primary[0], run(primary[1]), { w: 400, h: 80, accent: Palette.LOTUS }));
      if (secondary) layer.add(UIKit.button(scene, W / 2, btnY + 100, secondary[0], run(secondary[1]), { w: 400, h: 80 }));
    }

    layer.setAlpha(0);
    scene.tweens.add({ targets: layer, alpha: 1, duration: 350 });
    if (Theme.kids) {
      layer.setScale(0.96);
      layer.x = W * 0.02;
      layer.y = H * 0.02;
      scene.tweens.add({ targets: layer, scale: 1, x: 0, y: 0, duration: 380, ease: 'Back.Out' });
    }
    return layer;
  }

  /**
   * Full-screen panel shown before a practice: what it is, how to do it, and Begin.
   * With practice.choices, one button per choice; onBegin receives the chosen value.
   */
  static intro(scene, practice, onBegin) {
    const W = Layout.W(scene);
    const H = Layout.H(scene);
    const land = W > H;
    const layer = scene.add.container(0, 0).setDepth(60).setScrollFactor(0);
    const shade = scene.add.rectangle(0, 0, W, H, Palette.NIGHT, Theme.kids ? 0.82 : 0.88).setOrigin(0).setInteractive();

    const eyebrow = UIKit.text(scene, W / 2, H * (land ? 0.15 : 0.17), practice.meta.toUpperCase(), {
      size: 20,
      weight: '600',
      color: Palette.css(Palette.SAFFRON),
      spacing: 3
    });
    const title = UIKit.text(scene, W / 2, H * (land ? 0.25 : 0.235), practice.title, { display: true, size: land ? 62 : 70 });
    const dur = UIKit.text(scene, W / 2, H * (land ? 0.335 : 0.295), practice.duration, {
      size: 22,
      color: Palette.css(Palette.MIST)
    });
    const body = UIKit.text(scene, W / 2, H * (land ? 0.39 : 0.345), practice.intro.join(land ? '\n' : '\n\n'), {
      size: land ? 23 : 26,
      wrap: land ? 960 : 580,
      lineSpacing: land ? 8 : 10,
      oy: 0
    });
    layer.add([shade, eyebrow, title, dur, body]);

    let started = false;
    const begin = (value) => {
      if (started) return;
      started = true;
      scene.tweens.add({
        targets: layer,
        alpha: 0,
        duration: 450,
        onComplete: () => layer.destroy()
      });
      onBegin(value);
    };

    const choices = practice.choices || [{ label: Theme.pick('Begin', "Let's go"), value: null }];
    if (land) {
      const bw = choices.length > 1 ? 400 : 360;
      const gap = 30;
      const total = choices.length * bw + (choices.length - 1) * gap;
      choices.forEach((ch, i) => {
        layer.add(
          UIKit.button(scene, W / 2 - total / 2 + bw / 2 + i * (bw + gap), H * 0.85, ch.label, () => begin(ch.value), {
            w: bw,
            h: 76,
            accent: Palette.LOTUS
          })
        );
      });
    } else {
      const top = H * (choices.length > 1 ? 0.75 : 0.8);
      choices.forEach((ch, i) => {
        layer.add(UIKit.button(scene, W / 2, top + i * 100, ch.label, () => begin(ch.value), { w: 420, h: 80, accent: Palette.LOTUS }));
      });
    }
    return layer;
  }

  static duration(seconds) {
    const s = Math.max(0, Math.round(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m === 0) return `${r} seconds`;
    return r === 0 ? `${m} min` : `${m} min ${r} s`;
  }
}
