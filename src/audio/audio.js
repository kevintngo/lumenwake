// Brushwild audio: effects, a calm generative piano-and-strings piece and a
// quiet outdoor ambience, all synthesized with the Web Audio API (no files).
//
// To add a sound, add one entry to SOUNDS keyed by the bus event name. It is
// called with the kit (tone, noise, piano, bell, key) and the event payload.

const LEVELS = { master: 1, sfx: 1, music: 0.6, ambience: 0.55 }; // the mix: music sits well under effects
const MAX_VOICES = { sfx: 24, chime: 16, music: 48, ambience: 16 }; // a sound past its cap is skipped
const HEARING = 30;        // world units beyond which monster sounds are silent
const NEAR = 4;            // ...and within which they play at full level
const REPEAT_GAP = 0.035;  // an event fired twice at once is staggered, not stacked
const REPEAT_GAPS = { step: 0.13, 'charge:dust': 0.1 };
const MAX_STAGGER = 0.12;  // a repeat that would have to wait longer is dropped
const TICK = 0.1;          // seconds between scheduler updates
const LOOKAHEAD = 0.5;     // music is scheduled this far ahead of the audio clock
const MIN_GAIN = 0.0004;   // quieter than this is not worth a voice

const rand = (lo = 0, hi = 1) => lo + Math.random() * (hi - lo);
const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mtof = (midi) => 440 * 2 ** ((midi - 69) / 12);
const pitchClass = (n) => ((n % 12) + 12) % 12;
const fold = (midi, floor) => midi + 12 * Math.ceil((floor - midi) / 12); // into [floor, floor + 12)
const lookup = (table, key, fallback) => (Object.hasOwn(table, key) ? table[key] : fallback);

// ---------------------------------------------------------------- effects

// Each monster's voice: base pitch (Hz), waveform, and how its call bends.
const MONSTER_VOICE = {
  sproutling: { freq: 820, type: 'triangle', bend: 1.3 },
  puffcap: { freq: 470, type: 'sine', bend: 0.72 },
  bristlehog: { freq: 250, type: 'sawtooth', bend: 1.22 },
  wisp: { freq: 1180, type: 'sine', bend: 1.45 },
  cragling: { freq: 165, type: 'square', bend: 0.8 },
  shellsnap: { freq: 610, type: 'triangle', bend: 1.12 },
};
const DEFAULT_VOICE = { freq: 600, type: 'triangle', bend: 1.2 };
const voiceOf = (m) => lookup(MONSTER_VOICE, m.defId, DEFAULT_VOICE);

// 'skill' events by skill id ('cleave' already gets 'swing').
const SKILL_SOUNDS = {
  bolt(k) {
    k.noise({ freq: 420, to: 1700, glide: 0.22, q: 0.9, attack: 0.05, hold: 0.05, decay: 0.4, gain: 0.13 });
    k.tone({ type: 'triangle', freq: 210, to: 95, attack: 0.02, decay: 0.4, gain: 0.08 });
  },
  mend(k) {
    for (const step of [0, 3, 5]) k.tone({ bus: 'chime', freq: k.key(step, 62), attack: 0.3, hold: 0.15, decay: 1.4, gain: 0.045 });
    k.bell(k.key(7, 62), { bus: 'chime', at: 0.3, decay: 1.2, gain: 0.04 });
  },
  step(k) {
    k.noise({ freq: 2100, to: 650, glide: 0.2, q: 0.7, attack: 0.03, decay: 0.3, gain: 0.1 });
  },
};

