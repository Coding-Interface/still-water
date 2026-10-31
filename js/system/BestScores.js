/**
 * BestScores — each game's best result, kept in this browser only.
 * Works without storage too (values then last for the visit).
 */
class BestScores {
  static KEY = 'still-water-best-v1';
  static memory = {};

  static all() {
    try {
      const raw = window.localStorage.getItem(BestScores.KEY);
      return Object.assign({}, BestScores.memory, raw ? JSON.parse(raw) : {});
    } catch (e) {
      return Object.assign({}, BestScores.memory);
    }
  }

  static get(id) {
    return BestScores.all()[id] || 0;
  }

  /** Save value if it beats the old best. Returns true for a new best. */
  static submit(id, value) {
    const all = BestScores.all();
    if (value <= (all[id] || 0)) return false;
    all[id] = value;
    BestScores.memory[id] = value;
    try {
      window.localStorage.setItem(BestScores.KEY, JSON.stringify(all));
    } catch (e) {
      /* storage unavailable */
    }
    return true;
  }
}
