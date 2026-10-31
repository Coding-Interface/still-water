/**
 * StillWaterApp — creates the Phaser game once BootLoader has everything loaded.
 * The canvas is 720 × 1280 when the screen is upright and 1280 × 720 when it is
 * sideways; AppRouter switches between them as the device turns. The canvas is
 * drawn at the screen's real resolution (AppRouter.k) so text and lines stay sharp.
 */
class StillWaterApp {
  static game = null;

  static start() {
    Theme.apply(Theme.load() || 'adults');
    const bowl = new SoundBowl();
    Layout.installPointer();
    const size = AppRouter.targetSize();
    AppRouter.k = AppRouter.computeK(size);
    StillWaterApp.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'stage',
      backgroundColor: Palette.css(Palette.NIGHT),
      dom: { createContainer: true },
      audio: { noAudio: true },
      disableContextMenu: true,
      render: { antialias: true, powerPreference: 'high-performance' },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: Math.round(size.w * AppRouter.k),
        height: Math.round(size.h * AppRouter.k)
      },
      input: { activePointers: 3 },
      callbacks: {
        preBoot: (game) => game.registry.set('bowl', bowl),
        postBoot: (game) => AppRouter.init(game)
      },
      scene: [
        SplashScene,
        MenuScene,
        SmashScene,
        SliceScene,
        BreakerScene,
        TossScene,
        LanternScene,
        TangleScene,
        BubbleScene,
        MandalaScene,
        SandScene,
        KoiScene,
        FlowScene,
        CairnScene,
        RiverScene,
        FeastScene,
        BreathScene,
        CloudScene,
        MalaScene,
        EndScene,
        HudScene
      ]
    });
    return StillWaterApp.game;
  }
}