// Gains are peak levels (about 0.05 subtle, 0.2 strong); decays are the time to
// fade out. `bus: 'chime'` is for ringing sounds: more reverb, and its own voice
// cap so long tails never crowd out footsteps and hits. `at` delays a layer.
const SOUNDS = {
  step(k, { entity, water }) {
    if (entity && entity.kind !== 'player') return;
    const v = rand(0.88, 1.14);
    if (water) {
      k.noise({ freq: 1500 * v, to: 650 * v, q: 1.1, attack: 0.012, decay: 0.3, gain: 0.055 });
      k.tone({ freq: 380 * v, to: 620 * v, glide: 0.05, decay: 0.1, gain: 0.025 });
    } else {
      k.noise({ filter: 'lowpass', freq: 620 * v, to: 260 * v, decay: 0.13, gain: 0.045 });
      k.tone({ freq: 92 * v, to: 58 * v, decay: 0.12, gain: 0.05 });
    }
  },

  swing(k, { heavy }) {
    const v = rand(0.92, 1.1);
    if (heavy) {
      k.noise({ freq: 320 * v, to: 1500 * v, glide: 0.2, q: 1.2, attack: 0.09, hold: 0.04, decay: 0.36, gain: 0.14 });
      k.tone({ freq: 130 * v, to: 70, attack: 0.05, decay: 0.4, gain: 0.08 });
    } else {
      k.noise({ freq: 600 * v, to: 2300 * v, glide: 0.12, q: 1.4, attack: 0.05, decay: 0.2, gain: 0.1 });
    }
  },

  damage: spatial((k, { target, crit }) => {
    const v = rand(0.92, 1.1);
    if (target && target.kind === 'player') {
      k.tone({ freq: 125 * v, to: 52, decay: 0.32, gain: 0.24 });
      k.noise({ filter: 'lowpass', freq: 380, to: 160, decay: 0.2, gain: 0.12 });
      return;
    }
    if (target && target.guard) {       // tucked in its shell: the blow glances off, dry and high
      k.tone({ type: 'triangle', freq: 1180 * v, to: 900 * v, glide: 0.04, attack: 0.002, decay: 0.1, gain: 0.08 });
      k.noise({ freq: 3000, q: 2, attack: 0.002, decay: 0.05, gain: 0.06 });
      return;
    }
    k.noise({ freq: (crit ? 1700 : 1150) * v, q: 1.1, attack: 0.003, decay: 0.12, gain: crit ? 0.17 : 0.14 });
    k.tone({ type: 'triangle', freq: 230 * v, to: 120 * v, attack: 0.003, decay: 0.16, gain: 0.15 });
    if (crit) k.bell(k.key(3, 74), { decay: 0.5, gain: 0.05 });
    // the blow that fells a creature lands lower and longer
    if (target && target.hp <= 0) k.tone({ freq: 104 * v, to: 46, attack: 0.004, decay: target.elite ? 0.55 : 0.3, gain: target.elite ? 0.2 : 0.13 });
  }, (p) => p.target),

  // A creature winds up its move: its own voice, rising, while the mark on the ground fills in.
  'monster:special': spatial((k, m) => {
    const voice = voiceOf(m), f = voice.freq * (m.elite ? 0.82 : 1);
    k.tone({ type: voice.type, cutoff: Math.min(2400, f * 3.5), freq: f * 0.62, to: f * 1.25, glide: 0.32, attack: 0.06, hold: 0.16, decay: 0.22, gain: 0.085 });
    k.noise({ freq: 500, to: 1900, glide: 0.34, q: 1.6, attack: 0.2, hold: 0.06, decay: 0.16, gain: 0.05 });
  }),

  slam: spatial((k, { heavy }) => {
    const v = rand(0.92, 1.08);
    k.tone({ freq: (heavy ? 88 : 112) * v, to: 40, decay: heavy ? 0.5 : 0.32, gain: heavy ? 0.26 : 0.17 });
    k.noise({ filter: 'lowpass', freq: heavy ? 700 : 900, to: 140, attack: 0.004, decay: heavy ? 0.45 : 0.28, gain: heavy ? 0.16 : 0.11 });
  }),

  'monster:shot': spatial((k, m) => {
    const f = voiceOf(m).freq * rand(0.95, 1.06);
    k.tone({ type: 'triangle', freq: f * 1.1, to: f * 0.55, glide: 0.14, attack: 0.004, decay: 0.2, gain: 0.07 });
    k.noise({ freq: 2400, to: 900, q: 1.2, attack: 0.004, decay: 0.12, gain: 0.05 });
  }),

  'shot:hit': spatial((k) => {
    k.noise({ filter: 'lowpass', freq: 1100, to: 300, attack: 0.004, decay: 0.2, gain: 0.09 });
    k.tone({ freq: 190, to: 95, decay: 0.14, gain: 0.07 });
  }),

  'hazard:cloud': spatial((k, { life }) => {
    k.tone({ freq: 240, to: 150, glide: 0.2, attack: 0.02, decay: 0.24, gain: 0.05 });       // the puff
    k.noise({ freq: 2600, to: 1100, glide: 0.8, q: 0.7, attack: 0.18, hold: 0.25, decay: Math.min(1.6, (life || 2) * 0.5), gain: 0.05 });
  }),

  // hooves: one beat for each puff of dust a charge kicks up
  'charge:dust': spatial((k) => {
    const v = rand(0.9, 1.12);
    k.tone({ freq: 84 * v, to: 52 * v, decay: 0.11, gain: 0.075 });
    k.noise({ filter: 'lowpass', freq: 520 * v, to: 220, decay: 0.1, gain: 0.04 });
  }),

  guard: spatial((k) => {
    k.tone({ type: 'triangle', freq: 540, to: 410, glide: 0.04, attack: 0.002, decay: 0.09, gain: 0.09 });
    k.noise({ freq: 2800, q: 2, attack: 0.002, decay: 0.05, gain: 0.05 });
  }, (p) => p.entity),

  // stepping out of the way of a blow: a breath of air
  miss(k, { target, text }) {
    if (!target || target.kind !== 'player' || text !== 'Dodged') return;
    k.noise({ freq: 1500, to: 3000, glide: 0.1, q: 1.6, attack: 0.03, decay: 0.14, gain: 0.05 });
  },

  // two soft, low knocks, like a pulse: heard once, when health first runs low
  lowhealth(k) {
    for (const at of [0, 0.26]) k.tone({ freq: 74, to: 52, at, attack: 0.008, decay: 0.26, gain: at ? 0.13 : 0.17 });
  },

  'monster:alert': spatial((k, m) => {
    const voice = voiceOf(m), f = voice.freq * rand(0.94, 1.08) * (m.elite ? 0.82 : 1);
    const call = { type: voice.type, cutoff: Math.min(2600, f * 4), attack: 0.008, glide: 0.08 };
    k.tone({ ...call, freq: f, to: f * voice.bend, decay: 0.14, gain: 0.08 });
    k.tone({ ...call, freq: f * 1.19, to: f * 1.19 * voice.bend, at: 0.12, decay: 0.2, gain: 0.07 });
  }),

  'monster:strike': spatial((k, m) => {
    const voice = voiceOf(m), f = voice.freq * rand(0.9, 1.1);
    k.noise({ freq: 900, to: 420, q: 1, decay: 0.15, gain: 0.12 });
    k.tone({ type: voice.type, cutoff: 1400, freq: f * 0.6, to: f * 0.38, decay: 0.18, gain: 0.1 });
  }),

  'monster:died': spatial((k, m) => {
    const v = clamp(voiceOf(m).freq / 600, 0.75, 1.35) * rand(0.94, 1.06);
    k.tone({ freq: 430 * v, to: 150 * v, glide: 0.1, decay: 0.22, gain: 0.13 });
    k.noise({ filter: 'lowpass', freq: 1300 * v, to: 280, attack: 0.02, decay: 0.5, gain: 0.09 });
  }),

  pickup(k, { rare }) {
    if (rare) {
      k.bell(k.key(3, 74), { bus: 'chime', decay: 1.1, gain: 0.07 });
      k.bell(k.key(5, 74), { bus: 'chime', at: 0.13, decay: 1.5, gain: 0.07 });
    } else {
      k.bell(k.key(pick([0, 2, 3]), 79), { decay: 0.45, gain: 0.07 });
    }
  },

  // ---- the elders, and the cinematics round them: low, slow and few. Nothing here is loud for long.
  'boss:step': spatial((k) => {
    const v = rand(0.92, 1.08);
    k.tone({ freq: 62 * v, to: 34, decay: 0.5, gain: 0.3 });
    k.noise({ filter: 'lowpass', freq: 420, to: 110, attack: 0.006, decay: 0.42, gain: 0.14 });
  }),
  'cine:rumble'(k, { power = 0.5 }) {
    k.noise({ filter: 'lowpass', freq: 240, to: 90, attack: 0.12, hold: 0.25, decay: 0.7, gain: 0.1 + 0.1 * power });
    k.tone({ freq: 48, to: 38, attack: 0.08, hold: 0.2, decay: 0.6, gain: 0.16 + 0.1 * power });
  },
  'boss:rise'(k) {
    // the ground giving way: a long low roll, and a string swell that climbs with it
    k.noise({ filter: 'lowpass', freq: 160, to: 520, glide: 2.6, attack: 0.5, hold: 2.0, decay: 1.2, gain: 0.16 });
    k.tone({ freq: 41, to: 55, glide: 3.0, attack: 0.6, hold: 2.2, decay: 1.0, gain: 0.2 });
    for (const [step, at] of [[0, 0.2], [7, 1.1], [10, 2.0]]) k.tone({ bus: 'chime', type: 'triangle', cutoff: 900, freq: k.key(step, 38), at, attack: 0.9, hold: 0.6, decay: 1.6, gain: 0.05 });
  },
  'boss:stand'(k) {
    k.tone({ freq: 70, to: 30, decay: 0.9, gain: 0.34 });
    k.noise({ filter: 'lowpass', freq: 600, to: 120, attack: 0.005, decay: 0.8, gain: 0.2 });
  },
  'boss:roar': spatial((k, { entity }) => {
    // its own voice two octaves down, bending as it runs out of breath, over a breath of noise
    const f = (entity ? voiceOf(entity).freq : 300) * 0.22;
    k.tone({ type: 'sawtooth', cutoff: 520, freq: f * 1.25, to: f * 0.7, glide: 1.3, attack: 0.12, hold: 0.7, decay: 0.9, gain: 0.2 });
    k.tone({ type: 'sawtooth', cutoff: 380, freq: f * 0.63, to: f * 0.36, glide: 1.4, attack: 0.16, hold: 0.7, decay: 0.9, gain: 0.16 });
    k.noise({ freq: 700, to: 320, glide: 1.2, q: 0.8, attack: 0.15, hold: 0.6, decay: 0.8, gain: 0.1 });
  }, () => null),
  'boss:fell'(k) {
    // the fight stops: one low note left to ring, and the long crumble
    k.piano(k.key(0, 33), { bus: 'chime', strings: 2, ring: 1.6, gain: 0.3 });
    k.noise({ filter: 'lowpass', freq: 520, to: 140, glide: 2.6, attack: 0.3, hold: 1.8, decay: 1.4, gain: 0.12 });
  },
  'boss:down'(k) {
    k.tone({ freq: 58, to: 26, decay: 1.4, gain: 0.36 });
    k.noise({ filter: 'lowpass', freq: 800, to: 100, attack: 0.005, decay: 1.2, gain: 0.22 });
    [0, 7, 12].forEach((step, i) => k.piano(k.key(step, 45), { bus: 'chime', strings: 1, ring: 1.4, at: 0.9 + i * 0.32, gain: 0.16 }));
  },
  'boss:enrage'(k) { k.tone({ freq: 52, to: 44, attack: 0.05, hold: 0.3, decay: 0.7, gain: 0.2 }); },
  'gate:shut': spatial((k) => {
    k.tone({ type: 'triangle', freq: 150, to: 70, decay: 0.3, gain: 0.16 });
    k.noise({ filter: 'lowpass', freq: 900, to: 200, attack: 0.004, decay: 0.3, gain: 0.12 });
  }),
  // ---- arrivals
  'cine:open'(k) {
    // the first picture of the place: three slow notes and a held string under them
    k.tone({ bus: 'chime', type: 'triangle', cutoff: 1100, freq: k.key(0, 50), attack: 1.4, hold: 2.2, decay: 2.6, gain: 0.05 });
    [0, 4, 7].forEach((step, i) => k.piano(k.key(step, 62), { bus: 'chime', strings: 1, ring: 1.4, at: 0.5 + i * 0.7, gain: 0.15 }));
  },
  'craft:pass'(k) {
    k.noise({ freq: 320, to: 900, glide: 3.6, q: 0.7, attack: 1.6, hold: 1.6, decay: 1.4, gain: 0.11 });
    k.tone({ type: 'triangle', cutoff: 700, freq: 82, to: 118, glide: 3.4, attack: 1.2, hold: 2.0, decay: 1.2, gain: 0.07 });
  },
  'craft:land'(k) {
    k.tone({ freq: 96, to: 48, decay: 0.5, gain: 0.2 });
    k.noise({ freq: 1400, to: 260, glide: 0.9, q: 0.7, attack: 0.02, decay: 1.0, gain: 0.1 });
  },
  'arrive:beam'(k) {
    k.noise({ freq: 600, to: 2400, glide: 0.5, q: 1.2, attack: 0.25, hold: 0.1, decay: 0.6, gain: 0.07 });
    [0, 7, 12].forEach((step, i) => k.bell(k.key(step, 62), { bus: 'chime', at: 0.25 + i * 0.12, decay: 1.3, gain: 0.05 }));
  },
  // ---- things that had no sound of their own until now
  shoot(k, { family, heavy }) {
    const v = rand(0.94, 1.06);
    if (family === 'rifle') {
      k.tone({ type: 'triangle', freq: 780 * v, to: 240 * v, glide: 0.09, attack: 0.002, decay: 0.12, gain: heavy ? 0.13 : 0.1 });
      k.noise({ freq: 2600, to: 1100, q: 1.3, attack: 0.002, decay: 0.07, gain: 0.06 });
    } else {
      k.tone({ freq: 420 * v, to: 640 * v, glide: 0.12, attack: 0.01, decay: 0.22, gain: heavy ? 0.1 : 0.075 });
      k.bell(k.key(heavy ? 7 : 3, 74), { decay: 0.4, gain: 0.03 });
    }
  },
  equip(k) {
    k.tone({ type: 'triangle', freq: 320, to: 470, glide: 0.06, attack: 0.004, decay: 0.12, gain: 0.09 });
    k.noise({ freq: 2400, q: 1.5, attack: 0.002, at: 0.07, decay: 0.05, gain: 0.05 });
  },
  'drop:rare'(k, { rarity }) {
    [0, 7, 12].concat(rarity >= 3 ? [16] : []).forEach((step, i) => k.bell(k.key(step, 67), { bus: 'chime', at: i * 0.1, decay: 1.5, gain: 0.06 }));
  },

  levelup(k) {
    [0, 2, 3, 5, 7, 8].forEach((step, i) => {
      k.piano(k.key(step, 57), { bus: 'chime', strings: 1, ring: 0.6, at: i * 0.19, gain: 0.2 + i * 0.012 });
    });
    k.bell(k.key(10, 57), { bus: 'chime', at: 1.14, decay: 1.6, gain: 0.04 });
  },

  heal(k, { focus }) {
    const steps = focus ? [0, 3, 5] : [2, 3, 5, 7], floor = focus ? 67 : 72;
    steps.forEach((step, i) => k.tone({ bus: 'chime', freq: k.key(step, floor), at: i * 0.07, attack: 0.02, decay: 0.7, gain: 0.04 }));
  },

  drink(k) {
    k.tone({ freq: 270, to: 170, glide: 0.07, attack: 0.006, decay: 0.12, gain: 0.12 });
    k.tone({ freq: 330, to: 540, glide: 0.05, at: 0.1, decay: 0.1, gain: 0.1 });
  },

  skill(k, { id }) {
    const play = lookup(SKILL_SOUNDS, id, null);
    if (play) play(k);
  },

  'bolt:hit': spatial((k) => {
    k.noise({ filter: 'lowpass', freq: 1500, to: 320, attack: 0.008, decay: 0.45, gain: 0.13 });
    k.tone({ freq: 150, to: 62, decay: 0.3, gain: 0.14 });
  }),

  attune(k) {
    const f = k.key(0, 69);
    k.bell(f, { bus: 'chime', decay: 3.2, gain: 0.1 });
    k.tone({ bus: 'chime', freq: f * 2.005, attack: 0.01, decay: 2.2, gain: 0.03 });
    k.bell(k.key(3, 69), { bus: 'chime', at: 0.22, decay: 2.8, gain: 0.05 });
  },

  'player:died'(k) {
    const f = k.key(0, 55);
    k.tone({ freq: f, to: f / 3, glide: 1.4, attack: 0.03, hold: 0.3, decay: 1.8, gain: 0.2 });
    k.tone({ bus: 'chime', type: 'triangle', cutoff: 700, freq: f * 1.19, to: f * 0.4, glide: 1.4, attack: 0.05, hold: 0.3, decay: 1.5, gain: 0.06 });
  },

  'player:respawn'(k) {
    const f = k.key(0, 62);
    k.tone({ bus: 'chime', freq: f * 0.667, to: f, glide: 0.8, attack: 0.25, hold: 0.45, decay: 1.2, gain: 0.1 });
    k.bell(f * 2, { bus: 'chime', at: 0.75, decay: 1.6, gain: 0.05 });
  },

  'ui:click'(k) {
    k.tone({ type: 'triangle', freq: 620, to: 480, glide: 0.03, attack: 0.002, decay: 0.07, gain: 0.06 });
  },

  trade(k) {
    k.bell(k.key(3, 74), { decay: 0.3, gain: 0.05 });
    k.bell(k.key(5, 74), { at: 0.06, decay: 0.45, gain: 0.05 });
  },

  'bounty:claimed'(k) {
    const note = { bus: 'chime', strings: 1, ring: 0.6 };
    [3, 5, 7].forEach((step, i) => k.piano(k.key(step, 57), { ...note, at: i * 0.15, gain: 0.18 }));
    for (const step of [0, 5, 7, 8]) k.piano(k.key(step, 57), { ...note, ring: 1, at: 0.55, gain: 0.14 });
  },

  deny(k) {
    k.tone({ type: 'triangle', cutoff: 500, freq: 150, to: 118, glide: 0.08, decay: 0.18, gain: 0.13 });
  },

  'site:enter'(k) {
    k.piano(k.key(3, 57), { bus: 'chime', strings: 1, gain: 0.14 });
    k.piano(k.key(5, 57), { bus: 'chime', strings: 1, at: 0.42, gain: 0.15 });
  },

  found(k, { kind }) {
    if (kind === 'stones') return;                    // the boon they lend is the sound
    if (kind === 'cache') {                           // a lid knocked open
      k.noise({ filter: 'lowpass', freq: 800, to: 300, attack: 0.003, decay: 0.12, gain: 0.09 });
      k.tone({ type: 'triangle', cutoff: 900, freq: 170, to: 118, glide: 0.05, attack: 0.003, decay: 0.14, gain: 0.1 });
      k.bell(k.key(5, 74), { bus: 'chime', at: 0.12, decay: 1.2, gain: 0.05 });
    } else if (kind === 'beacon') {                   // lit: a low bell, and the places it shows answer
      k.bell(k.key(0, 57), { bus: 'chime', decay: 2.8, gain: 0.09 });
      [2, 3, 5].forEach((step, i) => k.bell(k.key(step, 69), { bus: 'chime', at: 0.35 + i * 0.16, decay: 1.3, gain: 0.045 }));
    } else {                                          // a place, after the two notes that greet it
      k.bell(k.key(5, 69), { bus: 'chime', at: 0.85, decay: 1.8, gain: 0.045 });
    }
  },

  boon(k) {
    for (const step of [0, 2, 3]) k.tone({ bus: 'chime', freq: k.key(step, 57), attack: 0.4, hold: 0.3, decay: 1.8, gain: 0.04 });
    k.bell(k.key(5, 69), { bus: 'chime', at: 0.45, decay: 2, gain: 0.05 });
  },

  travel(k) {
    k.noise({ freq: 380, to: 2400, glide: 0.7, q: 0.9, attack: 0.5, hold: 0.1, decay: 0.4, gain: 0.07 });
    k.tone({ bus: 'chime', freq: k.key(0, 57), to: k.key(0, 69), glide: 0.7, attack: 0.4, hold: 0.2, decay: 0.5, gain: 0.05 });
  },

  'travel:arrive'(k) {
    k.bell(k.key(0, 69), { bus: 'chime', decay: 2.4, gain: 0.08 });
    k.bell(k.key(3, 69), { bus: 'chime', at: 0.18, decay: 2, gain: 0.05 });
    k.noise({ freq: 1800, to: 500, glide: 0.4, q: 0.8, attack: 0.02, decay: 0.5, gain: 0.05 });
  },

  talent(k) {
    const note = { bus: 'chime', strings: 1, ring: 0.6 };
    k.piano(k.key(3, 57), { ...note, gain: 0.16 });
    k.piano(k.key(5, 57), { ...note, at: 0.14, gain: 0.17 });
    k.bell(k.key(8, 57), { bus: 'chime', at: 0.3, decay: 1.4, gain: 0.04 });
  },

  // a new country underfoot; a fuller chord when the Long Walk reaches one of its marks
  land(k, { mark }) {
    const note = { bus: 'chime', strings: 1, ring: 0.7 };
    [0, 2, 3].forEach((step, i) => k.piano(k.key(step, 57), { ...note, at: i * 0.22, gain: 0.15 }));
    if (mark) for (const step of [0, 3, 5]) k.piano(k.key(step, 57), { ...note, ring: 1, at: 0.8, gain: 0.13 });
  },

  // dusk settles on the relative minor: an open fifth, low and slow
  nightfall(k) {
    for (const step of [-1, 2]) k.tone({ bus: 'chime', freq: k.key(step, 57), attack: 0.6, hold: 0.5, decay: 2.4, gain: 0.05 });
    k.bell(k.key(4, 69), { bus: 'chime', at: 1, decay: 2.2, gain: 0.035 });
  },

  daybreak(k) {
    [0, 2, 3].forEach((step, i) => k.bell(k.key(step, 74), { bus: 'chime', at: i * 0.2, decay: 1.6, gain: 0.045 }));
  },

  // glint picked back up from where the hero fell
  recovered(k) {
    [0, 2, 3, 5].forEach((step, i) => k.bell(k.key(step, 79), { at: i * 0.07, decay: 0.5, gain: 0.06 }));
  },

  // a first step learned
  'guide:step'(k) {
    k.bell(k.key(3, 74), { bus: 'chime', decay: 0.7, gain: 0.05 });
    k.bell(k.key(5, 74), { bus: 'chime', at: 0.1, decay: 1, gain: 0.05 });
  },
};

