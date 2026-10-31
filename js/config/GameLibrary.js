/**
 * GameLibrary — what the menu lists, for both profiles.
 *   GAMES       stress-release games: goals, scores, levels.
 *   ACTIVITIES  slow, open-ended unwinding play.
 * Each entry may carry a `kids` block that replaces its words (and tells the
 * scene to use its kid-friendly skin) when playing as Kids.
 * bestKey links a game to its saved best; bestLabel shows it on the card ({v}).
 */
class GameLibrary {
  static GAMES = [
    {
      id: 'smash',
      scene: 'SmashScene',
      title: 'Smash Shelf',
      meta: 'Slingshot the crockery off the shelves',
      duration: 'Slingshot',
      bestKey: 'smash',
      bestLabel: 'Shelf {v}',
      hint: 'Pull the ball back, aim, and let go. Break every plate, cup and vase.',
      kids: {
        title: 'Block Topple',
        meta: 'Fling a ball, knock every block down',
        bestLabel: 'Level {v}',
        hint: 'Pull the ball back and let go. Knock every block off the shelves!'
      }
    },
    {
      id: 'slice',
      scene: 'SliceScene',
      title: 'Worry Slice',
      meta: 'Swipe through worries as they fly',
      duration: 'One minute',
      bestKey: 'slice',
      bestLabel: 'Best {v}',
      hint: 'Swipe across worries to slice them.',
      kids: { title: 'Grumble Slice', meta: 'Swipe the grumpy blobs in half', hint: 'Swipe across the grumpy blobs!' }
    },
    {
      id: 'breaker',
      scene: 'BreakerScene',
      title: 'Glass Breaker',
      meta: 'Shatter every pane with a bouncing ball',
      duration: 'Levels',
      bestKey: 'breaker',
      bestLabel: 'Best {v}',
      hint: 'Move to steer the paddle. Tap to launch.',
      kids: { title: 'Candy Crunch', meta: 'Bounce the ball, crunch the candy', hint: 'Move to steer. Tap to launch the ball!' }
    },
    {
      id: 'toss',
      scene: 'TossScene',
      title: 'Crumple & Burn',
      meta: 'Write a worry, crumple it, toss it in the fire',
      duration: 'Aim & toss',
      bestKey: 'toss',
      bestLabel: 'Streak {v}',
      hint: 'Tap the paper to crumple it.',
      kids: { title: 'Worry Monster', meta: 'Scrunch up a worry and feed the monster', hint: 'Tap the paper to scrunch it up!' }
    },
    {
      id: 'lantern',
      scene: 'LanternScene',
      title: 'Firefly Lantern',
      meta: 'Hold to rise, gather fireflies',
      duration: 'Hold',
      bestKey: 'lantern',
      bestLabel: 'Best {v}',
      hint: 'Hold to rise. Let go to float down.',
      kids: { title: 'Balloon Ride', meta: 'Float up and down, collect the stars', hint: 'Hold to float up. Let go to drift down!' }
    },
    {
      id: 'tangle',
      scene: 'TangleScene',
      title: 'Untangle',
      meta: 'Drag the points until no lines cross',
      duration: 'Puzzle',
      bestKey: 'tangle',
      bestLabel: 'Knot {v}',
      hint: 'Drag the points until no two lines cross.',
      kids: { title: 'String Sort', meta: 'Move the dots so the strings stop crossing', bestLabel: 'Level {v}', hint: 'Drag the dots so no strings cross!' }
    },
    {
      id: 'flow',
      scene: 'FlowScene',
      title: 'Water Garden',
      meta: 'Turn the channels, let the spring water bloom',
      duration: 'Levels',
      bestKey: 'flow',
      bestLabel: 'Garden {v}',
      hint: 'Tap a tile to turn it. Bring water to every lotus.',
      kids: { title: 'Garden Pipes', meta: 'Turn the pipes to water the flowers', bestLabel: 'Level {v}', hint: 'Tap a pipe to turn it. Water every flower!' }
    },
    {
      id: 'river',
      scene: 'RiverScene',
      title: 'River Guide',
      meta: 'Draw channels, lead the stream to the garden',
      duration: 'Draw',
      bestKey: 'river',
      bestLabel: 'Level {v}',
      hint: 'Draw channels with your finger to lead the water into every pot. Tap a channel to wash it away.',
      kids: { title: 'Water Slides', meta: 'Draw slides so the water reaches the flowers', bestLabel: 'Level {v}', hint: 'Draw slides for the water! Fill every flower pot.' }
    },
    {
      id: 'feast',
      scene: 'FeastScene',
      title: 'Koi Feast',
      meta: 'Feed each hungry koi the food it wants',
      duration: 'Levels',
      bestKey: 'feast',
      bestLabel: 'Level {v}',
      hint: 'Pick the food a fish wants, then tap the water near it.',
      kids: { title: 'Hungry Fish', meta: 'Give each fish the snack it wants', bestLabel: 'Level {v}', hint: 'Pick the snack, then tap near the hungry fish!' }
    }
  ];

