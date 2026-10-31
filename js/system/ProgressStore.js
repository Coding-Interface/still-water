/**
 * ProgressStore — remembers finished sits, best results and running totals,
 * in this browser only. Everything still works when storage is blocked.
 */
class ProgressStore {
  static KEY = 'still-water-progress-v1';
  static BEST_KEY = 'still-water-best-v1';

  static empty() {
    return { sits: 0, minutes: 0, last: null };
  }

  static read() {
    try {
      const raw = window.localStorage.getItem(ProgressStore.KEY);
      const data = raw ? JSON.parse(raw) : null;
      return data && typeof data.sits === 'number' ? data : ProgressStore.empty();
    } catch (e) {
      return ProgressStore.empty();
    }
  }

  static record(seconds) {
    const data = ProgressStore.read();
    data.sits += 1;
    data.minutes += Math.max(0, seconds) / 60;
    data.last = new Date().toISOString();
    try {
      window.localStorage.setItem(ProgressStore.KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable: keep going */
    }
    return data;
  }

  static bests() {
    try {
      return JSON.parse(window.localStorage.getItem(ProgressStore.BEST_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  static getBest(id) {
    return ProgressStore.bests()[id] || 0;
  }

  /** Saves value if it beats the stored best. Returns the best after saving. */
  static setBest(id, value) {
    const all = ProgressStore.bests();
    if (value > (all[id] || 0)) {
      all[id] = value;
      try {
        window.localStorage.setItem(ProgressStore.BEST_KEY, JSON.stringify(all));
      } catch (e) {
        /* ignore */
      }
    }
    return all[id] || 0;
  }

  /** Adds to a running total. Returns the new total. */
  static add(id, amount) {
    const all = ProgressStore.bests();
    all[id] = (all[id] || 0) + amount;
    try {
      window.localStorage.setItem(ProgressStore.BEST_KEY, JSON.stringify(all));
    } catch (e) {
      /* ignore */
    }
    return all[id];
  }
}