/** Wraps a sound so it fades with distance from the player (silent past HEARING). */
function spatial(play, where = (payload) => payload) {
  return (k, payload) => {
    const level = k.nearness(where(payload));
    if (level <= 0.02) return;
    k.level = level; // reset after every event by the dispatcher
    play(k, payload);
  };
}

// ---------------------------------------------------------- music tables

const KEY_ROOT = 50; // D3; biomes shift the key from here
const PENTA = [0, 2, 4, 7, 9];
const SECTION_BARS = 4; // time of day and biome are re-read once per section
const CHORD_BARS = 2;
const SLOT_WEIGHT = [1.3, 0.15, 0.6, 0.25, 0.9, 0.15, 0.55, 0.25]; // piano chance on each eighth of a bar

// Chords as semitones above the key root: a bass note and an open pad voicing.
// They are voiced so no pad note sits a semitone from a melody note.
const CHORDS = {
  I: { bass: 0, pad: [0, 7, 16] },
  Isus: { bass: 0, pad: [0, 7, 14] },
  IV: { bass: 5, pad: [-3, 5, 12] },
  Vsus: { bass: 7, pad: [-5, 2, 12] },
  vi: { bass: 9, pad: [-3, 4, 12] },
  ii: { bass: 2, pad: [-7, 2, 9] },
};