  static ACTIVITIES = [
    {
      id: 'bubbles',
      scene: 'BubbleScene',
      title: 'Bubble Wrap',
      meta: 'Press, squish and pop every bubble',
      duration: 'Tap & swipe',
      hint: 'Tap a bubble, or swipe across a row. Pop fast to climb the scale.',
      kids: { title: 'Pop Party', meta: 'Pop hearts, stars and happy bubbles', hint: 'Tap or swipe to pop! Pop fast for a song.' }
    },
    {
      id: 'mandala',
      scene: 'MandalaScene',
      title: 'Mandala',
      meta: 'Colour a new mandala every time',
      duration: 'Colour',
      hint: 'Pick a colour, then tap a shape. Matching shapes fill together. New design deals a fresh mandala.',
      kids: { title: 'Colour Garden', meta: 'Fill a magic flower with colour', hint: 'Pick a colour, then tap the flower!' }
    },
    {
      id: 'sand',
      scene: 'SandScene',
      title: 'Sand Garden',
      meta: 'Karesansui · Rake patterns, set stones',
      duration: 'Drag',
      hint: 'Drag to rake the sand. Pick Stone to place a stone, Smooth to start fresh.',
      kids: { title: 'Beach Doodle', meta: 'Draw in the sand, add shells', hint: 'Drag to draw in the sand. Pick Shell to add shells!' }
    },
    {
      id: 'koi',
      scene: 'KoiScene',
      title: 'Koi Pond',
      meta: 'Feed the fish, watch them glide',
      duration: 'Tap',
      hint: 'Tap the water to scatter food. The koi will come to you.',
      kids: { title: 'Fish Friends', meta: 'Feed the fish and watch them wiggle', hint: 'Tap the water to feed the fish!' }
    },
    {
      id: 'cairn',
      scene: 'CairnScene',
      title: 'Stone Cairn',
      meta: 'Balance river stones, one on another',
      duration: 'Aim & drop',
      hint: 'Move to aim, let go to drop. Tap or hold the arrows to turn the stone.',
      kids: { title: 'Block Tower', meta: 'Stack toy blocks as high as you can', hint: 'Move to aim, let go to drop the block!' }
    }
  ];

  static games() {
    return GameLibrary.GAMES.map(Theme.entry);
  }

  static activities() {
    return GameLibrary.ACTIVITIES.map(Theme.entry);
  }

  static get(id) {
    return Theme.entry(GameLibrary.GAMES.concat(GameLibrary.ACTIVITIES).find((g) => g.id === id) || GameLibrary.GAMES[0]);
  }

  /** The card's right-hand label: the player's best if they have one, else the play style. */
  static cardLabel(entry) {
    if (!entry.bestKey) return entry.duration;
    const v = BestScores.get(entry.bestKey);
    return v > 0 ? entry.bestLabel.replace('{v}', v) : entry.duration;
  }
}
