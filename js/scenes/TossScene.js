/**
 * TossScene — Crumple & Burn (Grown-ups) / Worry Monster (Kids).
 * A worry is written on paper (pick one or write your own). Tap to crumple it
 * into a ball, then drag toward the target and let go. Grown-ups toss it into a
 * fire bin; kids feed it to a friendly Worry Monster that chomps it up.
 * The target moves and the wind picks up as your streak grows.
 */
class TossScene extends Phaser.Scene {
  static WORRIES = [
    'I might fail the exam',
    'Too many unread emails',
    'That awkward thing I said',
    'Money is tight this month',
    "I'm behind on work",
    "What if they don't like it?",
    'Traffic made me late again',
    'My to-do list keeps growing',
    'The argument with my friend',
    'Not enough sleep',
    'Everyone else seems ahead',
    'The meeting tomorrow'
  ];

  static KID_WORRIES = [
    'My homework is hard',
    "I don't want to go to bed",
    'My friend was mean',
    'I lost my game',
    'I had a scary dream',
    'The spelling test',
    'I felt left out',
    'It is too noisy',
    'Waiting is boring',
    'I miss someone',
    'Tidying my room',
    'My tummy feels funny'
  ];

  static GRAVITY = 1400;
  static POWER = 5;
  static MAX_DRAG = 260;

  constructor() {
    super('TossScene');
  }

  init(data) {
    this.state = 'paper';
    this.streak = (data && data.streak) || 0;
    this.taps = 0;
    this.wind = 0;
    this.worries = Theme.kids ? TossScene.KID_WORRIES : TossScene.WORRIES;
    this.worryIndex = Phaser.Math.Between(0, this.worries.length - 1);
    this.worry = (data && data.worry) || this.worries[this.worryIndex];
    this.aiming = false;
    this.v = { x: 0, y: 0 };
    this.writing = null;
  }

  snapshot() {
    return { streak: this.streak, worry: this.worry };
  }

