/**
 * MoodLibrary — the home screen's "How are you feeling?" check-in, for both
 * profiles. Each mood points at the game or practice most likely to help.
 * Also holds the greeting, the default pick, quick resets and daily tips.
 */
class MoodLibrary {
  static ADULT_MOODS = [
    { id: 'angry', label: 'Angry', target: 'smash', reason: 'Break plates you will never have to sweep up.' },
    { id: 'stressed', label: 'Stressed', target: 'slice', reason: "Slice through the day's worries, one swipe at a time." },
    { id: 'anxious', label: 'Anxious', target: '478', reason: 'A long out-breath tells your body it is safe.' },
    { id: 'overwhelmed', label: 'Overwhelmed', target: 'toss', reason: 'Write it down, crumple it, watch it burn.' },
    { id: 'restless', label: 'Restless', target: 'bubbles', reason: 'Pop, pop, pop. Nothing to win, nothing to think.' },
    { id: 'tired', label: 'Tired', target: 'koi', reason: 'Feed the fish and let your eyes go soft.' },
    { id: 'scattered', label: 'Scattered', target: 'mandala', reason: 'Colour one petal at a time. Nothing else to do.' },
    { id: 'frustrated', label: 'Frustrated', target: 'breaker', reason: 'Every pane that shatters takes some tension with it.' }
  ];

  static KID_MOODS = [
    { id: 'grumpy', label: 'Grumpy', target: 'smash', reason: 'Knock down a whole shelf of blocks. Crash!' },
    { id: 'worried', label: 'Worried', target: 'toss', reason: 'Scrunch up your worry and feed it to the monster.' },
    { id: 'wiggly', label: 'Wiggly', target: 'bubbles', reason: 'Pop, pop, pop until the wiggles are gone.' },
    { id: 'mad', label: 'Mad', target: 'slice', reason: 'Swipe the grumpy blobs right in half.' },
    { id: 'sad', label: 'Sad', target: 'koi', reason: 'Some fish friends would love to see you.' },
    { id: 'sleepy', label: 'Sleepy', target: 'sama', reason: 'Slow balloon breaths help you get cosy.' },
    { id: 'busy', label: 'Busy brain', target: 'clouds', reason: 'Watch your thoughts float away like clouds.' },
    { id: 'bored', label: 'Bored', target: 'lantern', reason: 'Float a balloon up high and grab the stars.' }
  ];

  static ADULT_QUICK = [
    { target: 'sama', label: '1-minute breath' },
    { target: 'bubbles', label: 'Pop bubbles' },
    { target: 'koi', label: 'Feed the koi' }
  ];

  static KID_QUICK = [
    { target: 'sama', label: 'Balloon breath' },
    { target: 'bubbles', label: 'Pop party' },
    { target: 'mandala', label: 'Colour a flower' }
  ];

  static ADULT_TIPS = [
    'Unclench your jaw. Let your tongue rest.',
    'Drop your shoulders away from your ears.',
    'Look at something far away for a moment.',
    'Take one breath that is longer going out than coming in.',
    'Put your phone down after this. You have earned it.',
    'Drink a glass of water. Small things count.',
    'Notice three sounds around you right now.',
    'Stretch your fingers wide, then let them relax.'
  ];

  static KID_TIPS = [
    'Do a big starfish stretch, then flop like a noodle.',
    'Give yourself a squeezy hug.',
    'Find three blue things in the room.',
    'Smell the flower, blow out the candle. Breathe in, breathe out.',
    'Wiggle your toes as fast as you can, then stop.',
    'Have a drink of water. Your brain loves it.',
    'Tell someone one thing that made you smile today.',
    'Shake your hands like you are drying them, then rest.'
  ];

  static get MOODS() {
    return Theme.kids ? MoodLibrary.KID_MOODS : MoodLibrary.ADULT_MOODS;
  }

  static get QUICK() {
    return Theme.kids ? MoodLibrary.KID_QUICK : MoodLibrary.ADULT_QUICK;
  }

  /** Any game, activity or practice by id, themed for the current profile. */
  static entry(id) {
    const all = GameLibrary.GAMES.concat(GameLibrary.ACTIVITIES);
    const g = all.find((x) => x.id === id);
    if (g) return Theme.entry(g);
    const p = PracticeLibrary.PRACTICES.find((x) => x.id === id);
    if (p) return Theme.entry(p);
    return Theme.entry(GameLibrary.GAMES[0]);
  }

  static mood(id) {
    return MoodLibrary.MOODS.find((m) => m.id === id) || null;
  }

  static greeting(hour) {
    if (Theme.kids) {
      if (hour < 12) return { title: 'Good morning!', line: 'How are you feeling today?' };
      if (hour < 17) return { title: 'Hey there!', line: 'How are you feeling right now?' };
      return { title: 'Hi, superstar!', line: 'How are you feeling tonight?' };
    }
    if (hour >= 22 || hour < 5) return { title: 'Still up?', line: "Let's slow things down. How do you feel?" };
    if (hour < 12) return { title: 'Good morning', line: 'How are you feeling right now?' };
    if (hour < 17) return { title: 'Good afternoon', line: 'How are you feeling right now?' };
    return { title: 'Good evening', line: 'How are you feeling right now?' };
  }

  /** The featured pick before the player chooses a mood. */
  static timePick(hour) {
    if (Theme.kids) {
      if (hour >= 19 || hour < 6) return { target: 'sama', eyebrow: 'Before bed', reason: 'Slow balloon breaths help your body get sleepy.' };
      if (hour < 12) return { target: 'bubbles', eyebrow: 'Morning fun', reason: 'Pop hearts, stars and happy bubbles.' };
      return { target: 'smash', eyebrow: 'After school', reason: 'Knock down a whole shelf of blocks. Crash!' };
    }
    if (hour >= 22 || hour < 5) return { target: '478', eyebrow: 'For a late night', reason: "Can't switch off? A long out-breath helps you wind down." };
    if (hour < 12) return { target: 'sama', eyebrow: 'A calm start', reason: 'Two minutes of even breathing to set the tone for today.' };
    if (hour < 17) return { target: 'slice', eyebrow: 'Afternoon reset', reason: "Slice through the day's worries, one swipe at a time." };
    return { target: 'smash', eyebrow: 'After a long day', reason: 'Break a shelf of plates you will never have to sweep up.' };
  }

  static tip() {
    const tips = Theme.kids ? MoodLibrary.KID_TIPS : MoodLibrary.ADULT_TIPS;
    const day = Math.floor(Date.now() / 86400000);
    return tips[day % tips.length];
  }
}
