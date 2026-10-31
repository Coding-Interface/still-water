/**
 * Theme — who is playing. Two profiles:
 *   adults  "Grown-ups": the night lake, quiet serif type, muted colours.
 *   kids    "Kids": a bright day at the lake, chunky rounded type with outlines,
 *           candy colours, friendlier words and kid-friendly game skins.
 * Theme.apply() rewrites the Palette tokens, so scenes created afterwards pick
 * up the new look. The choice is remembered in this browser.
 */
class Theme {
  static KEY = 'still-water-profile-v1';
  static profile = 'adults';
  static chosen = false;
  static outline = false;
  static ADULT = null;

  static KIDS = {
    NIGHT: 0x3f5bd9, // a bright royal blue for cards, buttons and panels (never a dark night in Kids)
    SKY_TOP: 0x45b6f0,
    SKY_LOW: 0xc2ecff,
    WATER_TOP: 0x3fc0d0,
    WATER_DEEP: 0x1a74a0,
    HILLS: 0x5cc067,
    MOON: 0xffffff,
    MIST: 0xdcefff,
    SUN: 0xffd84a,
    OUTLINE: 0x1d2458,
    BG_TOP: 0x58c2f6,
    BG_BOTTOM: 0x2d74d6,
    LOTUS: 0xff6fa8,
    LOTUS_DEEP: 0xe2468a,
    LOTUS_PALE: 0xffd3e4,
    SAFFRON: 0xffc533,
    LEAF: 0x3faa5a,
    LEAF_LIGHT: 0x8fe39a,
    SAND: 0xf5df9f,
    SAND_DARK: 0xd6b56e,
    SAND_SHADOW: 0xb8914f,
    SAND_LIGHT: 0xfff5d4,
    WOOD: 0x2fa3c8,
    WOOD_DARK: 0x1d6f99,
    STONE: 0xffa98a,
    STONE_DARK: 0xe9795a,
    POND: 0x31b8c8,
    POND_DEEP: 0x167f9e,
    KOI_WHITE: 0xffffff,
    KOI_ORANGE: 0xff8a3d,
    KOI_RED: 0xff4f6a,
    KOI_GOLD: 0xffd23f,
    KOI_INK: 0x5a4fcf,
    KOI_BROWN: 0x3fd0a0,
    FONT_DISPLAY: '"Fredoka", "Baloo 2", "Trebuchet MS", system-ui, sans-serif',
    FONT_BODY: '"Fredoka", "Baloo 2", "Trebuchet MS", system-ui, sans-serif'
  };

  /** Bright colours for confetti, candy and toy blocks. */
  static CANDY = [0xff6fa8, 0xffc533, 0x5fd38a, 0x4fb6ff, 0xa77bff, 0xff8a3d];

  static get kids() {
    return Theme.profile === 'kids';
  }

  static load() {
    try {
      const v = window.localStorage.getItem(Theme.KEY);
      if (v === 'kids' || v === 'adults') {
        Theme.chosen = true;
        return v;
      }
    } catch (e) {
      /* storage unavailable */
    }
    return null;
  }

  static save(profile) {
    Theme.chosen = true;
    try {
      window.localStorage.setItem(Theme.KEY, profile);
    } catch (e) {
      /* storage unavailable */
    }
  }

  static apply(profile) {
    if (!Theme.ADULT) {
      Theme.ADULT = {};
      Object.keys(Palette).forEach((k) => (Theme.ADULT[k] = Palette[k]));
    }
    Theme.profile = profile === 'kids' ? 'kids' : 'adults';
    const src = Theme.kids ? Object.assign({}, Theme.ADULT, Theme.KIDS) : Theme.ADULT;
    Object.keys(src).forEach((k) => (Palette[k] = src[k]));
    Theme.outline = Theme.kids;
    try {
      document.documentElement.dataset.profile = Theme.profile;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', Theme.kids ? '#45b6f0' : '#0c1620');
    } catch (e) {
      /* ignore */
    }
  }

  /** Choose a value by profile: Theme.pick(forGrownUps, forKids). */
  static pick(adults, kids) {
    return Theme.kids ? kids : adults;
  }

  static label(profile = Theme.profile) {
    return profile === 'kids' ? 'Kids' : 'Grown-ups';
  }

  /** Copy an entry with its kids overrides applied, when playing as Kids. */
  static entry(e) {
    if (!e) return e;
    return Theme.kids && e.kids ? Object.assign({}, e, e.kids) : e;
  }
}
