/**
 * SoundBowl — every sound in the game, synthesised with Web Audio (no files).
 *
 * Cross-device handling:
 *  - Unlocks on ANY user gesture (touch, click, key), as iOS and Chrome require.
 *  - iPhone/iPad: plays through the ringer/silent switch (audio session "playback"
 *    plus a silent looping <audio> element on older iOS). The in-game mute still works.
 *  - Suspends when the tab or app is hidden, resumes on return.
 *  - Never queues sounds while the context is suspended (no burst of stale sounds).
 *  - A master limiter keeps stacked crashes from clipping; a voice cap keeps
 *    fast swipes (bubbles, slices) from overloading slow phones.
 *  - Remembers the mute choice in this browser.
 */
class SoundBowl {
  static PREF_KEY = 'still-water-sound-v1';
  static wav = null;

  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.keepAlive = null;
    this.primed = false;
    this.level = 0.6;
    this.recent = [];
    this.muted = SoundBowl.readPref();
    this.bindUnlock();
    this.bindVisibility();
  }

  static readPref() {
    try {
      return window.localStorage.getItem(SoundBowl.PREF_KEY) === 'off';
    } catch (e) {
      return false;
    }
  }

  static isIOS() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /** A short silent WAV as a data URI, used to hold the iOS audio session open. */
  static silentWav() {
    if (SoundBowl.wav) return SoundBowl.wav;
    const n = 4000;
    const rate = 8000;
    const buf = new Uint8Array(44 + n);
    const dv = new DataView(buf.buffer);
    const put = (o, s) => {
      for (let i = 0; i < s.length; i++) buf[o + i] = s.charCodeAt(i);
    };
    put(0, 'RIFF');
    dv.setUint32(4, 36 + n, true);
    put(8, 'WAVE');
    put(12, 'fmt ');
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true);
    dv.setUint32(24, rate, true);
    dv.setUint32(28, rate, true);
    dv.setUint16(32, 1, true);
    dv.setUint16(34, 8, true);
    put(36, 'data');
    dv.setUint32(40, n, true);
    buf.fill(128, 44);
    let s = '';
    for (let i = 0; i < buf.length; i += 1024) s += String.fromCharCode.apply(null, buf.subarray(i, i + 1024));
    SoundBowl.wav = 'data:audio/wav;base64,' + btoa(s);
    return SoundBowl.wav;
  }

  bindUnlock() {
    const handler = () => this.unlock();
    ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'].forEach((type) =>
      window.addEventListener(type, handler, { capture: true, passive: true })
    );
  }

  bindVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      try {
        if (document.hidden) {
          this.ctx.suspend();
          if (this.keepAlive) this.keepAlive.pause();
        } else {
          this.unlock();
        }
      } catch (e) {
        /* ignore */
      }
    });
  }

  createContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch (e) {
      /* not supported */
    }
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch (e) {
      this.ctx = new AC();
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.level;
    // a gentle top-end roll-off takes the edge off every click and crash
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 6500;
    soften.Q.value = 0.5;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 20;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.25;
    this.master.connect(soften);
    soften.connect(limiter);
    // a little room around everything, so sounds bloom instead of stopping dead
    try {
      const verb = ctx.createConvolver();
      verb.buffer = this.impulse(2.6);
      const wet = ctx.createGain();
      wet.gain.value = 0.2;
      soften.connect(verb);
      verb.connect(wet);
      wet.connect(limiter);
    } catch (e) {
      /* no reverb on this device */
    }
    limiter.connect(ctx.destination);
  }

  /** A soft, dark reverb tail: decaying noise, a little darker on each side. */
  impulse(secs) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * secs);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += ((Math.random() * 2 - 1) - lp) * 0.35;
        d[i] = lp * Math.pow(1 - i / len, 3.2);
      }
    }
    return buf;
  }

  /** Brown noise: a deep, soft rumble that sounds like water rather than hiss. */
  brown() {
    if (!this.brownBuf) {
      const len = this.ctx.sampleRate * 2;
      this.brownBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.brownBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.2;
      }
    }
    return this.brownBuf;
  }

  unlock() {
    try {
      if (!this.ctx) this.createContext();
      const ctx = this.ctx;
      if (!ctx) return;
      if (ctx.state !== 'running' && !document.hidden) {
        const p = ctx.resume();
        if (p && p.catch) p.catch(() => {});
      }
      if (!this.primed) {
        const b = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = b;
        src.connect(ctx.destination);
        src.start(0);
        this.primed = true;
      }
      this.startKeepAlive();
    } catch (e) {
      /* audio unavailable: the game runs silently */
    }
  }

  startKeepAlive() {
    if (!SoundBowl.isIOS() || this.muted || document.hidden) return;
    try {
      if (!this.keepAlive) {
        const a = document.createElement('audio');
        a.setAttribute('playsinline', '');
        a.setAttribute('x-webkit-airplay', 'deny');
        a.loop = true;
        a.preload = 'auto';
        a.src = SoundBowl.silentWav();
        this.keepAlive = a;
      }
      if (this.keepAlive.paused) {
        const p = this.keepAlive.play();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {
      /* ignore */
    }
  }

  ready() {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  /** Voice cap: at most 7 short effects in any 60 ms window. */
  gate() {
    const now = this.ctx.currentTime;
    this.recent = this.recent.filter((t) => now - t < 0.06);
    if (this.recent.length >= 7) return false;
    this.recent.push(now);
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      window.localStorage.setItem(SoundBowl.PREF_KEY, muted ? 'off' : 'on');
    } catch (e) {
      /* storage unavailable */
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.level, this.ctx.currentTime, 0.05);
    }
    if (muted && this.keepAlive) this.keepAlive.pause();
    if (!muted) this.unlock();
  }

  noise() {
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuf;
  }

  /** Filtered noise with a fast attack and exponential decay. Returns the filter. */
  burst(t, filterType, freq, dur, gain, q = 1, attack = 0.004) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.7, dur + 0.05);
    return f;
  }

  /** An oscillator gliding from f0 to f1 with a fast attack and decay. */
  tone(t, type, f0, f1, dur, gain) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /** A struck bowl: inharmonic partials, each a slightly detuned pair for the shimmer. */
  strike(base = 196, level = 0.2, decay = 7) {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const partials = [[1, 1], [2.76, 0.45], [5.4, 0.2], [8.93, 0.08]];
    partials.forEach(([ratio, amp], i) => {
      [0, 1.8].forEach((detune) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = base * ratio + detune * (i + 1);
        const gain = ctx.createGain();
        const d = decay / (1 + i * 0.6);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(level * amp * 0.5, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d);
        osc.connect(gain);
        gain.connect(this.master);
        osc.start(t);
        osc.stop(t + d + 0.05);
      });
    });
  }

  /** A small, bright bell for taps and beads. */
  tick() {
    if (!this.ready() || !this.gate()) return;
    this.strike(587, 0.06, 1.6);
  }

  /** A soft tone that rises with the in-breath and falls with the out-breath. */
  swell(secs, rising) {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const f0 = rising ? 146.8 : 196;
    const f1 = rising ? 196 : 146.8;
    const attack = Math.min(1, secs * 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.05, t + attack);
    gain.gain.setValueAtTime(0.05, t + Math.max(attack + 0.05, secs * 0.7));
    gain.gain.linearRampToValueAtTime(0.0001, t + secs);
    gain.connect(this.master);

    const fifth = ctx.createGain();
    fifth.gain.value = 0.35;
    fifth.connect(gain);

    [[1, gain], [1.5, fifth]].forEach(([ratio, dest]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f0 * ratio, t);
      osc.frequency.linearRampToValueAtTime(f1 * ratio, t + secs);
      osc.connect(dest);
      osc.start(t);
      osc.stop(t + secs + 0.05);
    });
  }

  /** Bubble-wrap pop: a soft band of noise with a little low thump under it. */
  pop(big = false) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    this.burst(t, 'bandpass', (1100 + Math.random() * 900) * (big ? 0.55 : 1), big ? 0.1 : 0.06, big ? 0.4 : 0.25, 1.3);
    this.tone(t, 'sine', big ? 160 : 230, 60, 0.1, big ? 0.22 : 0.12);
  }

  /** A drop landing in water: a little rising "bloop" on a pentatonic note. */
  plip(level = 1) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    const notes = [587.33, 659.25, 783.99, 880, 1046.5];
    const f = notes[Math.floor(Math.random() * notes.length)];
    this.tone(t, 'sine', f * 0.7, f, 0.09, 0.09 * level);
    this.tone(t + 0.07, 'sine', f, f * 0.98, 0.35, 0.04 * level);
  }

  /** A soft stone or wood knock, rounded and warm. level 0..1 */
  thunk(level = 0.5) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    const f = 170 + Math.random() * 50;
    this.tone(t, 'sine', f * 1.15, f * 0.9, 0.2, 0.26 * level + 0.02);
    this.tone(t, 'sine', f * 2.76, f * 2.6, 0.06, 0.05 * level);
    this.burst(t, 'lowpass', 500, 0.04, 0.05 * level + 0.01);
  }

  /** A mellow marimba-like tok for turning tiles and pressing pieces into place. */
  tok(level = 0.6) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.004;
    const notes = [392, 440, 523.25, 587.33, 659.25];
    const f = notes[Math.floor(Math.random() * notes.length)];
    this.tone(t, 'sine', f, f, 0.32, 0.09 * level);
    this.tone(t, 'sine', f * 4, f * 4, 0.05, 0.015 * level);
  }

  /** A stone settling into the lake: a deep, round "ploonk" and a few bubbles. */
  splash() {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    this.tone(t, 'sine', 300, 120, 0.4, 0.13);
    const f = this.burst(t, 'lowpass', 900, 0.45, 0.07, 0.7, 0.03);
    f.frequency.exponentialRampToValueAtTime(220, t + 0.4);
    [[0.14, 698.46], [0.24, 880], [0.36, 1046.5]].forEach(([d, n]) => this.tone(t + d, 'sine', n * 0.7, n, 0.12, 0.03));
  }

  /** Breaking crockery or glass: a soft crash plus scattered tinkles. */
  shatter(level = 1, bright = true) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    this.burst(t, 'bandpass', bright ? 3000 : 1400, 0.22, 0.24 * level, 0.7);
    this.burst(t, 'bandpass', bright ? 1500 : 800, 0.1, 0.2 * level, 0.8);
    const notes = bright ? [1568, 1760, 2093, 2349, 2637, 3136] : [784, 880, 1046.5, 1174.7];
    const pings = bright ? 5 : 3;
    for (let i = 0; i < pings; i++) {
      const f = notes[Math.floor(Math.random() * notes.length)];
      this.tone(t + Math.random() * 0.16, 'sine', f, f, 0.2 + Math.random() * 0.3, 0.035 * level);
    }
    this.tone(t, 'sine', 170, 80, 0.14, 0.16 * level);
  }

  /** A blade through something soft. */
  slice() {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    const f = this.burst(t, 'bandpass', 1800, 0.09, 0.14, 0.9);
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.08);
    this.tone(t, 'sine', 1200 + Math.random() * 200, 420, 0.1, 0.06);
    this.tone(t + 0.01, 'sine', 240, 100, 0.12, 0.1);
  }

  /** Air moving past fast. */
  whoosh() {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    const f = this.burst(t, 'bandpass', 500, 0.22, 0.16, 1.2);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.2);
  }

  /** Paper being scrunched. */
  crinkle() {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    for (let i = 0; i < 8; i++) {
      this.burst(t + Math.random() * 0.24, 'bandpass', 1600 + Math.random() * 1800, 0.03, 0.16, 1.6);
    }
  }

  /** Ball off a paddle. */
  bounce(pitch = 1) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    this.tone(t, 'sine', 440 * pitch, 420 * pitch, 0.09, 0.1);
    this.tone(t, 'triangle', 880 * pitch, 860 * pitch, 0.05, 0.03);
  }

  /** Glass cracking but holding: a small glassy tink. */
  crack() {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    this.burst(t, 'bandpass', 2600, 0.04, 0.1, 1.2);
    this.tone(t, 'sine', 2093, 2060, 0.18, 0.04);
  }

  /** A flare of flame with a few crackles. */
  fire() {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.3);
    f.frequency.exponentialRampToValueAtTime(400, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t, 0, 1.6);
    for (let i = 0; i < 7; i++) this.burst(t + 0.1 + Math.random() * 1.1, 'bandpass', 1800, 0.02, 0.1, 1.5);
  }

  /** A clear bell note at frequency f. */
  chime(f, level = 0.08) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    this.tone(t, 'sine', f, f, 1.4, level);
    this.tone(t, 'triangle', f * 2, f * 2, 0.5, level * 0.25);
  }

  /** A short rising arpeggio for a solved puzzle or a cleared level. */
  fanfare() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + 0.01;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone(t + i * 0.09, 'sine', f, f, 1.2, 0.09);
      this.tone(t + i * 0.09, 'triangle', f * 2, f * 2, 0.4, 0.02);
    });
  }

  /**
   * A layered, satisfying bubble-wrap pop.
   *   size  0..1  bigger bubbles pop lower and fuller
   *   step  scale degree for chained pops (pitch climbs a pentatonic scale), or null
   *   kids  adds a cheerful upward "bloop" and a sparkle
   */
  bubblePop(size = 0.5, step = null, kids = false) {
    if (!this.ready() || !this.gate()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.004;
    const scale = [0, 2, 4, 7, 9];
    const semis = step == null ? Math.random() * 3 - 1.5 : scale[step % 5] + 12 * Math.floor(step / 5);
    const pitch = Math.pow(2, Math.min(semis, 24) / 12);
    const body = (520 - size * 220) * pitch;

    // 1. the snap: a very short click, crisp but not sharp
    this.burst(t, 'bandpass', 3000, 0.012, 0.32, 1);
    // 2. the pop: a resonant body that drops in pitch
    this.tone(t, 'sine', body * 1.6, body * 0.45, 0.07 + size * 0.04, 0.32);
    this.tone(t, 'triangle', body * 3.2, body * 1.2, 0.035, 0.06);
    // 3. the air: a little puff of escaping air
    const f = this.burst(t + 0.004, 'bandpass', 1500 - size * 500, 0.08 + size * 0.05, 0.15, 1.6);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.1);
    // 4. a low thump you feel more than hear
    this.tone(t, 'sine', 140 - size * 40, 55, 0.09, 0.2 + size * 0.1);

    if (kids) {
      const b = 700 * pitch;
      this.tone(t + 0.02, 'sine', b, b * 1.9, 0.11, 0.08);
    }
  }

  /* ---------- pop and slice variety ---------- */

  /** Pitch multiplier for a step up a pentatonic scale (null = a little random). */
  static penta(step) {
    if (step == null) return Math.pow(2, (Math.random() * 3 - 1.5) / 12);
    const scale = [0, 2, 4, 7, 9];
    const semis = scale[step % 5] + 12 * Math.floor(step / 5);
    return Math.pow(2, Math.min(semis, 24) / 12);
  }

  /**
   * A family of bubble pops, so every sheet sounds different.
   *   kind: snap | cork | squeak | bloop | kiss | twinkle | boing
   *   size 0..1, step = chained pops climb a scale
   */
  popKind(kind, size = 0.5, step = null) {
    if (!this.ready() || !this.gate()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.004;
    const p = SoundBowl.penta(step);
    switch (kind) {
      case 'cork': {
        // a hollow "pok", like a finger popping out of a cheek
        const f = (640 - size * 200) * p;
        this.tone(t, 'sine', f * 1.25, f * 0.62, 0.09 + size * 0.04, 0.3);
        this.tone(t, 'sine', f * 2.4, f * 1.9, 0.04, 0.05);
        this.burst(t, 'lowpass', 1400, 0.02, 0.12, 0.8, 0.002);
        break;
      }
      case 'squeak': {
        // a rubbery squeak that ends in a soft pop
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420 * p, t);
        osc.frequency.exponentialRampToValueAtTime(980 * p, t + 0.07);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + 0.1);
        this.burst(t + 0.07, 'bandpass', 2200, 0.015, 0.2, 1, 0.002);
        this.tone(t + 0.07, 'sine', 160, 60, 0.08, 0.16);
        break;
      }
      case 'bloop': {
        // a bubble rising through water
        this.tone(t, 'sine', 280 * p, 820 * p, 0.12, 0.2);
        this.tone(t + 0.1, 'sine', 820 * p, 800 * p, 0.12, 0.04);
        break;
      }
      case 'kiss': {
        // "mwah": a soft smack with a sweet rise
        this.burst(t, 'bandpass', 2600, 0.02, 0.18, 1.4, 0.002);
        this.tone(t + 0.01, 'sine', 700 * p, 1400 * p, 0.07, 0.12);
        this.tone(t + 0.06, 'sine', 1400 * p, 1350 * p, 0.18, 0.03);
        break;
      }
      case 'twinkle': {
        this.burst(t, 'bandpass', 3000, 0.012, 0.2, 1, 0.002);
        [1, 1.25, 1.5].forEach((m, i) => this.tone(t + i * 0.035, 'sine', 1046.5 * p * m, 1046.5 * p * m, 0.22, 0.05));
        break;
      }
      case 'boing': {
        // a springy wobble
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 240 * p;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 16;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(90 * p, t);
        depth.gain.exponentialRampToValueAtTime(4, t + 0.35);
        lfo.connect(depth);
        depth.connect(osc.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        lfo.start(t);
        osc.stop(t + 0.4);
        lfo.stop(t + 0.4);
        break;
      }
      default: {
        // snap: the classic, crisp but soft
        const body = (520 - size * 220) * p;
        this.burst(t, 'bandpass', 2800, 0.012, 0.28, 1, 0.002);
        this.tone(t, 'sine', body * 1.6, body * 0.45, 0.07 + size * 0.04, 0.28);
        this.tone(t, 'sine', 130 - size * 40, 55, 0.09, 0.18 + size * 0.1);
      }
    }
  }

  /** A deep, satisfying mega pop with a little shimmer after it. */
  megaPop() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + 0.004;
    this.burst(t, 'bandpass', 1600, 0.03, 0.35, 0.8, 0.002);
    this.tone(t, 'sine', 220, 50, 0.35, 0.32);
    this.tone(t, 'sine', 90, 40, 0.3, 0.25);
    [784, 1046.5, 1318.5].forEach((f, i) => this.tone(t + 0.12 + i * 0.05, 'sine', f, f, 0.3, 0.035));
  }

  /** Coins: a quick bright arpeggio. */
  coins() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + 0.004;
    [1318.5, 1568, 2093, 2637].forEach((f, i) => {
      this.tone(t + i * 0.055, 'triangle', f, f, 0.18, 0.04);
      this.tone(t + i * 0.055, 'sine', f * 2, f * 2, 0.08, 0.012);
    });
  }

  /** A balloon-ish slow leak: a wobbly whistle sliding down. secs long. */
  leak(secs = 1) {
    if (!this.ready()) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + secs);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const depth = ctx.createGain();
    depth.gain.value = 45;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
    g.gain.setValueAtTime(0.05, t + secs * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + secs + 0.05);
    lfo.stop(t + secs + 0.05);
    this.burst(t, 'bandpass', 2400, secs, 0.03, 2, 0.05);
  }

  /**
   * A family of slice sounds. Each carries a note, and step climbs a scale, so a
   * long swipe through many items plays a run.
   *   kind: swish | juicy | tink | rip | bloop | giggle
   */
  sliceKind(kind, step = 0) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.004;
    const p = SoundBowl.penta(step);
    const note = 523.25 * p;
    switch (kind) {
      case 'juicy': {
        const f = this.burst(t, 'lowpass', 1800, 0.09, 0.16, 0.8, 0.003);
        f.frequency.exponentialRampToValueAtTime(400, t + 0.08);
        this.tone(t, 'sine', 300, 120, 0.1, 0.14);
        this.tone(t + 0.03, 'sine', note * 0.6, note * 0.9, 0.12, 0.05);
        break;
      }
      case 'tink': {
        this.burst(t, 'bandpass', 2800, 0.03, 0.08, 1.2, 0.002);
        this.tone(t, 'sine', note * 2, note * 2, 0.35, 0.05);
        this.tone(t + 0.02, 'sine', note * 3, note * 3, 0.2, 0.02);
        break;
      }
      case 'rip': {
        for (let i = 0; i < 5; i++) this.burst(t + i * 0.018, 'bandpass', 1400 + i * 300, 0.02, 0.1, 1.5, 0.002);
        this.tone(t + 0.06, 'sine', note, note, 0.25, 0.04);
        break;
      }
      case 'bloop': {
        this.tone(t, 'sine', note * 0.5, note * 1.2, 0.1, 0.16);
        this.burst(t, 'bandpass', 2000, 0.02, 0.1, 1, 0.002);
        break;
      }
      case 'giggle': {
        [1, 1.12, 1.26].forEach((m, i) => this.tone(t + i * 0.05, 'sine', note * m, note * m * 1.06, 0.06, 0.08));
        break;
      }
      default: {
        // swish: air across a blade, landing on a soft bell note
        const f = this.burst(t, 'bandpass', 1200, 0.1, 0.12, 0.9, 0.006);
        f.frequency.exponentialRampToValueAtTime(3600, t + 0.09);
        this.tone(t + 0.02, 'sine', note, note, 0.4, 0.05);
        this.tone(t + 0.02, 'sine', note * 2, note * 2, 0.12, 0.012);
      }
    }
  }

  /** Time slowing down: a soft shimmer falling and a low swell. */
  frost() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + 0.01;
    [2637, 2349, 2093, 1760, 1568, 1318.5].forEach((f, i) => this.tone(t + i * 0.06, 'sine', f, f, 0.4, 0.03));
    this.tone(t, 'sine', 196, 147, 1.2, 0.06);
  }

  /** A quick rising run for a frenzy. */
  rise() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + 0.01;
    [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7].forEach((f, i) => this.tone(t + i * 0.045, 'triangle', f, f, 0.18, 0.05));
  }

  /** A soft, sad-but-gentle low note (a fish swims off, a miss). */
  aww() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + 0.01;
    this.tone(t, 'sine', 392, 330, 0.25, 0.07);
    this.tone(t + 0.18, 'sine', 330, 262, 0.4, 0.06);
  }

  /** Soft squish when a bubble is pressed. */
  squish() {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.004;
    this.burst(t, 'lowpass', 600, 0.06, 0.12, 0.8);
    this.tone(t, 'sine', 180, 120, 0.06, 0.06);
  }

  /** A few bright twinkles: stars, sparkles, rewards. */
  sparkle(level = 1) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.005;
    [1568, 2093, 2637, 3136].forEach((f, i) => this.tone(t + i * 0.045, 'sine', f, f, 0.25, 0.035 * level));
  }

  /** A toy wooden block knock (Kids skins). */
  toy(level = 0.6) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.004;
    const f = 600 + Math.random() * 300;
    this.tone(t, 'triangle', f, f * 0.9, 0.09, 0.22 * level + 0.03);
    this.tone(t, 'sine', f * 2.4, f * 2.2, 0.04, 0.06 * level);
    this.burst(t, 'bandpass', 2000, 0.012, 0.07 * level, 2);
  }

  /** A toy block popping into confetti (Kids). */
  confettiPop(level = 1) {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.004;
    const f = 500 + Math.random() * 200;
    this.tone(t, 'sine', f, f * 2.2, 0.12, 0.16 * level);
    this.burst(t, 'bandpass', 2400, 0.05, 0.1 * level, 1);
    [1760, 2349].forEach((p, i) => this.tone(t + 0.05 + i * 0.05, 'sine', p, p, 0.18, 0.03 * level));
  }

  /** A frog's "ribbit" (Fish Friends). */
  croak() {
    if (!this.ready() || !this.gate()) return;
    const t = this.ctx.currentTime + 0.01;
    this.tone(t, 'triangle', 200, 150, 0.13, 0.12);
    this.tone(t + 0.15, 'triangle', 220, 160, 0.13, 0.12);
  }

  /** The Worry Monster eating: three chomps and a happy hum. */
  munch() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + 0.01;
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.16;
      this.burst(s, 'lowpass', 700, 0.08, 0.16, 1);
      this.tone(s, 'sine', 220, 120, 0.09, 0.18);
    }
    this.tone(t + 0.55, 'triangle', 330, 440, 0.35, 0.08);
  }

  /**
   * A quiet brook: a deep, soft murmur (brown noise, well filtered) with the
   * occasional water-drop note on a pentatonic scale. Nothing hissy, nothing loud.
   * Returns { set(level 0..1), stop() }, or null before audio is unlocked.
   */
  startStream() {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.brown();
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 520;
    lp.Q.value = 0.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.23;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain);
    lfoGain.connect(lp.frequency);
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
    lfo.start();
    let level = 0;
    let alive = true;
    let timer = null;
    const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
    const drop = () => {
      if (!alive) return;
      if (level > 0.05 && this.ready()) {
        const t = ctx.currentTime + 0.01;
        const f = notes[Math.floor(Math.random() * notes.length)];
        this.tone(t, 'sine', f * 0.72, f, 0.1, 0.022 * level);
        this.tone(t + 0.08, 'sine', f, f * 0.99, 0.4, 0.009 * level);
      }
      timer = setTimeout(drop, 500 + Math.random() * 1400 / (0.4 + level));
    };
    timer = setTimeout(drop, 600);
    return {
      set: (v) => {
        level = Math.max(0, Math.min(1, v));
        try {
          g.gain.setTargetAtTime(level * 0.05, ctx.currentTime, 0.5);
        } catch (e) {
          /* ignore */
        }
      },
      stop: () => {
        alive = false;
        clearTimeout(timer);
        try {
          src.stop();
          lfo.stop();
          g.disconnect();
        } catch (e) {
          /* ignore */
        }
      }
    };
  }

  /**
   * A small fire that keeps burning: a low, warm rumble with soft wood crackles.
   * level 0..1 — about 0.2 for a quiet idle fire, 1 while something is burning.
   * Returns { set(level), whoomph(), stop() }, or null before audio is unlocked.
   */
  startFire() {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.brown();
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    lp.Q.value = 0.5;
    const flutter = ctx.createOscillator();
    flutter.frequency.value = 3.1;
    const flutterGain = ctx.createGain();
    flutterGain.gain.value = 90;
    flutter.connect(flutterGain);
    flutterGain.connect(lp.frequency);
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
    flutter.start();
    let level = 0;
    let alive = true;
    let timer = null;
    // crackles: tiny filtered pops, more and brighter as the fire grows
    const crackle = () => {
      if (!alive) return;
      if (level > 0.03 && this.ready()) {
        const t = ctx.currentTime + 0.01;
        const n = level > 0.6 && Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          this.burst(t + i * 0.03, 'bandpass', 900 + Math.random() * 1500 * (0.5 + level), 0.012 + Math.random() * 0.02, (0.03 + Math.random() * 0.05) * (0.4 + level), 2.2, 0.002);
        }
        if (Math.random() < 0.15 * level) this.tone(t, 'sine', 140 + Math.random() * 60, 90, 0.08, 0.04 * level); // a log settling
      }
      timer = setTimeout(crackle, 60 + Math.random() * (520 - 380 * level));
    };
    timer = setTimeout(crackle, 200);
    const api = {
      set: (v) => {
        level = Math.max(0, Math.min(1, v));
        try {
          g.gain.setTargetAtTime(0.03 + level * 0.12, ctx.currentTime, 0.25);
          lp.frequency.setTargetAtTime(320 + level * 520, ctx.currentTime, 0.3);
        } catch (e) {
          /* ignore */
        }
      },
      /** The soft rush of flames catching hold. */
      whoomph: () => {
        if (!this.ready()) return;
        const t = ctx.currentTime + 0.01;
        const f = this.burst(t, 'lowpass', 220, 1.1, 0.16, 0.7, 0.18);
        f.frequency.exponentialRampToValueAtTime(1100, t + 0.35);
        f.frequency.exponentialRampToValueAtTime(260, t + 1.05);
      },
      stop: () => {
        alive = false;
        clearTimeout(timer);
        try {
          src.stop();
          flutter.stop();
          g.disconnect();
        } catch (e) {
          /* ignore */
        }
      }
    };
    return api;
  }

  /**
   * A looping sand-scrape sound for the rake. Returns { set(level 0..1), stop() },
   * or null before audio is unlocked.
   */
  startRake() {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise();
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 650;
    bp.Q.value = 0.6;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 220;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(bp);
    bp.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
    return {
      set: (v) => {
        try {
          g.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.13, ctx.currentTime, 0.06);
        } catch (e) {
          /* ignore */
        }
      },
      stop: () => {
        try {
          src.stop();
          g.disconnect();
        } catch (e) {
          /* ignore */
        }
      }
    };
  }
}