  create() {
    const { W, H, land } = Layout.info(this);
    this.kids = Theme.kids;
    this.bowl = this.registry.get('bowl');
    this.L = land
      ? {
          groundY: H - 56,
          throwAt: { x: 170, y: H - 130 },
          paper: { x: W * 0.42, y: 290 },
          hintY: 468,
          btns: [{ x: 160, y: 262 }, { x: 160, y: 352 }],
          binRange: [820, 1130],
          writerBtnY: 500
        }
      : {
          groundY: 1120,
          throwAt: { x: 150, y: 1040 },
          paper: { x: W / 2, y: 520 },
          hintY: 760,
          btns: [{ x: W / 2 - 160, y: 850 }, { x: W / 2 + 160, y: 850 }],
          binRange: [420, 630],
          writerBtnY: 720
        };
    this.groundY = this.L.groundY;
    this.throwAt = this.L.throwAt;
    new NightSky(this);

    const ground = this.add.graphics();
    ground.fillStyle(this.kids ? 0x6cc36a : 0x16232d, 1);
    ground.fillRect(0, this.groundY, W, H - this.groundY + 10);
    ground.lineStyle(this.kids ? 4 : 2, this.kids ? 0x4aa85a : Palette.MIST, this.kids ? 1 : 0.2);
    ground.lineBetween(0, this.groundY, W, this.groundY);
    if (!this.kids) for (let x = 0; x < W; x += 90) ground.lineBetween(x, this.groundY, x - 40, this.groundY + 200);

    this.makeTextures();
    Burst.ensureTextures(this);

    this.binG = this.add.graphics().setDepth(6);
    this.aimG = this.add.graphics().setDepth(8);
    // Kids: a fountain of candy-coloured sparkles when the monster eats.
    // Grown-ups: a real little fire that always burns, and flares up to burn the paper.
    this.flames = this.add
      .particles(0, 0, this.kids ? 'fxDot' : 'fxFlame', {
        x: { min: -46, max: 46 },
        speedY: this.kids ? { min: -380, max: -160 } : { min: -420, max: -180 },
        speedX: { min: -60, max: 60 },
        gravityY: this.kids ? 260 : 0,
        lifespan: { min: 600, max: 1100 },
        scale: this.kids ? { start: 2.2, end: 0.4 } : { start: 1.6, end: 0 },
        alpha: { start: 0.95, end: 0 },
        rotate: this.kids ? { min: 0, max: 360 } : 0,
        tint: this.kids ? [0xff6fa8, 0xffc533, 0x4fb6ff, 0x5fd38a, 0xa77bff, 0xffffff] : [Palette.SAFFRON, Palette.KOI_ORANGE, Palette.KOI_RED, 0xfff1a8],
        blendMode: this.kids ? 'NORMAL' : 'ADD',
        frequency: 30,
        quantity: 2,
        emitting: false
      })
      .setDepth(7);
    if (!this.kids) {
      this.glow = this.add.image(0, 0, 'fxGlow').setTint(Palette.KOI_ORANGE).setBlendMode('ADD').setDepth(5).setScale(1.3).setAlpha(0.3);
      this.idleFire = this.add
        .particles(0, 0, 'fxFlame', {
          x: { min: -28, max: 28 },
          speedY: { min: -150, max: -60 },
          speedX: { min: -14, max: 14 },
          lifespan: { min: 450, max: 820 },
          scale: { start: 0.8, end: 0 },
          alpha: { start: 0.85, end: 0 },
          tint: [Palette.SAFFRON, Palette.KOI_ORANGE, Palette.KOI_RED],
          blendMode: 'ADD',
          frequency: 55
        })
        .setDepth(7);
      this.embers = this.add
        .particles(0, 0, 'fxDot', {
          x: { min: -30, max: 30 },
          speedY: { min: -110, max: -50 },
          speedX: { min: -25, max: 25 },
          lifespan: { min: 1000, max: 1600 },
          scale: { start: 0.45, end: 0 },
          alpha: { start: 0.9, end: 0 },
          tint: [0xfff1a8, Palette.SAFFRON],
          blendMode: 'ADD',
          frequency: 240
        })
        .setDepth(7);
      this.smoke = this.add
        .particles(0, 0, 'fxDot', {
          x: { min: -24, max: 24 },
          speedY: { min: -90, max: -45 },
          speedX: { min: -18, max: 18 },
          lifespan: { min: 1800, max: 2600 },
          scale: { start: 1.2, end: 5 },
          alpha: { start: 0.28, end: 0 },
          tint: [0x5a5f66, 0x70757c, 0x44484e],
          frequency: 70,
          emitting: false
        })
        .setDepth(4);
      this.ash = this.add
        .particles(0, 0, 'fxShard', {
          x: { min: -30, max: 30 },
          speedY: { min: -170, max: -70 },
          speedX: { min: -50, max: 50 },
          gravityY: 40,
          lifespan: { min: 1400, max: 2200 },
          scale: { start: 0.7, end: 0.2 },
          rotate: { min: 0, max: 360 },
          alpha: { start: 0.9, end: 0 },
          tint: [0x2a2420, 0x4a403a, 0xff9a3c],
          emitting: false
        })
        .setDepth(7);
    }
    this.placeBin(Math.round((this.L.binRange[0] + this.L.binRange[1]) / 2));

    this.windText = UIKit.text(this, W / 2, 132, '', { size: 24, weight: '600', color: Palette.css(Palette.MIST) });
    this.streakText = UIKit.text(this, 34, 132, '', { display: true, size: 32, ox: 0, align: 'left' });
    this.bestText = UIKit.text(this, 34, 170, '', { size: 20, ox: 0, align: 'left', color: Palette.css(Palette.MIST) });
    this.hint = UIKit.text(this, this.L.paper.x, this.L.hintY, '', { size: 24, color: Palette.css(Palette.MOON), alpha: 0.9 });
    this.updateHud();
    this.setWind(0);

    UIKit.leave(this);
    const [b1, b2] = this.L.btns;
    this.pickBtn = UIKit.button(this, b1.x, b1.y, Theme.pick('Another worry', 'Another one'), () => this.nextWorry(), { w: land ? 260 : 290, h: 72, size: 23, accent: Palette.MIST });
    this.writeBtn = UIKit.button(this, b2.x, b2.y, Theme.pick('Write my own', 'Write my own'), () => this.openWriter(), { w: land ? 260 : 290, h: 72, size: 23, accent: Palette.LOTUS });

    this.paper = this.makePaper(this.worry);
    this.bindInput();
    this.rest = new EyeRest(this);
    WakeKeeper.hold();
    this.startFireSound();
    this.events.once('shutdown', () => {
      this.closeWriter();
      if (this.fireSnd) this.fireSnd.stop();
      this.fireSnd = null;
    });
  }

