/**
 * PracticeLibrary — the guided breathing content, for both profiles.
 * Grown-ups get the traditional practices; Kids get shorter, playful versions
 * (a `kids` block on each entry). Settling Breath (long holds) is Grown-ups only.
 *
 * Phase types for breath patterns:
 *   in        — breath filling   (player holds the screen)
 *   holdFull  — pause when full  (player keeps holding)
 *   out       — breath emptying  (player lets go)
 *   holdEmpty — pause when empty (player stays released)
 */
class PracticeLibrary {
  static PRACTICES = [
    {
      id: 'sama',
      scene: 'BreathScene',
      title: 'Equal Breath',
      meta: 'Sama Vritti · Hatha yoga',
      duration: '2 min',
      cycles: 15,
      phases: [
        { type: 'in', label: 'Breathe in', secs: 4 },
        { type: 'out', label: 'Breathe out', secs: 4 }
      ],
      intro: [
        'In and out for the same count of four. An even breath brings an even mind.',
        'Hold the screen while you breathe in. Let go as you breathe out.',
        'Breathe through the nose if you can, and let the belly soften. You can close your eyes and follow the rising and falling tone.'
      ],
      teaching: { text: 'Yoga is the settling of the restless movements of the mind.', source: 'Patanjali, Yoga Sutras 1.2' },
      kids: {
        title: 'Balloon Breath',
        meta: 'Blow up the balloon with your breath',
        duration: '1 min',
        cycles: 8,
        phases: [
          { type: 'in', label: 'Breathe in', secs: 4 },
          { type: 'out', label: 'Breathe out', secs: 4 }
        ],
        intro: [
          'Breathe in slowly and watch the balloon get bigger. Breathe out and watch it shrink.',
          'Hold the screen while you breathe in. Let go when you breathe out.',
          'Put a hand on your tummy and feel it fill up like a balloon too.'
        ],
        teaching: { text: 'Your breath is always with you. Use it any time you need to feel calm.', source: 'A calm tip' }
      }
    },
    {
      id: 'box',
      scene: 'BreathScene',
      title: 'Box Breath',
      meta: 'Kumbhaka · Breath retention',
      duration: '2 min',
      cycles: 8,
      phases: [
        { type: 'in', label: 'Breathe in', secs: 4 },
        { type: 'holdFull', label: 'Hold, full', secs: 4 },
        { type: 'out', label: 'Breathe out', secs: 4 },
        { type: 'holdEmpty', label: 'Rest, empty', secs: 4 }
      ],
      intro: [
        'Four equal sides: in, pause, out, pause. The pauses are where the mind goes quiet.',
        'Hold the screen as you breathe in and keep holding through the full pause. Let go as you breathe out and stay released through the empty pause.',
        'Pauses should feel easy, never strained. If they do not, breathe more gently.'
      ],
      teaching: { text: 'As a lamp in a windless place does not flicker, so is the steady mind of one who meditates.', source: 'Bhagavad Gita 6.19' },
      kids: {
        title: 'Square Breath',
        meta: 'In, hold, out, hold, like a square',
        duration: '1 min',
        cycles: 5,
        phases: [
          { type: 'in', label: 'Breathe in', secs: 3 },
          { type: 'holdFull', label: 'Hold it', secs: 3 },
          { type: 'out', label: 'Breathe out', secs: 3 },
          { type: 'holdEmpty', label: 'Rest', secs: 3 }
        ],
        intro: [
          'A square has four sides. Your breath can too: in, hold, out, rest.',
          'Hold the screen while you breathe in and keep holding. Let go when you breathe out and wait.',
          'If holding feels hard, just breathe gently. There is no wrong way.'
        ],
        teaching: { text: 'When you feel big feelings, try one square of breathing. It helps every time.', source: 'A calm tip' }
      }
    },
    {
      id: '478',
      scene: 'BreathScene',
      title: 'Settling Breath',
      meta: '4 · 7 · 8 · From pranayama',
      duration: '1½ min',
      cycles: 4,
      adultsOnly: true,
      phases: [
        { type: 'in', label: 'Breathe in', secs: 4 },
        { type: 'holdFull', label: 'Hold, full', secs: 7 },
        { type: 'out', label: 'Breathe out', secs: 8 }
      ],
      intro: [
        'In for four, hold for seven, out slowly for eight. A long out-breath tells the body it is safe to rest.',
        'Hold the screen through the in-breath and the pause. Let go for the long out-breath.',
        'Four rounds is enough to begin. If the hold feels hard, keep the rhythm and breathe more lightly.'
      ],
      teaching: { text: 'Who can make muddy water clear? Let it be still, and it slowly clears by itself.', source: 'Tao Te Ching, chapter 15' }
    },
    {
      id: 'clouds',
      scene: 'CloudScene',
      title: 'Passing Thoughts',
      meta: 'Sati · Vipassana noting',
      duration: '2 min',
      seconds: 120,
      intro: [
        'Rest your attention on the glowing breath and breathe with it.',
        'Thoughts will drift by as clouds. When one catches you, tap it to name it softly, then return to the breath.',
        'You can also just let a thought pass. Noticing and returning is the whole practice. Nothing to win.'
      ],
      teaching: { text: 'As a fletcher straightens an arrow, the wise one straightens the trembling, wandering mind.', source: 'The Dhammapada, verse 33' },
      kids: {
        title: 'Thought Clouds',
        meta: 'Watch your thoughts float away',
        duration: '1½ min',
        seconds: 90,
        intro: [
          'Breathe with the glowing sun: in as it grows, out as it shrinks.',
          'Thoughts float past like clouds. Tap one to say what kind of thought it is, then come back to your breath.',
          'Or just watch them float away. Thoughts come and go, just like clouds.'
        ],
        teaching: { text: 'You are the sky. Thoughts are just clouds passing by.', source: 'A calm tip' }
      }
    },
    {
      id: 'mala',
      scene: 'MalaScene',
      title: 'Breath Mala',
      meta: 'So Hum · Japa meditation',
      duration: '2–10 min',
      choices: [
        { label: 'Quarter mala · 27 beads', value: 27 },
        { label: 'Full mala · 108 beads', value: 108 }
      ],
      intro: [
        'Silently hear "So" as you breathe in, and "Hum" as you breathe out. Together they mean "I am that."',
        'Tap anywhere once on each out-breath to move one bead along the mala.',
        'The mala waits for you. Taps faster than a breath are not counted.'
      ],
      teaching: { text: 'So Hum, "I am that": the breath has been repeating it all along.', source: 'From Isha Upanishad 16' },
      cueIn: 'So',
      cueOut: 'Hum',
      kids: {
        title: 'Breath Beads',
        meta: 'One bead for every breath',
        duration: '1–3 min',
        choices: [
          { label: '10 beads', value: 10 },
          { label: '27 beads', value: 27 }
        ],
        intro: [
          'Breathe in slowly. Breathe out slowly. That is one breath.',
          'Tap once every time you breathe out, and a bead lights up.',
          'Go slowly. The beads wait for you.'
        ],
        teaching: { text: 'Slow breaths make a calm body and a calm mind.', source: 'A calm tip' },
        cueIn: 'In',
        cueOut: 'Out'
      }
    }
  ];

