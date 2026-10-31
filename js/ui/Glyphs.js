/**
 * Glyphs — the small line icons for every game and practice, and the tab bar icons.
 * Drawn with Graphics at roughly 56 × 56 around (x, y).
 */
class Glyphs {
  static draw(g, id, x, y, color = Palette.LOTUS) {
    const c = color;
    g.lineStyle(2.5, c, 0.95);
    g.fillStyle(c, 0.95);
    switch (id) {
      case 'sama':
        g.strokeCircle(x, y, 26);
        g.strokeCircle(x, y, 13);
        break;
      case 'box':
        g.strokeRect(x - 22, y - 22, 44, 44);
        g.fillCircle(x - 22, y - 22, 4);
        break;
      case '478':
        g.fillCircle(x - 20, y, 5);
        g.fillCircle(x - 2, y, 8);
        g.fillCircle(x + 20, y, 11);
        break;
      case 'clouds':
        g.strokeEllipse(x - 8, y + 4, 40, 24);
        g.strokeEllipse(x + 10, y - 6, 36, 26);
        break;
      case 'mala':
        for (let i = 0; i < 10; i++) {
          const a = (i / 11) * Math.PI * 2 - Math.PI / 2 + (Math.PI * 2) / 11;
          g.fillCircle(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 3.5);
        }
        g.fillStyle(Palette.SAFFRON, 1);
        g.fillCircle(x, y - 24, 6);
        break;
      case 'sand':
        Glyphs.waves(g, x, y, 26, 13);
        break;
      case 'bubbles':
        [[-14, -12], [12, -12], [0, 10], [-26, 10], [26, 10]].forEach(([dx, dy], i) => {
          if (i === 2) g.fillCircle(x + dx, y + dy, 10);
          else g.strokeCircle(x + dx, y + dy, 10);
        });
        break;
      case 'koi':
        g.fillEllipse(x - 4, y, 40, 16);
        g.fillTriangle(x + 14, y, x + 28, y - 10, x + 28, y + 10);
        g.fillStyle(Palette.NIGHT, 1);
        g.fillCircle(x - 16, y - 2, 2.5);
        break;
      case 'cairn':
        g.fillRoundedRect(x - 26, y + 12, 52, 14, 7);
        g.fillRoundedRect(x - 18, y - 4, 38, 14, 7);
        g.fillRoundedRect(x - 12, y - 19, 24, 13, 6);
        g.fillCircle(x + 1, y - 28, 6);
        break;
      case 'smash':
        g.fillRoundedRect(x - 26, y + 14, 52, 8, 4);
        g.fillRoundedRect(x - 22, y + 2, 44, 8, 4);
        g.fillTriangle(x - 18, y - 14, x - 6, y - 22, x - 10, y - 8);
        g.fillTriangle(x + 4, y - 16, x + 18, y - 24, x + 14, y - 8);
        g.fillTriangle(x - 2, y - 26, x + 6, y - 30, x + 4, y - 20);
        break;
      case 'slice':
        g.fillCircle(x - 4, y + 4, 18);
        g.fillStyle(Palette.NIGHT, 1);
        g.fillRect(x - 30, y - 3, 60, 5);
        g.lineStyle(3, Palette.MOON, 0.9);
        g.lineBetween(x - 28, y + 22, x + 28, y - 22);
        break;
      case 'breaker':
        for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) g.fillRect(x - 27 + k * 19, y - 24 + r * 12, 16, 9);
        g.fillCircle(x + 6, y + 8, 5);
        g.fillRoundedRect(x - 16, y + 20, 32, 6, 3);
        break;
      case 'toss':
        g.strokeRect(x + 2, y - 2, 26, 28);
        g.fillStyle(Palette.SAFFRON, 1);
        g.fillTriangle(x + 8, y - 4, x + 15, y - 20, x + 22, y - 4);
        g.fillStyle(c, 0.95);
        g.fillCircle(x - 18, y - 16, 9);
        break;
      case 'lantern':
        g.fillRoundedRect(x - 14, y - 16, 28, 34, 10);
        g.lineBetween(x, y - 26, x, y - 16);
        g.fillStyle(Palette.SAFFRON, 1);
        g.fillCircle(x + 22, y - 18, 4);
        g.fillCircle(x - 24, y + 10, 3);
        break;
      case 'tangle':
        g.lineBetween(x - 22, y - 18, x + 20, y + 20);
        g.lineBetween(x - 22, y + 18, x + 22, y - 16);
        g.lineBetween(x - 22, y - 18, x - 22, y + 18);
        [[-22, -18], [20, 20], [-22, 18], [22, -16]].forEach(([dx, dy]) => g.fillCircle(x + dx, y + dy, 6));
        break;
      case 'mandala':
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.fillEllipse(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 12, 12);
        }
        g.fillStyle(Palette.SAFFRON, 1);
        g.fillCircle(x, y, 8);
        break;
      case 'flow':
        g.lineStyle(7, c, 0.95);
        g.lineBetween(x - 26, y, x, y);
        g.lineBetween(x, y, x, y + 24);
        g.lineBetween(x, y - 24, x, y);
        g.fillStyle(Palette.SAFFRON, 1);
        g.fillCircle(x, y - 24, 6);
        break;
      case 'feast':
        g.fillEllipse(x - 6, y + 6, 40, 16);
        g.fillTriangle(x + 12, y + 6, x + 26, y - 4, x + 26, y + 16);
        g.fillStyle(Palette.NIGHT, 1);
        g.fillCircle(x - 18, y + 4, 2.5);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(x - 10, y - 20, 11);
        g.fillStyle(Palette.SAFFRON, 1);
        g.fillCircle(x - 10, y - 20, 5);
        break;
      case 'river':
        // a spout, a drawn channel and a pot
        g.fillRect(x - 22, y - 30, 8, 12);
        g.lineStyle(5, c, 0.95);
        g.lineBetween(x - 24, y - 6, x + 12, y + 6);
        g.fillStyle(Palette.SAFFRON, 1);
        g.fillCircle(x - 18, y - 13, 3.5);
        g.fillCircle(x - 6, y - 4, 3);
        g.fillStyle(c, 0.95);
        g.fillTriangle(x + 6, y + 14, x + 30, y + 14, x + 26, y + 30);
        g.fillTriangle(x + 6, y + 14, x + 26, y + 30, x + 10, y + 30);
        g.lineStyle(2.5, c, 0.95);
        g.lineBetween(x + 18, y + 14, x + 18, y + 2);
        g.fillCircle(x + 18, y, 4);
        break;
      default:
        g.strokeCircle(x, y, 24);
    }
  }

  static waves(g, x, y, half, gap) {
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      for (let k = 0; k <= 12; k++) {
        const px = x - half + k * ((half * 2) / 12);
        const py = y + i * gap + Math.sin(k / 2) * 4;
        if (k === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokePath();
    }
  }

  /** Navigation icons, about 44 × 40. */
  static tab(g, id, x, y, color) {
    g.lineStyle(3, color, 1);
    g.fillStyle(color, 1);
    switch (id) {
      case 'home':
        g.beginPath();
        g.moveTo(x - 20, y);
        g.lineTo(x, y - 18);
        g.lineTo(x + 20, y);
        g.strokePath();
        g.strokeRoundedRect(x - 14, y - 4, 28, 22, 4);
        g.fillRect(x - 4, y + 8, 8, 10);
        break;
      case 'games':
        g.strokeRoundedRect(x - 24, y - 14, 48, 28, 13);
        g.lineBetween(x - 17, y, x - 5, y);
        g.lineBetween(x - 11, y - 6, x - 11, y + 6);
        g.fillCircle(x + 9, y - 3, 3);
        g.fillCircle(x + 15, y + 4, 3);
        break;
      case 'unwind':
        Glyphs.waves(g, x, y, 20, 10);
        break;
      case 'breathe':
        g.strokeCircle(x, y, 18);
        g.strokeCircle(x, y, 9);
        g.fillCircle(x, y, 3);
        break;
      default:
        g.strokeCircle(x, y, 16);
    }
  }
}