// Time of day. beat: seconds per beat; density: how often the piano speaks;
// chords: the first is home; low/high: piano register above the key root;
// rest: bars of silence between phrases; bass, violin: likelihoods;
// pad: string brightness in Hz. Night leans on the relative minor.
const TIMES = {
  morning: { beat: 1.05, density: 0.6, scale: PENTA, chords: ['I', 'IV', 'Isus', 'vi', 'Vsus'], low: 12, high: 36, rest: [1, 2], bass: 0.55, bassFloor: 40, violin: 1, pad: 820 },
  day: { beat: 1.1, density: 0.56, scale: PENTA, chords: ['I', 'Vsus', 'vi', 'IV', 'Isus'], low: 10, high: 34, rest: [1, 2], bass: 0.6, bassFloor: 40, violin: 1, pad: 760 },
  dusk: { beat: 1.2, density: 0.5, scale: [0, 2, 5, 7, 9], chords: ['IV', 'ii', 'Isus', 'Vsus'], low: 7, high: 31, rest: [1, 3], bass: 0.7, bassFloor: 39, violin: 1.2, pad: 680 },
  night: { beat: 1.32, density: 0.42, scale: PENTA, chords: ['vi', 'ii', 'IV', 'Isus'], low: 7, high: 27, rest: [2, 3], bass: 0.85, bassFloor: 38, violin: 0.8, pad: 560 },
};

