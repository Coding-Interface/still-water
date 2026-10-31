/**
 * WakeKeeper — asks the device not to dim the screen during a practice.
 * Fails quietly where the Wake Lock API is unavailable or refused.
 */
class WakeKeeper {
  static lock = null;

  static async hold() {
    try {
      if ('wakeLock' in navigator && !WakeKeeper.lock) {
        WakeKeeper.lock = await navigator.wakeLock.request('screen');
        WakeKeeper.lock.addEventListener('release', () => {
          WakeKeeper.lock = null;
        });
      }
    } catch (e) {
      WakeKeeper.lock = null;
    }
  }

  static release() {
    try {
      if (WakeKeeper.lock) WakeKeeper.lock.release();
    } catch (e) {
      /* ignore */
    }
    WakeKeeper.lock = null;
  }
}
