// Lumenwake audio: effects, a calm generative piano-and-strings score that
// knows which area the hero is in and what is happening there, and a quiet
// outdoor ambience, all synthesized with the Web Audio API (no files).
//
// To add a sound, add one entry to SOUNDS keyed by the bus event name. It is
// called with the kit (tone, noise, piano, bell, key) and the event payload.
// To give a new area its music and ambience, add one row to AREAS.

const LEVELS = { master: 1, sfx: 1, music: 0.5, ambience: 0.55 }; // the mix: music sits well under effects (turned down from 0.6 after a first listen)
const SPARE = 0.86;       // every area's piano speaks this much as often as its row says: a little less music everywhere
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
  hound: { freq: 340, type: 'sawtooth', bend: 1.35 },
  watcher: { freq: 980, type: 'square', bend: 1.0 },
  delver: { freq: 120, type: 'sawtooth', bend: 0.7 },
  strider: { freq: 210, type: 'square', bend: 1.5 },
  mite: { freq: 1400, type: 'triangle', bend: 1.6 },
  // the elders: their roar is this voice a long way down (see 'boss:roar')
  warden: { freq: 190, type: 'square', bend: 0.8 },
  matron: { freq: 330, type: 'sine', bend: 0.72 },
  sentinel: { freq: 420, type: 'triangle', bend: 1.1 },
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

  // ---- sites, the lumen, and the newer creatures' moves
  'site:used'(k, { site }) {
    // something found: a small rising figure, a little different for each kind of site
    const steps = { mark: [0, 4, 7], beacon: [0, 7, 12], crystal: [4, 7, 11], cargo: [0, 2, 7] }[site] || [0, 4, 7];
    steps.forEach((step, i) => k.bell(k.key(step, 67), { bus: 'chime', at: i * 0.11, decay: 1.2, gain: 0.05 }));
    k.noise({ freq: 900, to: 2600, glide: 0.4, q: 1.2, attack: 0.2, decay: 0.5, gain: 0.04 });
  },
  'site:guard': spatial((k, { guard }) => {
    const f = voiceOf(guard).freq * 0.7;
    k.tone({ type: 'sawtooth', cutoff: 900, freq: f, to: f * 1.4, glide: 0.25, attack: 0.03, hold: 0.1, decay: 0.3, gain: 0.1 });
  }, (p) => p.guard),
  'lumen:bolt'(k) {
    k.tone({ type: 'sine', freq: 1250 * rand(0.96, 1.05), to: 760, glide: 0.1, attack: 0.004, decay: 0.12, gain: 0.03 });
  },
  'lumen:ready'(k) {
    [0, 7].forEach((step, i) => k.bell(k.key(step, 74), { bus: 'chime', at: i * 0.13, decay: 0.9, gain: 0.045 }));
  },
  'lumen:burst'(k, { burst }) {
    const kind = burst ? burst.kind : 'ring';
    if (kind === 'mend') { [0, 4, 7, 12].forEach((step, i) => k.tone({ bus: 'chime', freq: k.key(step, 67), at: i * 0.08, attack: 0.03, decay: 0.9, gain: 0.045 })); return; }
    if (kind === 'ward') { k.tone({ type: 'triangle', freq: 180, to: 300, glide: 0.3, attack: 0.03, hold: 0.1, decay: 0.6, gain: 0.1 }); k.bell(k.key(0, 62), { bus: 'chime', decay: 1.4, gain: 0.05 }); return; }
    k.noise({ freq: 500, to: 2200, glide: 0.25, q: 0.9, attack: 0.03, decay: 0.45, gain: 0.11 });
    k.tone({ freq: 150, to: 70, attack: 0.01, decay: 0.45, gain: 0.12 });
    k.bell(k.key(7, 67), { bus: 'chime', at: 0.05, decay: 0.9, gain: 0.04 });
  },
  'lumen:fed'(k) {
    k.tone({ type: 'sine', freq: 520, to: 780, glide: 0.08, attack: 0.005, decay: 0.14, gain: 0.05 });
  },
  'lumen:changed'(k) {
    [0, 4, 7, 11, 14].forEach((step, i) => k.bell(k.key(step, 62), { bus: 'chime', at: i * 0.14, decay: 1.5, gain: 0.05 }));
  },
  'lance:fire': spatial((k) => {
    k.tone({ type: 'sawtooth', cutoff: 1800, freq: 620, to: 140, glide: 0.18, attack: 0.003, decay: 0.3, gain: 0.13 });
    k.noise({ freq: 2800, to: 700, glide: 0.2, q: 1.0, attack: 0.003, decay: 0.25, gain: 0.08 });
  }),
  talk(k) {
    // someone speaks: two soft notes, like a hello
    k.tone({ type: 'triangle', cutoff: 1400, freq: k.key(0, 69), attack: 0.01, decay: 0.16, gain: 0.04 });
    k.tone({ type: 'triangle', cutoff: 1400, freq: k.key(4, 69), at: 0.1, attack: 0.01, decay: 0.2, gain: 0.04 });
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

const SLOT_WEIGHT = [1.3, 0.15, 0.6, 0.25, 0.9, 0.15, 0.55, 0.25]; // piano chance on each eighth of a bar
const MAJOR = [0, 2, 4, 7, 9], MINOR = [0, 3, 5, 7, 10]; // five-note scales: no two notes a semitone apart
const STRING_FLOOR = 36;   // lowest note (MIDI) of the low strings a fight brings in
const HEAT_RISE = 1, HEAT_FALL = 2.5; // seconds for danger to be felt in the music, and to leave it
const DECK_FADE = 0.12;    // time constant, in seconds, of the fade when the key changes at once
const HELD_PAD = 0.8;      // level of the pad under a cinematic
const PAD_CUT = 0.7;       // time constant of a pad cut short: the same fall as the tail it would have had
const MIX_TIME = { all: 0.7, lead: 0.3, fight: 0.3, pad: 0.5 }; // time constants of the layer levels

// Chords as semitones above the area's root: a bass note and an open pad
// voicing. Capitals are major and small letters minor; a flat is spelled b.
// A chord may hold notes the area's scale does not: the melody leaves out any
// note that would rub against the chord sounding (see `over` in createMusic).
const CHORDS = {
  I: { bass: 0, pad: [0, 7, 16] },
  Isus: { bass: 0, pad: [0, 7, 14] },     // no third, so it sits in major and minor alike
  II: { bass: 2, pad: [-3, 6, 14] },      // the Lydian chord
  'II/I': { bass: 0, pad: [2, 9, 18] },   // ...and the same held over the tonic
  ii: { bass: 2, pad: [-7, 2, 9] },
  iii: { bass: 4, pad: [-1, 7, 16] },
  IV: { bass: 5, pad: [-3, 5, 12] },
  Vsus: { bass: 7, pad: [-5, 2, 12] },
  vi: { bass: 9, pad: [-3, 4, 12] },
  i: { bass: 0, pad: [0, 7, 15] },
  III: { bass: 3, pad: [-2, 7, 15] },
  iv: { bass: 5, pad: [-4, 5, 12] },
  v: { bass: 7, pad: [-5, 2, 10] },
  VI: { bass: 8, pad: [-4, 3, 12] },
  VII: { bass: 10, pad: [-2, 5, 14] },
  vii: { bass: 10, pad: [-2, 5, 13] },    // the Phrygian chord: home, a tone down and minor
};

// One row per area (game.biome.id): what makes the place sound like itself.
// Adding a place to visit is adding a row; an id without one plays the town's.
//
//   root       the tonic, as a MIDI note (D3 is 50)
//   scale      five notes above the root: the melody's, and the ones chimes and
//              effects are tuned to (kit.key), so they agree with the piano
//   color      notes the melody may add: what gives the mode its name (optional)
//   chords     names from CHORDS; the first is home
//   tense      the chords while creatures are after the hero: the darker ones of the same mode
//   elder      { scale, color, chords } for a fight with an elder: a darker mode on the same root
//   beat       seconds per beat when calm
//   low, high  the piano's register, in semitones above the root
//   piano      how often the piano speaks, 0..1
//   rest       bars of silence between its phrases, [fewest, most]
//   bass       how likely the piano sounds the bass of a new chord;  bassFloor: its lowest note (MIDI)
//   bow        how often a bowed line plays (1 is now and then)
//   bowLow     bottom of the bowed line's register above the root: 0 is a cello, 17 a violin
//   glass      share of the melody sung by a soft glass tone instead of the piano, 0..1
//   pad        brightness of the string pad, in Hz
//   pulse      the low strings' figure in a fight: one entry per beat of the bar,
//              semitones above the chord's bass (null rests)
//   wind, birds, crickets   how much of each the ambience has (0 is none)
const AREAS = {
  // Meridian Landing: D major on five notes. The warmest, and the one with the most tune.
  town: {
    root: 50, scale: MAJOR, color: [], chords: ['I', 'IV', 'Isus', 'vi', 'Vsus', 'ii'], tense: ['vi', 'ii', 'Vsus'],
    beat: 1.08, low: 12, high: 36, piano: 0.62, rest: [1, 2], bass: 0.6, bassFloor: 40,
    bow: 1.2, bowLow: 17, glass: 0, pad: 800, pulse: [0, null, 7, null],
    wind: 0.5, birds: 1.1, crickets: 0,
  },
  // Glasswood Terraces: F Lydian, quicker and higher, with a little glass in it.
  glasswood: {
    root: 53, scale: MAJOR, color: [6], chords: ['I', 'II', 'Isus', 'vi', 'II/I'], tense: ['vi', 'iii', 'II'],
    elder: { scale: MINOR, color: [2], chords: ['i', 'VI', 'iv', 'VII'] },
    beat: 0.96, low: 12, high: 35, piano: 0.58, rest: [1, 2], bass: 0.35, bassFloor: 41,
    bow: 0.9, bowLow: 19, glass: 0.18, pad: 900, pulse: [0, null, 7, null],
    wind: 0.6, birds: 1.5, crickets: 0,
  },
  // Ember Shelf: B flat Dorian, slow and low. A cello has most of the tune.
  ember: {
    root: 46, scale: MINOR, color: [9], chords: ['i', 'IV', 'VII', 'Isus', 'v'], tense: ['i', 'v', 'VII'],
    elder: { scale: MINOR, color: [8], chords: ['i', 'vii', 'iv', 'VI'] },
    beat: 1.3, low: 10, high: 29, piano: 0.44, rest: [2, 3], bass: 0.85, bassFloor: 36,
    bow: 1.5, bowLow: 0, glass: 0, pad: 620, pulse: [0, null, null, 7],
    wind: 1, birds: 0.2, crickets: 0.6,
  },
  // The Hush: E flat minor, the slowest. Glass tones over a still, dark pad.
  hush: {
    root: 51, scale: MINOR, color: [2], chords: ['Isus', 'VI', 'i', 'iv', 'VII'], tense: ['i', 'iv', 'VI'],
    elder: { scale: MINOR, color: [8], chords: ['i', 'iv', 'vii', 'VI'] },
    beat: 1.42, low: 14, high: 36, piano: 0.42, rest: [1, 3], bass: 0.5, bassFloor: 39,
    bow: 0.5, bowLow: 12, glass: 0.75, pad: 520, pulse: [0, null, null, null],
    wind: 0.35, birds: 0, crickets: 1.2,
  },
  // Rime Steps: E major with its seventh, high and thin, and mostly silence.
  rime: {
    root: 52, scale: MAJOR, color: [11], chords: ['Isus', 'iii', 'vi', 'I', 'Vsus'], tense: ['vi', 'iii', 'ii'],
    elder: { scale: MINOR, color: [2], chords: ['i', 'III', 'VI', 'v'] },
    beat: 1.2, low: 16, high: 36, piano: 0.4, rest: [2, 3], bass: 0.25, bassFloor: 40,
    bow: 0.8, bowLow: 19, glass: 0.12, pad: 980, pulse: [0, null, 12, null],
    wind: 1.15, birds: 0.2, crickets: 0,
  },
};
const areaOf = (game) => lookup(AREAS, game.biome && game.biome.id, AREAS.town);

// How the piece stands toward what is happening. A stance bends the area's row:
//
//   pace    multiplies the beat (under 1 is faster);   bars: how long a chord lasts
//   piano   multiplies how often the piano speaks;     drop: semitones its register falls
//   space   multiplies the silences between its phrases
//   glass   multiplies the share of glass tones
//   left    level of the piano's bass note on every bar (0: now and then, on a new chord);
//           octave: it tolls with the octave above
//   drum    level of the low drum on each beat of the bar;  deep: a bigger, slower drum
//   drone   the low strings hold one note a bar instead of the area's pulse
//   toll    level of a low bell on every other bar
//
// Everything a fight adds is lower, slower and quieter than the piano.
const STANCES = {
  calm: { pace: 1, bars: 2, piano: 1, space: 1, drop: 0, glass: 1, left: 0 },
  tense: { pace: 0.92, bars: 1, piano: 0.4, space: 2, drop: 7, glass: 0.3, left: 0.15, drum: [0.05, 0, 0, 0] },
  elder: { pace: 1.06, bars: 2, piano: 0.4, space: 1.5, drop: 12, glass: 0, left: 0.16, octave: true, drum: [0.055, 0, 0.03, 0], deep: true, drone: true, toll: 0.05 },
  rage: { pace: 0.86, bars: 1, piano: 0.4, space: 2, drop: 12, glass: 0, left: 0.16, octave: true, drum: [0.055, 0, 0.03, 0], deep: true, drone: true, toll: 0.05 },
};

// Short answers to what happens, in the area's key, played once and left to ring.
//
// Each is played over the area's home chord, which the piece goes to for it.
//
//   steps   notes as steps of the area's five-note scale (as kit.key: 5 is an octave up),
//           half a beat apart (ANSWER_STEP at most)
//   floor   the MIDI note the steps are counted from (the tonic at or above it)
//   roll    the home chord is rolled after the last of them
const ANSWERS = {
  clear: { steps: [3, 5], floor: 60, gain: 0.11 },                  // an island is quiet again: up a fourth to the tonic
  done: { steps: [2, 3, 5], floor: 57, gain: 0.12, roll: true },    // the contract is done: the same, from a step lower, and the chord
  home: { steps: [8, 7, 6, 5], floor: 50, gain: 0.12, roll: true }, // back at the landing, paid: down to the tonic
};
const ANSWER_STEP = 0.5;   // seconds: the hero is lifted out 2.6 s after a contract is done, and its answer must be over

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
      ambience = createAmbience(fresh, game, music);
      kit = fresh; // only once everything is built
      // what the music listens for itself: where the hero is, and the moments it answers
      for (const [type, hear] of Object.entries(music.hears)) bus.on(type, (payload) => safely(() => hear(payload ?? {})));
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

  let early = null;       // the one sound asked for before there was a kit to play it (the arrival's opening notes)
  function trigger(type, payload) {
    if ((!kit || kit.ctx.state !== 'running') && type === 'cine:open') early = { type, payload, at: Date.now() };
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
    if (early) { const e = early; early = null; if (Date.now() - e.at < 2500) trigger(e.type, e.payload); }
    const now = kit.ctx.currentTime;
    if (now - lastTick < TICK) return;
    const dt = Math.min(now - lastTick, 0.5);
    lastTick = now;
    music.update(now, dt);
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
  // The string pad shares one low-pass so it can never buzz. (The music adds its
  // own buses in front of this and of the music bus: see the decks in createMusic.)
  const padFilter = ctx.createBiquadFilter();
  padFilter.frequency.value = AREAS.town.pad;
  padFilter.Q.value = 0.3;
  padFilter.connect(buses.music.node);

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

  // Wires a voice to its bus, counts it, and cleans it up when it ends. A bus
  // that keeps a `live` list (the music's decks) can end its voices early.
  function finish(source, chain, out, t0, end, extras = []) {
    for (let i = 0; i < chain.length - 1; i++) chain[i].connect(chain[i + 1]);
    chain[chain.length - 1].connect(out.node);
    out.pool.n++;
    if (out.live) out.live.set(source, { t0, end });
    source.onended = () => {
      out.pool.n--;
      if (out.live) out.live.delete(source);
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
    finish(osc, chain, out, t0, end, extras);
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
    finish(src, [src, filter, amp], out, t0, end);
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
    ctx, master, buses, padFilter, noiseBuffer, tone, noise, piano, bell,
    level: 1,        // distance scale for the sound being triggered
    delay: 0,        // stagger for the sound being triggered
    root: AREAS.town.root,    // the music's current key root (MIDI)...
    scale: AREAS.town.scale,  // ...and its five-note scale: both follow the area (and its elder)

    /**
     * Frequency of a step of the five-note scale the music is in, so chimes agree
     * with the piano. Step 0 is the tonic at or above MIDI `floor`; 5 is an octave up.
     */
    key(step, floor = 60) {
      const octave = Math.floor(step / 5);
      return mtof(fold(kit.root, floor) + 12 * octave + kit.scale[step - 5 * octave]);
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
 * Generative score. The calm piece is the same kind of thing everywhere: a slow
 * string pad changes chord, a felt piano speaks in short phrases with bars of
 * silence between them, and now and then a bowed line plays a few long notes.
 * Its key, speed, register and instruments are the area's row in AREAS.
 *
 * What is happening bends it (STANCES) by bringing layers in and out, never by
 * changing the track. Creatures after the hero tighten the chords and add low
 * strings and a soft drum; an elder moves the area into its darker mode and
 * tolls; low health thins everything; a cinematic leaves only the pad.
 *
 * Nothing repeats and nothing is written far ahead of the audio clock. Three
 * clocks keep it close to the game: every tick reads the game (sense), every
 * bar re-reads the stance, and a fight's layers are written a beat at a time.
 */
function createMusic(kit, game) {
  const ctx = kit.ctx, out = kit.buses.music;
  const st = {
    at: -Infinity,                 // start time of the next beat
    bar: 0, beat: 0, len: 1,       // bars since the key was set, the beat within the bar, seconds per beat
    area: null,                    // the row of AREAS being played
    elder: false, fury: false,     // an elder is up / it is wounded
    stance: 'calm',
    heat: 0,                       // 0..1, smoothed: creatures are after the hero
    thin: 0, low: false,           // 0..1, smoothed: the hero's health is low
    held: false, blocks: true,     // a cinematic has the stage / the one playing holds the controls
    chordName: '', chord: CHORDS.I, chordIn: 0,   // the chord sounding, and bars until the next
    tones: new Set(),              // its pitch classes, bass included
    fit: () => false,              // may the melody play this note over it?
    ladder: [],                    // piano notes available over it
    last: 0, below: 0,             // last melody note (MIDI), and the note played under it, if one was
    phrase: 0, rest: 1,            // bars left in the piano's phrase / silence
    sure: false,                   // the piano's bass will sound on the next chord, whatever the odds
    bowIn: 2, bowBars: 0,          // chord changes until the next bowed line / bars it still plays
    fought: false,                 // the last beat had the fight layers in it
    busy: 0,                       // an effect's own flourish is sounding until then: answers wait for it
    felled: -Infinity,             // when an elder last came down
    mix: { all: -1 },              // the level each layer was last sent to
  };

  // ---- the mix: layers, and the decks they play through

  // A deck is the set of buses everything pitched plays through: `lead` (piano,
  // glass, bow), `call` (answers), `fight` (what danger adds) and `pad`. When the
  // key changes at once (another area, an elder waking or coming down) the deck
  // is faded out together with whatever was ringing or already written into it,
  // and a new one takes over, so two keys are never heard together.
  let deck = null;
  const spent = [];   // gains that have been faded out, until they can be let go

  const levels = () => ({
    lead: st.held ? 0 : 1,
    fight: st.held ? 0 : st.elder ? 1 : clamp((st.heat - 0.15) / 0.6, 0, 1),
    pad: st.held ? HELD_PAD : 1,
  });

  function layer(name, level = 1) {
    const node = ctx.createGain();
    node.gain.value = level;
    node.connect(name === 'pad' ? kit.padFilter : out.node);
    return (kit.buses[name] = deck[name] = { node, pool: out.pool, live: new Map() });
  }

  // Fades a layer out from `at`, and ends the voices sounding in it once they
  // cannot be heard, so they stop counting against the cap. (Ones that have not
  // started yet are left to run out silently: a voice is only counted off when
  // it ends, and not every browser ends one that never began.)
  function retire(bus, at, fade) {
    const gone = at + fade * 8;
    bus.node.gain.setTargetAtTime(0, at, fade);
    for (const [source, voice] of bus.live) {
      if (voice.t0 >= at || voice.end <= gone) continue;
      try { source.stop(gone); } catch { /* a browser that allows one stop only: the voice runs out silently */ }
    }
    spent.push({ node: bus.node, until: gone + 0.5 });
  }

  function newDeck(now) {
    if (deck) for (const bus of Object.values(deck)) retire(bus, now, DECK_FADE);
    deck = {};
    const level = levels();
    for (const name of ['lead', 'call', 'fight', 'pad']) layer(name, level[name]);
    Object.assign(st.mix, level);
  }

  // A chord cut short (the stance changed under it, or an answer took the piece
  // home) takes its pad with it, so the next chord is not heard through it.
  function cutPad(t0) {
    retire(deck.pad, t0, PAD_CUT);
    layer('pad', st.mix.pad);
  }

  function mix(now) {
    const p = game.player, level = levels();
    // softer behind the title screen and while the hero is down
    level.all = LEVELS.music * (game.paused ? 0.7 : p && p.dead ? 0.5 : 1);
    for (const name in level) {
      if (Math.abs(level[name] - st.mix[name]) < 0.02) continue;
      st.mix[name] = level[name];
      (name === 'all' ? out : deck[name]).node.gain.setTargetAtTime(level[name], now, MIX_TIME[name]);
    }
  }

  // ---- reading the game

  const harmony = () => (st.elder && st.area.elder) || st.area;   // the scale and chords in force
  const chords = () => (harmony() !== st.area ? harmony().chords : st.stance === 'tense' ? st.area.tense : st.area.chords);
  const fightStance = () => STANCES[st.elder ? (st.fury ? 'rage' : 'elder') : 'tense'];
  // a little danger does not start a fight in the music, and it is not over at the first lull
  const stanceNow = () => (st.elder ? (st.fury ? 'rage' : 'elder') : st.heat > (st.stance === 'tense' ? 0.25 : 0.5) ? 'tense' : 'calm');

  // Takes up a stance: the melody moves down or up with its register.
  function stand(name) {
    if (st.last) st.last += STANCES[st.stance].drop - STANCES[name].drop;
    st.stance = name;
  }

  // Where the hero is and whether an elder is up. Either one changing changes
  // the key at once: a new deck, and the piece opens again on its home chord.
  function place(now) {
    const area = areaOf(game), elder = (game.monsters || []).some((m) => m && m.boss && !m.dead);
    if (area === st.area && elder === st.elder) return;
    const moved = area !== st.area;
    st.area = area; st.elder = elder;
    st.heat = 0;                   // whatever fight there was is not this one
    kit.root = area.root;
    kit.scale = harmony().scale;
    newDeck(now);
    Object.assign(st, { at: now + (moved ? 0.6 : 0.3), bar: 0, beat: 0, chordName: '', chordIn: 0, phrase: 0, rest: 1, last: 0, bowIn: 2, bowBars: 0 });
  }

  function sense(now, dt) {
    place(now);
    let awake = 0, fury = false;
    for (const m of game.monsters || []) {
      if (!m || m.dead) continue;
      if (m.boss && m.enraged) fury = true;
      const doing = m.ai && m.ai.state;
      if (doing === 'chase' || doing === 'attack' || doing === 'special') awake++;
    }
    st.fury = fury;
    const p = game.player, down = !p || p.dead;
    const want = down || !awake ? 0 : Math.min(1, 0.6 + 0.2 * awake);   // one straggler is less than a pack
    st.heat += (want - st.heat) * (1 - Math.exp(-dt / (want > st.heat ? HEAT_RISE : HEAT_FALL)));
    st.low = !down && p.maxHp > 0 && p.hp < p.maxHp * (st.low ? 0.38 : 0.3);
    st.thin += ((st.low ? 1 : 0) - st.thin) * (1 - Math.exp(-dt / 1.5));
    // a cinematic that holds the controls has the stage; one that only slows the fight does not
    const held = !!(game.cinema && game.cinema.active) && st.blocks;
    if (st.held && !held) {
      // It is over. After an elder's fall, a silence before the piano speaks;
      // after any other the piece opens again on its home chord, on a downbeat.
      if (now - st.felled < 15) Object.assign(st, { phrase: 0, rest: 2 });
      else {
        cutPad(now + 0.4);
        Object.assign(st, { at: now + 0.4, beat: 0, chordName: '', chordIn: 0, phrase: 0, rest: 0, sure: true });
      }
    }
    st.held = held;
  }

  // ---- harmony

  // May the melody sound a note over this chord? Only notes of the scale, never
  // one a semitone above a chord tone in any octave (the harsh rub), and never
  // one sitting right under a note of the pad.
  function over(chord) {
    const h = harmony(), root = kit.root;
    const notes = [...h.scale, ...(h.color || [])];
    const tones = new Set([chord.bass, ...chord.pad].map(pitchClass));
    const pad = new Set(chord.pad.map((offset) => root + offset));
    return (midi) => {
      const pc = pitchClass(midi - root);
      return notes.includes(pc) && !tones.has(pitchClass(pc - 1)) && !pad.has(midi + 1);
    };
  }

  const inChord = (midi) => st.tones.has(pitchClass(midi - kit.root));

  function chordTone(midi, notes = st.ladder) {
    let best = midi, gap = Infinity;
    for (const m of notes) {
      if (Math.abs(m - midi) < gap && inChord(m)) { best = m; gap = Math.abs(m - midi); }
    }
    return best;
  }

  // The piano's notes over the chord sounding. A fight brings its register down.
  function tune() {
    const { area } = st, drop = STANCES[st.stance].drop;
    const low = kit.root + Math.max(5, area.low - drop), high = Math.max(low + 12, kit.root + area.high - drop);
    st.ladder = [];
    for (let m = low; m <= high; m++) if (st.fit(m)) st.ladder.push(m);
    if (!st.last) st.last = low + 9;
  }

  function changeChord(t0, span) {
    const { area } = st, list = chords(), home = list[0], was = st.chordName;
    // a new key or stance opens on its home chord; after that the piece wanders and comes back
    st.chordName = !list.includes(was) ? home : was !== home && rand() < 0.4 ? home : pick(list.filter((name) => name !== was));
    const chord = st.chord = CHORDS[st.chordName], thin = st.thin > 0.5;
    st.tones = new Set([chord.bass, ...chord.pad].map(pitchClass));
    st.fit = over(chord);
    tune();
    const swell = Math.min(3, span * 0.4);
    for (const offset of chord.pad) {
      for (const detune of thin ? [0] : [-7, 7]) {   // low health: one string to a note, not two
        kit.tone({ bus: 'pad', type: 'sawtooth', freq: mtof(kit.root + offset), detune, when: t0, attack: swell, hold: span - swell + 0.5, decay: Math.min(5, span * 0.58), gain: 0.028 });
      }
    }
    kit.padFilter.frequency.setTargetAtTime(area.pad * (st.elder ? 0.75 : 1), t0, 2);
    if (st.stance !== 'calm' || st.held || thin || --st.bowIn > 0) return;
    bowLine(t0);
    st.bowBars = STANCES.calm.bars;
    st.bowIn = Math.max(2, Math.round(rand(3, 6.5) / area.bow));
  }

  // ---- the calm layers

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
    // two notes a semitone apart would ring against each other: step on past, or to the other side
    const rubs = (m) => Math.abs(m - st.last) === 1 || Math.abs(m - st.below) === 1;
    if (rubs(midi)) {
      const at = ladder.indexOf(midi), dir = Math.sign(midi - st.last) || 1;
      midi = [at + dir, at - 2 * dir, at + 2 * dir, at - dir].map((k) => ladder[k]).find((m) => m && !rubs(m)) ?? midi;
    }
    st.last = midi;
    st.below = 0;
    return midi;
  }

  // A glass tone: a soft sine that swells in rather than being struck, with a
  // fainter one a twelfth above. High notes are held back so none of them pierce.
  function glass(midi, when, gain) {
    const freq = mtof(midi), level = gain * Math.min(1, Math.sqrt(660 / freq)), pan = rand(-0.3, 0.3);
    kit.tone({ bus: 'lead', freq, when, pan, attack: 0.05, decay: 3.6, gain: level });
    if (freq * 3 < 4200) kit.tone({ bus: 'lead', freq: freq * 3.01, when, pan, attack: 0.08, decay: 1.4, gain: level * 0.12 });
  }

  function pianoBar(t0, opening) {
    const { area } = st, stance = STANCES[st.stance], thin = st.thin > 0.5;
    if (st.ladder.length < 3) return;
    // In a fight the piano is a lighter voice: one string to a note, damped sooner.
    // (It also keeps the count of voices down when the chords come every bar.)
    const touch = st.stance === 'calm' ? { bus: 'lead' } : { bus: 'lead', strings: 1, ring: 0.7 };
    // make room for the bow; say less when the hero is hurt
    const density = area.piano * stance.piano * SPARE * (st.bowBars > 0 ? 0.45 : 1) * (thin ? 0.5 : 1);
    for (let slot = 0; slot < SLOT_WEIGHT.length; slot++) {
      // (a phrase always begins: the downbeat of its first bar sounds, however sparse the area)
      if (!(opening && slot === 0) && rand() > SLOT_WEIGHT[slot] * density) continue;
      const strong = slot % 4 === 0;
      const midi = nextPitch(strong);
      const when = t0 + (slot * st.len) / 2 + rand(0, 0.03);
      const gain = rand(0.12, 0.18) * (strong ? 1 : 0.85);
      if (rand() < area.glass * stance.glass) { glass(midi, when, gain * 0.4); continue; }
      kit.piano(mtof(midi), { ...touch, when, gain });
      if (!strong || thin || rand() > 0.3) continue;
      // now and then a chord tone a third to a sixth below makes a two-note chord
      const under = st.ladder.findLast((m) => m <= midi - 3 && m >= midi - 9 && inChord(m));
      if (under) kit.piano(mtof(st.below = under), { ...touch, when: when + 0.025, gain: gain * 0.7 });
    }
  }

  // The piano's left hand: the bass of the chord. Calm, it sounds on some chord
  // changes; in a fight it marks every bar, and against an elder it tolls in octaves.
  function leftHand(t0, changed) {
    const stance = STANCES[st.stance], thin = st.thin > 0.5;
    if (!stance.left && !st.sure && (!changed || rand() > st.area.bass * (thin ? 0.5 : 1))) return;
    st.sure = false;
    const midi = fold(kit.root + st.chord.bass, st.area.bassFloor), when = t0 + rand(0, 0.03);
    // (in a fight the notes come every bar, so they are not left to ring into each other)
    kit.piano(mtof(midi), { bus: 'lead', when, gain: stance.left || 0.15, ring: stance.left ? 0.6 : 1 });
    if (stance.octave && !thin) kit.piano(mtof(midi + 12), { bus: 'lead', strings: 1, ring: 0.6, when: when + 0.03, gain: stance.left * 0.5 });
  }

  // Two to four long legato notes inside one chord, starting and ending on chord
  // tones: a violin where the area's row puts it high, a cello where it puts it low.
  function bowLine(t0) {
    const floor = kit.root + st.area.bowLow, beat = st.len, reach = [];
    for (let m = floor; m <= floor + 16; m++) if (st.fit(m)) reach.push(m);
    if (reach.length < 3) return;
    const top = reach.length - 1, breath = randInt(0, 2);
    let i = clamp(Math.floor(top / 2) + randInt(-1, 1), 0, top), dir = pick([-1, 1]), prev = 0;
    let left = STANCES.calm.bars * 4 - breath, when = t0 + breath * beat;
    for (let n = 0; n < 4 && left >= 2; n++) {
      const beats = Math.min(left, pick([2, 3, 3, 4]));
      left -= beats;
      const anchor = n === 0 || n === 3 || left < 2;
      let midi = anchor ? chordTone(reach[i], reach) : reach[i];
      if (midi === prev) { const at = reach.indexOf(prev); midi = reach[at + dir] ?? reach[at - dir]; } // do not bow the same note twice
      prev = midi;
      const freq = mtof(midi), dur = beats * beat, loud = clamp((400 / freq) ** 0.25, 0.8, 1.3); // low strings need more bow
      for (const [detune, gain] of [[0, 0.055], [6, 0.025]]) {
        kit.tone({
          bus: 'lead', type: 'sawtooth', freq, detune, when, gain: gain * loud, attack: 0.5, hold: Math.max(0.1, dur - 0.4), decay: 1.5,
          cutoff: Math.min(2200, freq * 3), vibrato: { rate: 5.2, depth: 12, delay: 0.45 },
        });
      }
      when += dur;
      if (i + dir < 0 || i + dir > top) dir = -dir; // the line rises or falls, turning at the edge of its range
      i = clamp(i + dir * pick([1, 1, 2]), 0, top);
    }
  }

  // ---- what a fight adds: all of it low, slow and under the piano

  // A soft low drum: a felt beater on a big skin, more felt than heard.
  function drum(when, gain, deep) {
    const freq = deep ? 60 : 76;
    kit.tone({ bus: 'fight', freq, to: freq * 0.6, glide: 0.2, when, attack: 0.008, decay: deep ? 0.75 : 0.45, gain });
    kit.tone({ bus: 'fight', type: 'triangle', cutoff: 260, freq: freq * 1.9, to: freq * 1.1, glide: 0.1, when, attack: 0.006, decay: 0.18, gain: gain * 0.35 });
  }

  // Cellos and basses: bowed, never plucked, and kept dark.
  function lowString(midi, when, seconds, gain) {
    const freq = mtof(midi);
    for (const [detune, share] of [[0, 0.65], [8, 0.35]]) {
      kit.tone({ bus: 'fight', type: 'sawtooth', freq, detune, when, gain: gain * share, attack: 0.14, hold: Math.max(0.1, seconds - 0.3), decay: 0.7, cutoff: Math.min(700, freq * 4) });
    }
  }

  // A low bell on the tonic, left to ring.
  function toll(when, gain) {
    const freq = mtof(fold(kit.root, 55));
    kit.tone({ bus: 'fight', freq, when, attack: 0.012, decay: 5.5, gain });
    kit.tone({ bus: 'fight', freq: freq * 2.76, when, attack: 0.012, decay: 2.2, gain: gain * 0.18 });
  }

  // One beat of the fight layers. They follow the danger itself, not the stance
  // of the bar, so they arrive and leave within a beat of the game.
  function fightBeat(t0) {
    const on = !st.held && (st.elder || st.heat > (st.fought ? 0.2 : 0.3));
    // the first beat of a fight is a downbeat, wherever in the bar it falls
    const first = on && !st.fought, beat = first ? 0 : st.beat;
    st.fought = on;
    if (!on) return;
    const stance = fightStance(), thin = st.thin > 0.5;
    if (stance.drum[beat]) drum(t0, stance.drum[beat] * (thin ? 0.8 : 1), stance.deep);
    if (thin) return;              // low health: the drum alone
    const bass = fold(kit.root + st.chord.bass, STRING_FLOOR);
    if (stance.drone) { if (beat === 0) lowString(bass, t0, (4 - st.beat) * st.len, 0.04); }   // held to the bar line
    else if (st.area.pulse[beat] != null) lowString(bass + st.area.pulse[beat], t0, st.len, 0.034);
    if (stance.toll && beat === 0 && (first || st.bar % 2 === 0)) toll(t0, stance.toll);
  }

  // ---- answers

  // The nearest note to `midi` that may sound over a chord.
  function snap(midi, fit) {
    for (const d of [0, 1, -1, 2, -2, 3, -3]) if (fit(midi + d)) return midi + d;
    return midi;
  }

  function answer(kind) {
    if (st.held || !st.area) return;
    const a = ANSWERS[kind], { area } = st, half = Math.min(area.beat / 2, ANSWER_STEP);
    const t0 = Math.max(ctx.currentTime + 0.12, st.busy);
    // It is over: whatever fight there was leaves at once, and the piece goes home
    // (it stays a bar if it is there already).
    st.heat = Math.min(st.heat, 0.2);
    const home = harmony().chords[0], chord = CHORDS[home];
    if (st.chordName === home && st.stance === 'calm') st.chordIn = Math.max(st.chordIn, 1);
    else {
      cutPad(t0);
      stand('calm');
      Object.assign(st, { at: t0, beat: 0, chordName: '', chordIn: 0 });
    }
    const fit = over(chord), base = fold(kit.root, a.floor), last = a.steps.length - 1;
    a.steps.forEach((step, i) => {
      const octave = Math.floor(step / 5);
      const midi = snap(base + 12 * octave + kit.scale[step - 5 * octave], fit);
      kit.piano(mtof(midi), { bus: 'call', when: t0 + i * half, gain: a.gain * (i === last ? 1.1 : 1) });
    });
    if (a.roll) {
      const when = t0 + (last + 1) * half;
      kit.piano(mtof(fold(kit.root + chord.bass, area.bassFloor)), { bus: 'call', when, gain: a.gain });
      chord.pad.forEach((offset, i) => kit.piano(mtof(kit.root + offset + 12), { bus: 'call', strings: 1, when: when + 0.05 + i * 0.07, gain: a.gain * 0.6 }));
    }
    // then silence, and the calm layer picks up again
    st.phrase = 0;
    st.rest = Math.max(st.rest, 2);
    st.busy = t0 + (last + 3) * half;
  }

  // ---- the scheduler

  function startBar(t0) {
    const name = stanceNow();
    if (name !== st.stance) {      // a new stance starts on a new chord
      if (st.chordIn > 0) cutPad(t0);
      stand(name);
      st.chordIn = 0;
    }
    const stance = STANCES[name], { area } = st;
    st.len = area.beat * stance.pace;
    const changed = st.chordIn <= 0;
    if (changed) { changeChord(t0, stance.bars * 4 * st.len); st.chordIn = stance.bars; }
    st.chordIn--;
    if (st.held) return;           // a cinematic is playing: the pad alone
    leftHand(t0, changed);
    const opening = st.phrase === 0 && st.rest === 0;
    if (opening) st.phrase = randInt(1, 2);
    if (st.phrase > 0) {
      pianoBar(t0, opening);
      if (--st.phrase === 0) st.rest = Math.round(randInt(area.rest[0], area.rest[1]) * stance.space);
    } else {
      st.rest--;
    }
    if (st.bowBars > 0) st.bowBars--;
  }

  function scheduleBeat() {
    const t0 = st.at;
    if (st.beat === 0) startBar(t0);
    fightBeat(t0);
    st.at = t0 + st.len;
    if (++st.beat === 4) { st.beat = 0; st.bar++; }
  }

  place(ctx.currentTime);

  return {
    update(now, dt) {
      sense(now, dt);
      if (st.at < now - 1) {       // back from a stall: pick up on a new bar and a new chord
        cutPad(now + 0.4);
        Object.assign(st, { at: now + 0.4, beat: 0, chordIn: 0 });
      }
      while (st.at < now + LOOKAHEAD) scheduleBeat();
      mix(now);
      for (let i = spent.length - 1; i >= 0; i--) if (spent[i].until < now) spent.splice(i, 1)[0].node.disconnect();
    },

    /** 0..1: how much of a fight is on. The ambience reads it: birds go quiet. */
    unrest: () => (st.elder ? 1 : st.heat),

    // Bus events the music hears (wired up by createAudio). The place and the
    // elder are also read every tick; hearing them here changes the key the
    // instant it happens, before the effects that follow are tuned.
    hears: {
      zone() { place(ctx.currentTime); },
      'boss:arrive'() { place(ctx.currentTime); },
      'boss:fell'() { st.felled = ctx.currentTime; place(ctx.currentTime); },
      'cine:begin'({ blocking }) { st.blocks = blocking !== false; },
      // effects that are flourishes of their own: an answer waits until they are over
      levelup() { st.busy = Math.max(st.busy, ctx.currentTime + 1.8); },
      'boss:down'() { st.busy = Math.max(st.busy, ctx.currentTime + 2.8); },
      'room:clear'({ kind }) { if (kind !== 'boss') answer('clear'); },   // an elder's fall has its own effects
      'mission:done'() { if (ctx.currentTime - st.felled > 20) answer('done'); },
      'mission:report'({ won }) { if (won) answer('home'); },
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

/** A wind bed, a water wash near water, and the area's birds and crickets (see AREAS). */
function createAmbience(kit, game, music) {
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
      const area = areaOf(game);
      bedIn -= dt;
      if (bedIn <= 0) {
        bedIn = 0.3;
        const gust = 0.5 + 0.3 * Math.sin(now * 0.13) + 0.2 * Math.sin(now * 0.31 + 1.7);
        wind.level.setTargetAtTime(area.wind * (0.32 + 0.5 * gust), now, 0.9);
        wind.tone.setTargetAtTime(330 + 330 * gust, now, 0.9);
        const wash = 0.5 + 0.5 * Math.sin(now * 0.85 + 0.6 * Math.sin(now * 0.23)); // waves swell and draw back
        water.level.setTargetAtTime(waterNear(game) * (0.22 + 0.36 * wash), now, 0.6);
        water.tone.setTargetAtTime(650 + 550 * wash, now, 0.6);
      }
      // Each place is seen at one hour, so its row says how many of each it has.
      birdIn -= dt * area.birds * (1 - music.unrest());   // birds fall quiet while there is fighting
      if (birdIn <= 0) {
        birdSong();
        birdIn = rand(5, 14);
      }
      cricketIn -= dt * area.crickets;
      if (cricketIn <= 0) {
        cricket();
        cricketIn = rand(4, 11);
      }
    },
  };
}