// How each biome colors the music (key shift in semitones, violin and silence
// multipliers) and the ambience (wind, bird and cricket amounts).
const BIOME_SOUND = {
  meadow: { shift: 0, violin: 1, space: 1, wind: 0.7, birds: 1, crickets: 1 },
  grove: { shift: 5, violin: 1.2, space: 0.9, wind: 0.55, birds: 1.4, crickets: 0.8 },
  pinewood: { shift: -2, violin: 0.8, space: 1.3, wind: 0.8, birds: 0.7, crickets: 0.6 },
  amberwood: { shift: -5, violin: 1.1, space: 1.1, wind: 0.65, birds: 0.9, crickets: 1.1 },
  shore: { shift: 2, violin: 1.3, space: 1.2, wind: 0.95, birds: 0.5, crickets: 0.3 },
  highland: { shift: -3, violin: 1.5, space: 1.4, wind: 1.1, birds: 0.3, crickets: 0.15 },
};
const biomeSound = (game) => lookup(BIOME_SOUND, game.biome && game.biome.id, BIOME_SOUND.meadow);
const nightOf = (game) => clamp((game.env && game.env.night) || 0, 0, 1);

// ------------------------------------------------------------------ entry

export function createAudio(game) {
  let kit = null, music = null, ambience = null;
  let soundOn = true, volume = 1, lastTick = 0, warned = false;
  const nextFree = new Map(); // per event: when its next repeat may start

  // Audio must never break the game loop: report the first problem and carry on.
  function safely(fn) {
    try { fn(); } catch (err) {
      if (!warned) console.warn('[audio]', err);
      warned = true;
    }
  }

  function boot() {
    if (!kit) {
      const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtx) return;
      const fresh = createKit(new AudioCtx(), game);
      music = createMusic(fresh, game);
      ambience = createAmbience(fresh, game);
      kit = fresh; // only once everything is built
      setMaster(0.4);
    }
    wake();
  }

  // Browsers leave the context suspended without a gesture and may interrupt it later.
  function wake() {
    const ctx = kit && kit.ctx;
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume()?.catch?.(() => {});
  }

  function setMaster(seconds = 0.12) {
    if (!kit) return;
    const hidden = typeof document !== 'undefined' && document.hidden; // frames stop in a hidden tab, so fall silent
    const target = soundOn && !hidden ? volume * LEVELS.master : 0;
    kit.master.gain.setTargetAtTime(target, kit.ctx.currentTime, seconds / 3);
  }

  function trigger(type, payload) {
    if (!kit || !soundOn || kit.ctx.state !== 'running') return;
    const now = kit.ctx.currentTime;
    const wait = Math.max(0, (nextFree.get(type) || 0) - now);
    if (wait > MAX_STAGGER) return;
    nextFree.set(type, now + wait + (REPEAT_GAPS[type] ?? REPEAT_GAP));
    kit.delay = wait;
    safely(() => SOUNDS[type](kit, payload ?? {}));
    kit.delay = 0;
    kit.level = 1;
  }

  function tick() {
    if (!kit || kit.ctx.state !== 'running') return;
    const now = kit.ctx.currentTime;
    if (now - lastTick < TICK) return;
    const dt = Math.min(now - lastTick, 0.5);
    lastTick = now;
    music.update(now);
    ambience.update(now, dt);
  }

  const bus = game.bus;
  bus.on('begin', () => safely(boot));
  bus.on('sound', (on) => { soundOn = !!on; safely(setMaster); });
  bus.on('frame', () => safely(tick));
  for (const type of Object.keys(SOUNDS)) bus.on(type, (payload) => trigger(type, payload));
  if (typeof addEventListener === 'function') {
    // phones only count some events as a gesture (a lifted finger, a click), so listen for them all
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, wake, { passive: true });
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => safely(() => setMaster(0.3)));

  return {
    /** Master volume, 0..1. */
    setVolume(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return;
      volume = clamp(n, 0, 1);
      safely(setMaster);
    },
  };
}

// -------------------------------------------------------------------- kit