  static THOUGHTS = [
    ['Did I reply to that message?', 'planning'],
    ['What should I cook tonight?', 'planning'],
    ["Tomorrow's to-do list", 'planning'],
    ['That thing I said last week…', 'remembering'],
    ['A song stuck in my head', 'remembering'],
    ['My old school corridor', 'remembering'],
    ['I should be doing something useful', 'judging'],
    ['I am bad at meditating', 'judging'],
    ["Maybe I'm great at this", 'judging'],
    ['Am I doing this right?', 'doubting'],
    ['My shoulder feels tight', 'feeling'],
    ['I am so tired', 'feeling'],
    ['What was that sound?', 'hearing'],
    ['I wish I were on holiday', 'wanting'],
    ['Coffee would be nice', 'wanting'],
    ['Check the phone, just once', 'wanting'],
    ['What if the meeting goes badly?', 'worrying'],
    ['Why did they say that?', 'worrying'],
    ['This is boring', 'restlessness'],
    ['How long is left?', 'restlessness'],
    ['Picturing a quiet beach', 'imagining'],
    ['A conversation that never happened', 'imagining']
  ];

  static KID_THOUGHTS = [
    ['Is it lunch time yet?', 'wanting'],
    ['That funny video', 'remembering'],
    ['My homework', 'worrying'],
    ['I want a puppy', 'wanting'],
    ["What's for dinner?", 'wondering'],
    ['My best friend', 'remembering'],
    ['Am I doing this right?', 'wondering'],
    ['My tummy is rumbling', 'feeling'],
    ['A dragon in the sky!', 'imagining'],
    ['What was that noise?', 'hearing'],
    ['The spelling test', 'worrying'],
    ['Playground games', 'remembering'],
    ['My feet feel tingly', 'feeling'],
    ['A rocket to the moon', 'imagining'],
    ['Is it nearly done?', 'wondering']
  ];

  static list() {
    return PracticeLibrary.PRACTICES.filter((p) => !(Theme.kids && p.adultsOnly)).map(Theme.entry);
  }

  static get(id) {
    const p = PracticeLibrary.PRACTICES.find((x) => x.id === id) || PracticeLibrary.PRACTICES[0];
    return Theme.entry(p);
  }

  /** A shuffled copy of the thoughts, so clouds rarely repeat. */
  static shuffledThoughts() {
    const deck = (Theme.kids ? PracticeLibrary.KID_THOUGHTS : PracticeLibrary.THOUGHTS).slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
}
