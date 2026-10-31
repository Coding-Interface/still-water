/**
 * Palette — colours and type faces shared by every scene.
 * These are the Grown-ups values; Theme.apply('kids') swaps them for the Kids
 * palette at runtime, so always read Palette.X when a scene is created.
 */
class Palette {
  static NIGHT = 0x0c1620; // panels and dark surfaces
  static SKY_TOP = 0x0a1420;
  static SKY_LOW = 0x1d3446;
  static WATER_TOP = 0x14283a;
  static WATER_DEEP = 0x070f17;
  static HILLS = 0x0d1a26;
  static MOON = 0xe9e4d6; // primary text and light strokes
  static MIST = 0x7d9aa8; // secondary text
  static SUN = 0xe9e4d6; // the moon by night, the sun by day
  static OUTLINE = 0x0c1620; // text outline (Kids only)
  static BG_TOP = 0x1b2c3d; // plain game backgrounds
  static BG_BOTTOM = 0x0c1620;
  static LOTUS = 0xe8a5b5;
  static LOTUS_DEEP = 0xc56f8a;
  static LOTUS_PALE = 0xf7d6de;
  static SAFFRON = 0xe8ae4c;
  static LEAF = 0x3f7a5f;
  static LEAF_LIGHT = 0x6fae8c;

  // Sand garden
  static SAND = 0xd8c8a6;
  static SAND_DARK = 0x9c875f;
  static SAND_SHADOW = 0x7d6a48;
  static SAND_LIGHT = 0xf3e9d2;
  static WOOD = 0x4a3324;
  static WOOD_DARK = 0x231811;
  static STONE = 0x6e7376;
  static STONE_DARK = 0x464b4e;

  // Koi pond
  static POND = 0x1d4a46;
  static POND_DEEP = 0x0b2524;
  static KOI_WHITE = 0xf4efe6;
  static KOI_ORANGE = 0xe8743b;
  static KOI_RED = 0xd4432b;
  static KOI_GOLD = 0xe9b949;
  static KOI_INK = 0x24272a;
  static KOI_BROWN = 0xa8774a;

  static FONT_DISPLAY = '"Marcellus", "Palatino Linotype", Georgia, serif';
  static FONT_BODY = '"Figtree", system-ui, -apple-system, "Segoe UI", sans-serif';

  /** Convert 0xRRGGBB to "#rrggbb" for Phaser text styles. */
  static css(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
  }
}