/** The mixer plus the few voices every sound is built from. */
function createKit(ctx, game) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(softClip(ctx)).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.8);
  reverb.connect(master);

  const pools = {};
  for (const [name, max] of Object.entries(MAX_VOICES)) pools[name] = { n: 0, max };
  const makeBus = (level, wet, pool) => {
    const node = ctx.createGain();
    node.gain.value = level;
    node.connect(master);
    if (wet > 0) {
      const send = ctx.createGain();
      send.gain.value = wet;
      node.connect(send).connect(reverb);
    }
    return { node, pool };
  };
  const buses = {
    sfx: makeBus(LEVELS.sfx, 0.1, pools.sfx),            // close, nearly dry
    chime: makeBus(LEVELS.sfx, 0.45, pools.chime),       // bells and piano flourishes
    music: makeBus(LEVELS.music, 0.55, pools.music),
    amb: makeBus(LEVELS.ambience, 0, pools.ambience),    // wind and water beds
    air: makeBus(LEVELS.ambience, 0.4, pools.ambience),  // birds and crickets, far off
  };
  // The string pad shares one low-pass so it can never buzz.
  const padFilter = ctx.createBiquadFilter();
  padFilter.frequency.value = TIMES.day.pad;
  padFilter.Q.value = 0.3;
  padFilter.connect(buses.music.node);
  buses.pad = { node: padFilter, pool: pools.music };

  const noiseBuffer = whiteNoise(ctx, 5);
  // Felt piano tone: a strong fundamental and a few quickly fading harmonics.
  const felt = ctx.createPeriodicWave(new Float32Array(7), new Float32Array([0, 1, 0.45, 0.2, 0.1, 0.05, 0.025]));

  const startTime = (o) => o.when ?? ctx.currentTime + kit.delay + (o.at ?? 0);

  // Linear attack, optional hold, then a decay that falls 60 dB. Returns the stop time.
  function envelope(param, t0, peak, o) {
    const attack = Math.max(0.002, o.attack ?? 0.005), hold = Math.max(0, o.hold ?? 0), decay = Math.max(0.01, o.decay ?? 0.2);
    const top = t0 + attack, fall = top + hold, end = fall + decay;
    param.value = 0;
    param.setValueAtTime(0, t0);
    param.linearRampToValueAtTime(peak, top);
    if (hold > 0) param.setValueAtTime(peak, fall);
    param.exponentialRampToValueAtTime(peak * 0.001, end);
    param.linearRampToValueAtTime(0, end + 0.02);
    return end + 0.03;
  }

  // Wires a voice to its bus, counts it, and cleans it up when it ends.
  function finish(source, chain, out, end, extras = []) {
    for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
    chain[chain.length - 1].connect(out.node);
    out.pool.n++;
    source.onended = () => {
      out.pool.n--;
      for (const node of chain) node.disconnect();
      for (const node of extras) node.disconnect();
    };
    source.stop(end);
  }

  /**
   * An enveloped oscillator note.
   * o: freq, to (pitch glide target), glide (seconds), type | wave, detune (cents),
   *    gain, attack, hold, decay, cutoff, cutoffTo (low-pass Hz), pan (-1..1),
   *    vibrato { rate, depth (cents), delay }, bus, at (seconds from now) | when (absolute).
   */
  function tone(o) {
    const out = buses[o.bus] || buses.sfx, peak = (o.gain ?? 0.1) * kit.level;
    if (out.pool.n >= out.pool.max || !(peak > MIN_GAIN) || !(o.freq > 0)) return;
    const t0 = startTime(o);
    const osc = ctx.createOscillator();
    if (o.wave) osc.setPeriodicWave(o.wave); else osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.detune) osc.detune.value = o.detune;
    const amp = ctx.createGain();
    const end = envelope(amp.gain, t0, peak, o);
    const glideEnd = t0 + (o.glide ?? (end - t0) * 0.6);
    if (o.to > 0) osc.frequency.exponentialRampToValueAtTime(o.to, glideEnd);

    const chain = [osc], extras = [];
    if (o.cutoff > 0) {
      const filter = ctx.createBiquadFilter(); // low-pass by default
      filter.Q.value = 0.5;
      filter.frequency.setValueAtTime(o.cutoff, t0);
      if (o.cutoffTo > 0) filter.frequency.exponentialRampToValueAtTime(o.cutoffTo, glideEnd);
      chain.push(filter);
    }
    chain.push(amp);
    if (o.pan && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = o.pan;
      chain.push(panner);
    }
    if (o.vibrato) {
      const lfo = ctx.createOscillator(), depth = ctx.createGain(), swell = t0 + (o.vibrato.delay ?? 0);
      lfo.frequency.value = o.vibrato.rate;
      depth.gain.value = 0;
      depth.gain.setValueAtTime(0, swell);
      depth.gain.linearRampToValueAtTime(o.vibrato.depth, swell + 0.5);
      lfo.connect(depth).connect(osc.detune);
      lfo.start(t0);
      lfo.stop(end);
      extras.push(lfo, depth);
    }
    osc.start(t0);
    finish(osc, chain, out, end, extras);
  }

  /**
   * A filtered noise burst.
   * o: filter ('bandpass' | 'lowpass' | 'highpass'), freq, to (sweep target), glide, q,
   *    gain, attack, hold, decay, bus, at | when.
   * Gain is compensated for the filter's width, so it means about the same
   * loudness at any cutoff.
   */
  function noise(o) {
    const out = buses[o.bus] || buses.sfx, type = o.filter || 'bandpass', q = o.q ?? 0.8;
    const freq = o.freq ?? 1000, mid = o.to > 0 ? Math.sqrt(freq * o.to) : freq, nyquist = ctx.sampleRate / 2;
    const width = type === 'lowpass' ? mid : type === 'highpass' ? nyquist - mid : mid / q;
    const peak = (o.gain ?? 0.1) * kit.level / Math.sqrt(clamp(width / nyquist, 0.01, 1));
    if (out.pool.n >= out.pool.max || !(peak > MIN_GAIN)) return;
    const t0 = startTime(o);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(freq, t0);
    const amp = ctx.createGain();
    const end = envelope(amp.gain, t0, peak, o);
    if (o.to > 0) filter.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide ?? (end - t0) * 0.7));
    src.start(t0, Math.random() * (noiseBuffer.duration - 1));
    finish(src, [src, filter, amp], out, end);
  }

  /**
   * Felt piano: two slightly detuned strings whose tone rounds off as they ring.
   * o: gain, ring (decay multiplier), strings (1 for a lighter voice), bus, at | when.
   */
  function piano(freq, o = {}) {
    const strings = o.strings === 1 ? [0] : [-2.5, 2.5];
    const ring = clamp(6 * (220 / freq) ** 0.35, 2.5, 7.5) * (o.ring ?? 1); // low notes ring longer
    for (const detune of strings) {
      tone({
        bus: o.bus, at: o.at, when: o.when, wave: felt, freq, detune, attack: 0.01, decay: ring,
        gain: (o.gain ?? 0.15) / strings.length,
        cutoff: Math.min(3200, freq * 5), cutoffTo: Math.max(240, freq * 1.4), glide: 0.8,
      });
    }
  }

  /** Soft bell: a sine with one inharmonic partial that fades sooner. o: gain, decay, bus, at. */
  function bell(freq, o = {}) {
    const gain = o.gain ?? 0.07, decay = o.decay ?? 0.6, base = { bus: o.bus, at: o.at, attack: 0.004 };
    tone({ ...base, freq, decay, gain });
    if (freq * 2.76 < 4200) tone({ ...base, freq: freq * 2.76, decay: decay * 0.4, gain: gain * 0.2 });
  }

  const kit = {
    ctx, master, buses, noiseBuffer, tone, noise, piano, bell,
    level: 1,        // distance scale for the sound being triggered
    delay: 0,        // stagger for the sound being triggered
    root: KEY_ROOT,  // the music's current key root (MIDI)

    /**
     * Frequency of a pentatonic step in the music's current key, so chimes agree
     * with the piano. Step 0 is the tonic at or above MIDI `floor`; 5 is an octave up.
     */
    key(step, floor = 60) {
      const octave = Math.floor(step / 5);
      return mtof(fold(kit.root, floor) + 12 * octave + PENTA[step - 5 * octave]);
    },

    /** 1 beside the player, falling to 0 at HEARING; 1 when `at` has no position. */
    nearness(at) {
      const p = game.player;
      if (!at || !p || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return 1;
      const t = clamp((HEARING - Math.hypot(at.x - p.x, at.z - p.z)) / (HEARING - NEAR), 0, 1);
      return t * t;
    },
  };
  return kit;
}