  makeTextures() {
    if (!this.textures.exists('fxGlow')) {
      // a soft round glow that fades to nothing at the edge
      const tex = this.textures.createCanvas('fxGlow', 128, 128);
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,255,255,0.9)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.4)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 128, 128);
      tex.refresh();
    }
    if (this.textures.exists('paperBall')) return;
    const g = this.make.graphics({ add: false });
    const c = 32;
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = 26 + Math.random() * 5;
      pts.push(new Phaser.Math.Vector2(c + Math.cos(a) * r, c + Math.sin(a) * r));
    }
    g.fillStyle(0xd8d2c4, 1);
    g.fillPoints(pts, true);
    g.fillStyle(0xf4efe6, 1);
    g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(c + (p.x - c) * 0.88 - 2, c + (p.y - c) * 0.88 - 2)), true);
    g.lineStyle(1.5, 0x9a9384, 0.8);
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = a + 1 + Math.random() * 1.5;
      g.lineBetween(c + Math.cos(a) * 6, c + Math.sin(a) * 6, c + Math.cos(b) * 24, c + Math.sin(b) * 24);
    }
    g.lineStyle(1.5, 0x5b7fa8, 0.35);
    g.lineBetween(c - 18, c - 4, c + 14, c - 10);
    g.lineBetween(c - 14, c + 8, c + 18, c + 4);
    g.generateTexture('paperBall', 64, 64);
    g.destroy();
  }

  placeBin(x) {
    this.binX = x;
    this.binTop = this.groundY - 145;
    this.binHalf = 62;
    if (this.kids) this.drawMonster(false);
    else this.drawBin();
    this.flames.setPosition(x, this.binTop);
    [this.idleFire, this.embers, this.smoke, this.ash].forEach((e) => e && e.setPosition(x, this.binTop));
    if (this.glow) this.glow.setPosition(x, this.binTop - 6);
  }

  drawBin() {
    const g = this.binG;
    const x = this.binX;
    const top = this.binTop;
    const bottom = this.groundY;
    g.clear();
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 8, bottom + 4, 150, 18);
    g.fillStyle(0x3f474d, 1);
    g.fillPoints(
      [new Phaser.Math.Vector2(x - 62, top), new Phaser.Math.Vector2(x + 62, top), new Phaser.Math.Vector2(x + 48, bottom), new Phaser.Math.Vector2(x - 48, bottom)],
      true
    );
    g.lineStyle(2, 0x000000, 0.25);
    for (let i = -2; i <= 2; i++) g.lineBetween(x + i * 22, top + 12, x + i * 17, bottom - 6);
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(x - 50, top + 8, 10, bottom - top - 16);
    g.fillStyle(0x5a646b, 1);
    g.fillRoundedRect(x - 68, top - 6, 136, 14, 7);
    g.fillStyle(Palette.SAFFRON, 0.25);
    g.fillEllipse(x, top - 2, 110, 10);
  }

  /** The Worry Monster: a fuzzy blob looking up, mouth open at the top. */
  drawMonster(happy) {
    const g = this.binG;
    const x = this.binX;
    const top = this.binTop;
    const bottom = this.groundY;
    const h = bottom - top;
    const body = 0x8a6cff;
    g.clear();
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 6, bottom + 4, 170, 20);
    g.fillStyle(body, 1);
    g.fillRoundedRect(x - 78, top - 8, 156, h + 8, 60);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI;
      g.fillCircle(x - Math.cos(a) * 76, top + 40 + Math.sin(a) * 6 + (i % 2) * 6, 12);
    }
    g.fillStyle(0xffd23f, 1);
    g.fillTriangle(x - 60, top - 2, x - 46, top - 30, x - 34, top);
    g.fillTriangle(x + 34, top, x + 46, top - 30, x + 60, top - 2);
    // mouth (the target)
    g.fillStyle(0x3a1f5c, 1);
    g.fillEllipse(x, top + 6, 112, happy ? 26 : 40);
    g.fillStyle(0xffffff, 1);
    if (!happy) {
      g.fillTriangle(x - 34, top - 10, x - 24, top - 10, x - 29, top + 2);
      g.fillTriangle(x + 24, top - 10, x + 34, top - 10, x + 29, top + 2);
    }
    // eyes
    const ey = top + 62;
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x - 30, ey, 18);
    g.fillCircle(x + 30, ey, 18);
    g.fillStyle(0x1d2458, 1);
    if (happy) {
      g.lineStyle(5, 0x1d2458, 1);
      g.beginPath();
      g.arc(x - 30, ey + 6, 10, Math.PI + 0.4, -0.4);
      g.strokePath();
      g.beginPath();
      g.arc(x + 30, ey + 6, 10, Math.PI + 0.4, -0.4);
      g.strokePath();
    } else {
      g.fillCircle(x - 26, ey - 6, 8);
      g.fillCircle(x + 26, ey - 6, 8);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(x - 23, ey - 9, 3);
      g.fillCircle(x + 29, ey - 9, 3);
    }
    g.fillStyle(0xff8aa0, 0.7);
    g.fillCircle(x - 54, ey + 22, 9);
    g.fillCircle(x + 54, ey + 22, 9);
  }

  setWind(w) {
    this.wind = w;
    if (Math.abs(w) < 30) {
      this.windText.setText(Theme.pick('Calm air', 'No wind'));
      return;
    }
    const n = Math.min(3, Math.ceil(Math.abs(w) / 140));
    const arrows = (w < 0 ? '←' : '→').repeat(n);
    this.windText.setText(w < 0 ? `${arrows}  Wind` : `Wind  ${arrows}`);
  }

  updateHud() {
    this.streakText.setText(`Streak ${this.streak}`);
    const best = BestScores.get('toss');
    this.bestText.setText(best ? `Best streak ${best}` : Theme.pick('Burn three in a row', 'Feed three in a row!'));
  }

  makePaper(text) {
    const { x, y } = this.L.paper;
    const c = this.add.container(x, y).setDepth(5);
    const sheet = this.add.graphics();
    const paperColor = this.kids ? 0xfff6c9 : 0xf4efe6;
    sheet.fillStyle(0x000000, 0.3);
    sheet.fillRect(-194, -132, 400, 280);
    sheet.fillStyle(paperColor, 1);
    sheet.fillRect(-200, -140, 400, 280);
    sheet.lineStyle(1.5, 0x5b7fa8, 0.25);
    for (let ly = -100; ly < 140; ly += 32) sheet.lineBetween(-200, ly, 200, ly);
    sheet.lineStyle(2, Palette.KOI_RED, 0.35);
    sheet.lineBetween(-150, -140, -150, 140);
    if (this.kids) {
      sheet.fillStyle(0xff6fa8, 1);
      sheet.fillCircle(170, -112, 12);
      sheet.fillStyle(0xffc533, 1);
      sheet.fillCircle(146, -112, 8);
    }
    const label = this.add.text(-130, -122, Theme.pick('What is bothering me:', 'My worry is:'), {
      fontFamily: Palette.FONT_BODY,
      fontSize: '18px',
      color: '#7d7768'
    });
    const t = this.add
      .text(20, 14, text, {
        fontFamily: `${Palette.FONT_DISPLAY}, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'`,
        fontSize: '34px',
        fontStyle: this.kids ? '600' : 'normal',
        color: '#2b2f36',
        align: 'center',
        wordWrap: { width: 300, useAdvancedWrap: false },
        lineSpacing: 6
      })
      .setOrigin(0.5)
      .setResolution(AppRouter.k);
    label.setResolution(AppRouter.k);
    const wrinkles = this.add.graphics();
    c.add([sheet, label, t, wrinkles]);
    c.wrinkles = wrinkles;
    c.setAlpha(0);
    c.y += 40;
    this.tweens.add({ targets: c, alpha: 1, y, duration: 400, ease: 'Sine.Out' });
    this.taps = 0;
    this.state = 'paper';
    this.hint.setText(Theme.pick('Tap the paper to crumple it', 'Tap the paper to scrunch it!'));
    this.showPaperButtons(true);
    return c;
  }

  showPaperButtons(on) {
    [this.pickBtn, this.writeBtn].forEach((b) => {
      if (!b) return;
      b.setVisible(on);
      if (on) b.setInteractive();
      else b.disableInteractive();
    });
  }

  nextWorry() {
    if (this.state !== 'paper' || this.writing) return;
    this.worryIndex = (this.worryIndex + 1) % this.worries.length;
    this.worry = this.worries[this.worryIndex];
    if (this.paper) this.paper.destroy();
    this.paper = this.makePaper(this.worry);
  }

  openWriter() {
    if (this.state !== 'paper' || this.writing) return;
    const { x, y } = this.L.paper;
    this.showPaperButtons(false);
    if (this.paper) this.paper.setVisible(false);
    this.hint.setText('');
    const dom = this.add.dom(x, y).createFromHTML(
      '<form class="worry-form" autocomplete="off">' +
        `<label class="worry-label" for="worry-input">${Theme.pick('What is bothering you?', 'What is your worry?')}</label>` +
        '<input class="worry-input" id="worry-input" name="worry" maxlength="64" placeholder="A few words is enough" enterkeyhint="done" autocapitalize="sentences">' +
        `<div class="worry-emoji" role="group" aria-label="Add an emoji">${TossScene.emojis(this.kids)
          .map((e) => `<button type="button" class="worry-emoji-btn" data-e="${e}" aria-label="Add ${e}">${e}</button>`)
          .join('')}</div>` +
        `<p class="worry-note">${Theme.pick('It stays on this screen and is burned with the paper.', 'Only you can see it. The monster will eat it up!')}</p>` +
        '</form>'
    );
    const form = dom.node;
    const input = form.querySelector('input');
    // Keys typed in the box belong to the box: don't let the game (space to play,
    // M to mute, F for full screen, Esc to leave) see them, and don't let it
    // swallow the space bar.
    const keep = (e) => e.stopPropagation();
    ['keydown', 'keyup', 'keypress'].forEach((type) => form.addEventListener(type, keep));
    if (this.input.keyboard) {
      this.input.keyboard.disableGlobalCapture();
      this.input.keyboard.enabled = false;
    }
    // emoji buttons drop the emoji in where the cursor is, without closing the phone keyboard
    form.querySelectorAll('.worry-emoji-btn').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        TossScene.insertAtCaret(input, btn.dataset.e);
      });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.useWritten();
    });
    // the buttons sit just below the sheet, however tall it turns out to be
    const sheetH = form.offsetHeight || 300;
    const by = Math.max(this.L.writerBtnY, y + sheetH / 2 + 52);
    const useBtn = UIKit.button(this, x - 150, by, 'Write it down', () => this.useWritten(), { w: 270, h: 72, size: 23, accent: Palette.LOTUS });
    const cancelBtn = UIKit.button(this, x + 150, by, 'Cancel', () => this.closeWriter(true), { w: 270, h: 72, size: 23, accent: Palette.MIST });
    this.writing = { dom, input, useBtn, cancelBtn };
    // once the sheet has laid out (fonts, emoji), measure where it really ends and sit the buttons below it
    const place = () => {
      if (!this.writing || this.writing.dom !== dom) return;
      try {
        const canvas = this.sys.game.canvas.getBoundingClientRect();
        const r = form.getBoundingClientRect();
        if (!canvas.height || !r.height) return;
        const bottom = ((r.bottom - canvas.top) / canvas.height) * Layout.H(this);
        const yy = Math.min(Layout.H(this) - 50, Math.max(this.L.writerBtnY, bottom + 50));
        useBtn.y = yy;
        cancelBtn.y = yy;
      } catch (e) {
        /* keep the default spot */
      }
    };
    [30, 200, 600].forEach((ms) => setTimeout(place, ms));
    setTimeout(() => {
      try {
        input.focus();
      } catch (e) {
        /* ignore */
      }
    }, 50);
  }

  static emojis(kids) {
    return kids ? ['😟', '😢', '😠', '😨', '🤯', '😴', '📚', '🦖', '🌧️', '💔'] : ['😟', '😠', '😢', '😰', '😤', '🤯', '💼', '📚', '💸', '💔'];
  }

  static insertAtCaret(input, text) {
    const max = Number(input.getAttribute('maxlength')) || 64;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const next = input.value.slice(0, start) + text + input.value.slice(end);
    if (next.length > max) return;
    input.value = next;
    const pos = start + text.length;
    try {
      input.focus();
      input.setSelectionRange(pos, pos);
    } catch (e) {
      /* ignore */
    }
  }

  useWritten() {
    if (!this.writing) return;
    // count by characters, not code units, so an emoji is never cut in half
    const val = Array.from((this.writing.input.value || '').replace(/\s+/g, ' ').trim()).slice(0, 48).join('');
    this.closeWriter(!val);
    if (!val) return;
    this.worry = val;
    if (this.paper) this.paper.destroy();
    this.paper = this.makePaper(val);
  }

  closeWriter(restorePaper) {
    if (!this.writing) return;
    const { dom, useBtn, cancelBtn } = this.writing;
    this.writing = null;
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
    }
    try {
      dom.destroy();
    } catch (e) {
      /* already gone */
    }
    useBtn.destroy();
    cancelBtn.destroy();
    if (restorePaper && this.paper && this.paper.active) {
      this.paper.setVisible(true);
      this.showPaperButtons(true);
      this.hint.setText(Theme.pick('Tap the paper to crumple it', 'Tap the paper to scrunch it!'));
    }
  }

  /**
   * Aiming: press anywhere, drag toward where you want the ball to go, let go.
   * Drag direction is the throw direction, drag length is the power.
   * The dots show only the start of the arc and ignore the wind.
   */
  bindInput() {
    this.input.on('pointerdown', (p, over) => {
      this.startFireSound();
      if ((over && over.length) || this.rest.open || this.writing) return;
      this.bowl.unlock();
      if (this.state === 'paper' && this.paperHit(p)) this.crumpleTap();
      else if (this.state === 'aim') {
        this.aiming = true;
        this.dragFrom = { x: p.lx, y: p.ly };
        this.aimVel = null;
      }
    });
    this.input.on('pointermove', (p) => {
      if (!this.aiming) return;
      this.aimVel = this.velocityFor(p.lx - this.dragFrom.x, p.ly - this.dragFrom.y);
      this.drawAim();
    });
    const up = (p) => {
      if (!this.aiming) return;
      this.aiming = false;
      this.aimG.clear();
      const v = this.velocityFor(p.lx - this.dragFrom.x, p.ly - this.dragFrom.y);
      if (!v) {
        this.hint.setText(Theme.pick('Drag up toward the bin, then let go', 'Drag up toward the monster, then let go'));
        return;
      }
      this.throwBall(v.x, v.y);
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  /** Drag vector → launch velocity, or null when the drag is too short or not upward. */
  velocityFor(dx, dy) {
    const len = Math.hypot(dx, dy);
    if (len < 30 || dy > -12) return null;
    const k = Math.min(len, TossScene.MAX_DRAG) / len;
    return { x: dx * k * TossScene.POWER, y: dy * k * TossScene.POWER };
  }

  drawAim() {
    const g = this.aimG;
    g.clear();
    const v = this.aimVel;
    if (!v || !this.ball) return;
    const steps = this.kids ? 12 : 9;
    for (let i = 1; i <= steps; i++) {
      const t = i * 0.07;
      const x = this.ball.x + v.x * t;
      const y = this.ball.y + v.y * t + 0.5 * TossScene.GRAVITY * t * t;
      g.fillStyle(this.kids ? 0xffffff : Palette.MOON, 0.8 - i * 0.055);
      g.fillCircle(x, y, 6.5 - i * 0.35);
    }
  }

  paperHit(p) {
    const c = this.paper;
    if (!c || !c.active) return false;
    return Math.abs(p.lx - c.x) < 210 * c.scaleX + 20 && Math.abs(p.ly - c.y) < 150 * c.scaleY + 20;
  }

  crumpleTap() {
    const c = this.paper;
    this.taps += 1;
    this.bowl.crinkle();
    try {
      if (navigator.vibrate) navigator.vibrate(15);
    } catch (e) {
      /* not available */
    }
    const g = c.wrinkles;
    g.lineStyle(2, 0x8a8577, 0.55);
    for (let k = 0; k < 4; k++) {
      let x = Phaser.Math.Between(-190, 190);
      let y = Phaser.Math.Between(-130, 130);
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += Phaser.Math.Between(-60, 60);
        y += Phaser.Math.Between(-40, 40);
        g.lineTo(x, y);
      }
      g.strokePath();
    }
    g.fillStyle(0x000000, 0.04 * this.taps);
    g.fillRect(-200, -140, 400, 280);

    const s = 1 - this.taps * 0.15;
    this.tweens.add({ targets: c, scaleX: s * Phaser.Math.FloatBetween(0.85, 1), scaleY: s, angle: Phaser.Math.Between(-12, 12), duration: 140, ease: 'Back.Out' });
    this.hint.setText(this.taps < 5 ? Theme.pick(`Keep crumpling · ${5 - this.taps} more`, `Keep scrunching! ${5 - this.taps} more`) : '');
    if (this.taps >= 5) this.toBall();
  }

  toBall() {
    this.state = 'ball';
    this.showPaperButtons(false);
    const c = this.paper;
    const x = c.x;
    const y = c.y;
    c.destroy();
    this.paper = null;
    this.ball = this.add.image(x, y, 'paperBall').setDepth(5).setScale(1.6);
    this.tweens.add({
      targets: this.ball,
      x: this.throwAt.x,
      y: this.throwAt.y,
      scale: 1,
      angle: 360,
      duration: 650,
      ease: 'Sine.InOut',
      onComplete: () => {
        this.state = 'aim';
        this.hint.setText(Theme.pick('Drag toward the fire, then let go', 'Drag toward the monster, then let go!'));
      }
    });
  }

  throwBall(vx, vy) {
    this.state = 'flying';
    this.v = { x: vx, y: vy };
    this.hint.setText('');
    this.bowl.whoosh();
  }

  update(time, delta) {
    if (!this.writing) this.rest.tick(delta);
    if (this.state !== 'flying') return;
    const dt = Math.min(delta, 40) / 1000;
    const b = this.ball;
    const v = this.v;
    const r = 26;
    const prevY = b.y;
    v.x += this.wind * dt;
    v.y += TossScene.GRAVITY * dt;
    b.x += v.x * dt;
    b.y += v.y * dt;
    b.rotation += v.x * dt * 0.012;

    const left = this.binX - this.binHalf;
    const right = this.binX + this.binHalf;

    if (prevY < this.binTop && b.y >= this.binTop && v.y > 0) {
      const dx = b.x - this.binX;
      if (Math.abs(dx) < this.binHalf - r * 0.55) {
        this.scored();
        return;
      }
      if (Math.abs(dx) < this.binHalf + r * 0.8) {
        b.y = this.binTop - 2;
        v.y = -Math.abs(v.y) * 0.35;
        v.x = Math.sign(dx || 1) * 200 + v.x * 0.25;
        this.bowl.thunk(0.5);
        this.bowl.bounce(1.6);
      }
    }

    if (b.y > this.binTop && b.y < this.groundY && b.x + r > left - 4 && b.x - r < right + 4) {
      if (b.x < this.binX) {
        b.x = left - 4 - r;
        v.x = -Math.abs(v.x) * 0.4;
      } else {
        b.x = right + 4 + r;
        v.x = Math.abs(v.x) * 0.4;
      }
      this.bowl.thunk(0.35);
    }

    if (b.y >= this.groundY - r) {
      b.y = this.groundY - r;
      if (Math.abs(v.y) > 260) {
        v.y = -Math.abs(v.y) * 0.3;
        v.x *= 0.7;
        this.bowl.thunk(0.15);
      } else {
        v.y = 0;
        v.x *= 1 - 3 * dt;
        if (Math.abs(v.x) < 25) this.missed();
      }
    }
    if (b.x < -80 || b.x > Layout.W(this) + 80) this.missed();
  }

  scored() {
    this.state = 'scored';
    const b = this.ball;
    if (this.kids) {
      this.tweens.add({ targets: b, y: this.binTop + 50, scale: 0.5, alpha: 0, duration: 260, onComplete: () => b.destroy() });
      this.flames.start();
      this.time.delayedCall(650, () => this.flames.stop());
      this.bowl.munch();
      this.time.delayedCall(250, () => this.drawMonster(true));
      this.tweens.add({ targets: this.binG, scaleY: 0.94, y: this.groundY * 0.06, duration: 120, yoyo: true, repeat: 2 });
      this.time.delayedCall(700, () => this.bowl.sparkle());
    } else {
      this.burn(b);
    }

    this.streak += 1;
    BestScores.submit('toss', this.streak);
    this.updateHud();
    const short = this.worry.length > 26 ? this.worry.slice(0, 24) + '…' : this.worry;
    UIKit.floatText(this, this.L.paper.x, this.L.hintY - 100, Theme.pick('Gone', 'Yum!'), Palette.SAFFRON, 52);
    this.hint.setText(Theme.pick(`"${short}" is ash now`, `The monster ate "${short}"`));

    this.time.delayedCall(1800, () => {
      this.binG.setScale(1).setY(0);
      const maxW = Math.min(this.kids ? 260 : 420, 60 + this.streak * (this.kids ? 30 : 45));
      this.placeBin(Phaser.Math.Between(this.L.binRange[0], this.L.binRange[1]));
      this.setWind(this.streak > 0 ? Phaser.Math.Between(-maxW, maxW) : 0);
      this.worryIndex = (this.worryIndex + 1) % this.worries.length;
      this.worry = this.worries[this.worryIndex];
      this.paper = this.makePaper(this.worry);
    });
  }

  /* ---------- the fire (Grown-ups) ---------- */

  startFireSound() {
    if (this.kids || this.fireSnd || !this.bowl.ctx) return;
    this.fireSnd = this.bowl.startFire();
    if (this.fireSnd) this.fireSnd.set(0.22);
  }

  /** 0 = the quiet idle fire, 1 = a full blaze. */
  setBlaze(v) {
    this.blaze = v;
    if (this.glow) this.glow.setScale(1.3 * (1 + v * 1.3)).setAlpha(0.3 + v * 0.5);
    if (this.idleFire) this.idleFire.setFrequency(Math.max(14, 55 - v * 40), 1 + Math.round(v));
    if (v > 0.05) {
      if (!this.flames.emitting) this.flames.start();
      this.flames.setFrequency(Math.max(14, 70 - v * 56), 1 + Math.round(v * 2));
    } else if (this.flames.emitting) {
      this.flames.stop();
    }
    if (this.fireSnd) this.fireSnd.set(0.22 + v * 0.78);
  }

  /**
   * The paper drops in, catches at the edges, glows, blackens and goes up as
   * ash and smoke while the fire swells and then settles back down.
   */
  burn(b) {
    this.startFireSound();
    if (this.fireSnd) this.fireSnd.whoomph();
    this.tweens.add({ targets: b, x: this.binX, y: this.binTop + 6, scale: 0.75, rotation: b.rotation + 1.2, duration: 260, ease: 'Quad.In' });
    const char = { t: 0 };
    this.tweens.add({
      targets: char,
      t: 1,
      delay: 200,
      duration: 900,
      onUpdate: () => {
        // paper → hot orange → charred black
        const c1 = Phaser.Display.Color.ValueToColor(0xffffff);
        const c2 = Phaser.Display.Color.ValueToColor(0xff9a3c);
        const c3 = Phaser.Display.Color.ValueToColor(0x2a1a10);
        const t = char.t;
        const c = t < 0.5 ? Phaser.Display.Color.Interpolate.ColorWithColor(c1, c2, 100, t * 200) : Phaser.Display.Color.Interpolate.ColorWithColor(c2, c3, 100, (t - 0.5) * 200);
        b.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        b.setScale(0.75 - t * 0.45);
        b.y = this.binTop + 6 + t * 30;
      },
      onComplete: () => b.destroy()
    });
    const blaze = { v: 0 };
    this.tweens.chain({
      targets: blaze,
      tweens: [
        { v: 1, duration: 420, ease: 'Sine.Out', onUpdate: () => this.setBlaze(blaze.v) },
        { v: 0.85, duration: 700, ease: 'Sine.InOut', onUpdate: () => this.setBlaze(blaze.v) },
        { v: 0, duration: 1500, ease: 'Sine.In', onUpdate: () => this.setBlaze(blaze.v), onComplete: () => this.setBlaze(0) }
      ]
    });
    this.time.delayedCall(450, () => {
      if (this.ash) this.ash.explode(16, this.binX, this.binTop);
      if (this.smoke) this.smoke.start();
    });
    this.time.delayedCall(2300, () => this.smoke && this.smoke.stop());
    this.time.delayedCall(900, () => this.bowl.strike(262, 0.09, 4));
  }

  missed() {
    if (this.state !== 'flying') return;
    this.state = 'missed';
    if (this.streak > 0) UIKit.toast(this, `Streak of ${this.streak} ended. The worry is still ${Theme.pick('crumpled', 'scrunched')}, so try again.`, 250, 2200);
    this.streak = 0;
    this.updateHud();
    this.hint.setText(Theme.pick('Close. Try again', 'So close! Try again'));
    const b = this.ball;
    this.tweens.add({
      targets: b,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        b.setPosition(this.throwAt.x, this.throwAt.y - 80).setAlpha(0).setRotation(0);
        this.tweens.add({
          targets: b,
          y: this.throwAt.y,
          alpha: 1,
          duration: 350,
          ease: 'Bounce.Out',
          onComplete: () => {
            this.state = 'aim';
            this.hint.setText(Theme.pick('Drag toward the fire, then let go', 'Drag toward the monster, then let go!'));
          }
        });
      }
    });
  }
}
