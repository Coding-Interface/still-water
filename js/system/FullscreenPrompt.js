/**
 * FullscreenPrompt — the overlay that invites players into full screen.
 *   - Shown when the app starts (after "Who's playing?") if it is not full screen.
 *   - Shown again whenever the player leaves full screen.
 *   - iPhone has no full-screen mode for web pages, so it explains
 *     "Add to Home Screen" instead (once per visit).
 *   - Never shown when the app is already installed and opened from the home screen.
 * The markup lives in index.html (#fs-overlay).
 */
class FullscreenPrompt {
  static iosShown = false;

  static els() {
    return {
      root: document.getElementById('fs-overlay'),
      title: document.getElementById('fs-title'),
      text: document.getElementById('fs-text'),
      go: document.getElementById('fs-go'),
      skip: document.getElementById('fs-skip'),
      note: document.getElementById('fs-note')
    };
  }

  static isOpen() {
    const { root } = FullscreenPrompt.els();
    return !!root && !root.hidden;
  }

  /** Called at app start. */
  static offer() {
    if (AppRouter.isFullscreen() || AppRouter.isStandalone()) return;
    if (AppRouter.canFullscreen()) FullscreenPrompt.show('start');
    else if (AppRouter.isIPhone() && !FullscreenPrompt.iosShown) FullscreenPrompt.show('ios');
  }

  /** Called when the player leaves full screen. */
  static onExit() {
    if (AppRouter.isStandalone() || !AppRouter.canFullscreen()) return;
    setTimeout(() => {
      if (!AppRouter.isFullscreen()) FullscreenPrompt.show('exit');
    }, 300);
  }

  static show(mode) {
    const e = FullscreenPrompt.els();
    if (!e.root) return;
    const kids = Theme.kids;
    e.note.hidden = true;
    e.skip.hidden = false;
    if (mode === 'ios') {
      FullscreenPrompt.iosShown = true;
      e.title.textContent = kids ? 'Make it a real app!' : 'Play without browser bars';
      e.text.textContent = 'Tap the Share button, then "Add to Home Screen". Still Water then opens full screen, like an app.';
      e.go.textContent = 'Got it';
      e.skip.hidden = true;
    } else if (mode === 'exit') {
      e.title.textContent = kids ? 'Oops, the screen got small!' : 'You left full screen';
      e.text.textContent = kids ? 'Go big again for the best fun.' : 'Full screen hides the browser so nothing pulls your attention away.';
      e.go.textContent = kids ? 'Go big!' : 'Back to full screen';
      e.skip.textContent = 'Keep playing here';
    } else {
      e.title.textContent = kids ? 'Go full screen!' : 'Play full screen';
      e.text.textContent = kids ? 'Make the game big so it fills your whole screen.' : 'Hide the browser for a bigger, calmer view with nothing pulling your attention.';
      e.go.textContent = kids ? 'Go big!' : 'Go full screen';
      e.skip.textContent = 'Stay in this window';
    }

    e.go.onclick = () => {
      if (mode === 'ios') {
        FullscreenPrompt.hide();
        return;
      }
      AppRouter.toggleFullscreen().then((ok) => {
        if (ok || AppRouter.isFullscreen()) FullscreenPrompt.hide();
        else {
          e.note.hidden = false;
          e.note.textContent = 'This browser did not allow full screen here. You can keep playing in the window.';
          e.go.hidden = true;
          e.skip.textContent = 'Keep playing';
        }
      });
    };
    e.skip.onclick = () => FullscreenPrompt.hide();
    e.go.hidden = false;
    e.root.hidden = false;
    setTimeout(() => {
      try {
        e.go.focus();
      } catch (err) {
        /* ignore */
      }
    }, 50);
  }

  static hide() {
    const { root } = FullscreenPrompt.els();
    if (root) root.hidden = true;
  }
}