function whiteNoise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// Reverb impulse: stereo noise that fades and darkens, like a wooden hall.
function impulse(ctx, seconds) {
  const rate = ctx.sampleRate, n = Math.floor(rate * seconds), pre = Math.floor(rate * 0.018);
  const buffer = ctx.createBuffer(2, n, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let smooth = 0;
    for (let i = pre; i < n; i++) {
      const t = (i - pre) / (n - pre);
      smooth += (Math.random() * 2 - 1 - smooth) * (0.5 - 0.42 * t);
      data[i] = smooth * (1 - t) ** 2.6;
    }
  }
  return buffer;
}

// Transparent below 0.6, then rounds off, so stacked sounds never clip harshly.
function softClip(ctx) {
  const shaper = ctx.createWaveShaper(), n = 2048, curve = new Float32Array(n), knee = 0.6;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    curve[i] = a < knee ? x : Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
  }
  shaper.curve = curve;
  return shaper;
}

// ------------------------------------------------------------------ music

/**
 * Generative piece: a slow string pad changes chord every two bars, a felt
 * piano speaks in short phrases with bars of silence between them, and now and
 * then a violin plays one long line. Nothing repeats; each bar is scheduled a
 * moment before it starts, on the audio clock.
 */
function createMusic(kit, game) {
  const st = {
    at: -Infinity,    // start time of the next bar
    bar: 0,
    mood: TIMES.day, color: BIOME_SOUND.meadow,
    chordName: '', tones: new Set(), // the current chord and its pitch classes
    ladder: [],       // piano notes available in this key and register
    last: 0,          // last melody note (MIDI)
    phrase: 2, rest: 0,              // bars left in the piano's phrase / silence
    violinIn: 2, violinBars: 0,      // chord changes until the next violin line / bars it still plays
    hush: -1,
  };

  function enterSection(t0) {
    const night = nightOf(game), hour = Number.isFinite(game.hour) ? game.hour : 12;
    st.mood = TIMES[night > 0.6 ? 'night' : night > 0.15 ? 'dusk' : hour < 11.5 ? 'morning' : 'day'];
    st.color = biomeSound(game);
    const root = KEY_ROOT + st.color.shift;
    if (root !== kit.root && st.bar > 0) { st.phrase = 0; st.rest = Math.max(st.rest, 1); } // let a new key settle first
    kit.root = root;
    st.ladder = [];
    for (let m = root + st.mood.low; m <= root + st.mood.high; m++) if (st.mood.scale.includes(pitchClass(m - root))) st.ladder.push(m);
    if (!st.last) st.last = root + st.mood.low + 9;
    kit.buses.pad.node.frequency.setTargetAtTime(st.mood.pad, t0, 2);
  }

  function changeChord(t0, beat) {
    const { mood, color } = st, home = mood.chords[0];
    st.chordName = st.chordName !== home && rand() < 0.4 ? home : pick(mood.chords.filter((name) => name !== st.chordName));
    const chord = CHORDS[st.chordName], span = CHORD_BARS * 4 * beat;
    st.tones = new Set([chord.bass, ...chord.pad].map(pitchClass));
    for (const offset of chord.pad) {
      for (const detune of [-7, 7]) {
        kit.tone({ bus: 'pad', type: 'sawtooth', freq: mtof(kit.root + offset), detune, when: t0, attack: 3, hold: span - 2.5, decay: 5, gain: 0.028 });
      }
    }
    if (rand() < mood.bass) kit.piano(mtof(fold(kit.root + chord.bass, mood.bassFloor)), { bus: 'music', when: t0 + rand(0, 0.03), gain: 0.15 });
    if (--st.violinIn <= 0) {
      violinLine(t0, beat);
      st.violinBars = CHORD_BARS;
      st.violinIn = Math.max(2, Math.round(rand(3, 6.5) / (mood.violin * color.violin)));
    }
  }

  const inChord = (midi) => st.tones.has(pitchClass(midi - kit.root));

  function chordTone(midi) {
    let best = midi, gap = Infinity;
    for (const m of st.ladder) {
      if (Math.abs(m - midi) < gap && inChord(m)) { best = m; gap = Math.abs(m - midi); }
    }
    return best;
  }

  // The melody wanders by step, leaning back toward the middle of its register.
  function nextPitch(strong) {
    const ladder = st.ladder, top = ladder.length - 1;
    let i = 0;
    for (let j = 1; j <= top; j++) if (Math.abs(ladder[j] - st.last) < Math.abs(ladder[i] - st.last)) i = j;
    const up = rand() < 0.5 + ((top / 2 - i) / (top + 1)) * 0.9;
    const step = (up ? 1 : -1) * (rand() < 0.72 ? 1 : 2);
    i = clamp(i + step < 0 || i + step > top ? i - step : i + step, 0, top); // turn around at the edges
    let midi = ladder[i];
    // strong beats settle on a chord tone, unless that would just repeat the last note
    if (strong && rand() < 0.7 && chordTone(midi) !== st.last) midi = chordTone(midi);
    st.last = midi;
    return midi;
  }

  function pianoBar(t0, beat) {
    const density = st.mood.density * (st.violinBars > 0 ? 0.45 : 1); // make room for the violin
    for (let slot = 0; slot < SLOT_WEIGHT.length; slot++) {
      if (rand() > SLOT_WEIGHT[slot] * density) continue;
      const strong = slot % 4 === 0;
      const midi = nextPitch(strong);
      const when = t0 + (slot * beat) / 2 + rand(0, 0.03);
      const gain = rand(0.12, 0.18) * (strong ? 1 : 0.85);
      kit.piano(mtof(midi), { bus: 'music', when, gain });
      if (!strong || rand() > 0.3) continue;
      // now and then a chord tone a third to a sixth below makes a two-note chord
      const under = st.ladder.findLast((m) => m <= midi - 3 && m >= midi - 9 && inChord(m));
      if (under) kit.piano(mtof(under), { bus: 'music', when: when + 0.025, gain: gain * 0.7 });
    }
  }

  // Two to four long legato notes inside one chord, starting and ending on chord tones.
  function violinLine(t0, beat) {
    const floor = kit.root + st.mood.low + 5;
    const reach = st.ladder.filter((m) => m >= floor && m <= floor + 16);
    if (reach.length < 3) return;
    const top = reach.length - 1, breath = randInt(0, 2);
    let i = clamp(Math.floor(top / 2) + randInt(-1, 1), 0, top), dir = pick([-1, 1]), prev = 0;
    let left = CHORD_BARS * 4 - breath, when = t0 + breath * beat;
    for (let n = 0; n < 4 && left >= 2; n++) {
      const beats = Math.min(left, pick([2, 3, 3, 4]));
      left -= beats;
      const anchor = n === 0 || n === 3 || left < 2;
      let midi = anchor ? chordTone(reach[i]) : reach[i];
      if (midi === prev) midi = reach[clamp(i + dir, 0, top)]; // do not bow the same note twice
      prev = midi;
      const freq = mtof(midi), dur = beats * beat;
      for (const [detune, gain] of [[0, 0.055], [6, 0.025]]) {
        kit.tone({
          bus: 'music', type: 'sawtooth', freq, detune, when, gain, attack: 0.5, hold: Math.max(0.1, dur - 0.4), decay: 1.5,
          cutoff: Math.min(2200, freq * 3), vibrato: { rate: 5.2, depth: 12, delay: 0.45 },
        });
      }
      when += dur;
      if (i + dir < 0 || i + dir > top) dir = -dir; // the line rises or falls, turning at the edge of its range
      i = clamp(i + dir * pick([1, 1, 2]), 0, top);
    }
  }

  function scheduleBar() {
    const t0 = st.at;
    if (st.bar % SECTION_BARS === 0) enterSection(t0);
    const { mood, color } = st, beat = mood.beat;
    if (st.bar % CHORD_BARS === 0) changeChord(t0, beat);
    if (st.phrase === 0 && st.rest === 0) st.phrase = randInt(1, 2);
    if (st.phrase > 0) {
      pianoBar(t0, beat);
      if (--st.phrase === 0) st.rest = Math.round(randInt(mood.rest[0], mood.rest[1]) * color.space);
    } else {
      st.rest--;
    }
    if (st.violinBars > 0) st.violinBars--;
    st.at = t0 + 4 * beat;
    st.bar++;
  }

  return {
    update(now) {
      if (st.at < now - 1) { st.bar = 0; st.at = now + 0.4; } // first run, or back from a stall: open a fresh section
      while (st.at < now + LOOKAHEAD) scheduleBar();
      // softer behind the title screen and while the player is down
      const hush = game.paused ? 0.7 : game.player && game.player.dead ? 0.5 : 1;
      if (hush === st.hush) return;
      st.hush = hush;
      kit.buses.music.node.gain.setTargetAtTime(LEVELS.music * hush, now, 0.7);
    },
  };
}

// --------------------------------------------------------------- ambience

const WATER_RINGS = [[4, 1], [8, 0.7], [13, 0.4]]; // [radius, weight] of the samples around the player

/** 0..1: how much water lies around the player (1 on a shoreline or wading). */
function waterNear(game) {
  const world = game.world, p = game.player;
  if (!world || typeof world.waterDepth !== 'function' || !p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) return 0;
  let wet = world.waterDepth(p.x, p.z) > 0 ? 1.5 : 0, total = 1.5;
  for (const [radius, weight] of WATER_RINGS) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + radius;
      if (world.waterDepth(p.x + Math.cos(a) * radius, p.z + Math.sin(a) * radius) > 0) wet += weight;
      total += weight;
    }
  }
  return clamp((wet / total) * 2.4, 0, 1);
}

/** A wind bed, a water wash near water, birds by day and crickets by night. */
function createAmbience(kit, game) {
  const ctx = kit.ctx;

  // A looping band of noise whose level and tone are steered from update().
  function bed(rate, highpass, lowpass) {
    const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), gain = ctx.createGain();
    src.buffer = kit.noiseBuffer;
    src.loop = true;
    src.playbackRate.value = rate;
    hp.type = 'highpass';
    hp.frequency.value = highpass;
    lp.frequency.value = lowpass;
    gain.gain.value = 0;
    src.connect(hp).connect(lp).connect(gain).connect(kit.buses.amb.node);
    src.start();
    return { level: gain.gain, tone: lp.frequency };
  }
  const wind = bed(0.8, 90, 450), water = bed(1.1, 220, 900);
  let bedIn = 0, birdIn = rand(2, 5), cricketIn = rand(1, 4);

  function birdSong() {
    const base = rand(1900, 3000), voice = { bus: 'air', pan: rand(-0.8, 0.8), gain: rand(0.018, 0.032), attack: 0.012 };
    const kind = randInt(0, 2);
    if (kind === 0) { // a few rising tweets
      for (let i = 0, n = randInt(2, 3); i < n; i++) kit.tone({ ...voice, freq: base, to: base * 1.3, glide: 0.07, at: i * 0.17, decay: 0.12 });
    } else if (kind === 1) { // a short falling trill
      for (let i = 0, n = randInt(3, 6); i < n; i++) kit.tone({ ...voice, freq: base * (1.2 - i * 0.035), to: base * (1.05 - i * 0.035), glide: 0.04, at: i * 0.08, decay: 0.07 });
    } else { // a slow two-note call
      kit.tone({ ...voice, freq: base * 0.85, hold: 0.14, decay: 0.2 });
      kit.tone({ ...voice, freq: base * 0.67, at: 0.34, hold: 0.2, decay: 0.3 });
    }
  }

  function cricket() {
    const voice = { bus: 'air', pan: rand(-0.9, 0.9), gain: rand(0.012, 0.02), freq: rand(3300, 3800), attack: 0.008, decay: 0.045 };
    for (let chirp = 0, n = randInt(2, 4); chirp < n; chirp++) {
      for (let pulse = 0; pulse < 3; pulse++) kit.tone({ ...voice, at: chirp * 0.36 + pulse * 0.05 });
    }
  }

  return {
    update(now, dt) {
      const flavor = biomeSound(game), night = nightOf(game);
      bedIn -= dt;
      if (bedIn <= 0) {
        bedIn = 0.3;
        const gust = 0.5 + 0.3 * Math.sin(now * 0.13) + 0.2 * Math.sin(now * 0.31 + 1.7);
        wind.level.setTargetAtTime(flavor.wind * (0.32 + 0.5 * gust), now, 0.9);
        wind.tone.setTargetAtTime(330 + 330 * gust, now, 0.9);
        const wash = 0.5 + 0.5 * Math.sin(now * 0.85 + 0.6 * Math.sin(now * 0.23)); // waves swell and draw back
        water.level.setTargetAtTime(waterNear(game) * (0.22 + 0.36 * wash), now, 0.6);
        water.tone.setTargetAtTime(650 + 550 * wash, now, 0.6);
      }
      if (night < 0.35) birdIn -= dt * flavor.birds;
      if (birdIn <= 0) {
        birdSong();
        birdIn = rand(5, 14);
      }
      if (night > 0.6) cricketIn -= dt * flavor.crickets;
      if (cricketIn <= 0) {
        cricket();
        cricketIn = rand(4, 11);
      }
    },
  };
}
