// Lumenwake audio: effects, a calm score in which every area has a piece of
// its own and every elder a theme of its own, and which knows what is happening
// there, and a quiet outdoor ambience, all synthesized with the Web Audio API
// (no files).
//
// Most effects are recordings now (static/sfx: CC0 recordings from Kenney's packs, and a few made with ElevenLabs where
// none fitted; tools/sfx says which and how they are made). SAMPLED says which file answers which event, how loud and
// how varied; an event SAMPLED does not answer is synthesized by SOUNDS, as are the chimes, which are tuned to the
// music's key.
//
// To add a sound, add one entry to SOUNDS keyed by the bus event name. It is
// called with the kit (tone, noise, piano, bell, key) and the event payload.
// To give a new area its music and ambience, add one row to AREAS; to give a
// new elder its theme, add one row to BOSSES.

const LEVELS = { master: 1, sfx: 1, music: 0.5, ambience: 0.55 }; // the mix: music sits well under effects (turned down from 0.6 after a first listen)
const BASE_LEVELS = { ...LEVELS };  // ...as designed: the player's own levels (the 'volume' event) scale these
const SPARE = 0.86;       // every piece says this much of its tune: now and then a phrase is left out. A little less music everywhere
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
  keeper: { freq: 150, type: 'triangle', bend: 0.75 },
  drifter: { freq: 520, type: 'sine', bend: 1.3 },
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

  damage: spatial((k, { target, crit, soft }) => {
    if (soft) return;                 // (rot eating at something makes no sound of its own)
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
    if (rarity >= 4) return;          // (a relic has its own figure when it is picked up)
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

  // ---- relics, salvage and honing
  'relic:ring'(k, { heavy }) {
    k.tone({ freq: heavy ? 120 : 160, to: 70, attack: 0.005, decay: heavy ? 0.4 : 0.22, gain: heavy ? 0.11 : 0.07 });
    k.bell(k.key(heavy ? 7 : 4, 62), { bus: 'chime', decay: 0.7, gain: 0.03 });
  },
  'relic:found'(k) {
    [0, 4, 7, 11, 14].forEach((step, i) => k.bell(k.key(step, 62), { bus: 'chime', at: i * 0.13, decay: 2.0, gain: 0.055 }));
  },
  salvage(k) {
    k.noise({ freq: 1800, to: 700, q: 1.6, attack: 0.002, decay: 0.09, gain: 0.05 });
    k.bell(k.key(0, 74), { at: 0.05, decay: 0.3, gain: 0.04 });
  },
  hone(k) {
    k.tone({ type: 'triangle', freq: 300, to: 520, glide: 0.18, attack: 0.01, decay: 0.2, gain: 0.07 });
    [7, 12].forEach((step, i) => k.bell(k.key(step, 67), { bus: 'chime', at: 0.12 + i * 0.1, decay: 0.9, gain: 0.045 }));
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

  // off the ground: a soft, short breath of air going up
  jump(k, { entity }) {
    if (entity && entity.kind !== 'player') return;
    const v = rand(0.94, 1.08);
    k.noise({ freq: 520 * v, to: 1500 * v, glide: 0.14, q: 0.8, attack: 0.03, decay: 0.16, gain: 0.05 });
  },

  // and back on it: a soft thud, a little dust
  landed: spatial((k) => {
    const v = rand(0.92, 1.08);
    k.tone({ freq: 96 * v, to: 54, attack: 0.004, decay: 0.16, gain: 0.07 });
    k.noise({ filter: 'lowpass', freq: 520 * v, to: 220, attack: 0.004, decay: 0.12, gain: 0.04 });
  }),

  // off an edge: a short tone falling away
  fell(k) {
    k.tone({ type: 'triangle', cutoff: 1400, freq: 520, to: 150, glide: 0.5, attack: 0.02, hold: 0.1, decay: 0.45, gain: 0.07 });
    k.noise({ freq: 1300, to: 380, glide: 0.5, q: 0.7, attack: 0.06, decay: 0.45, gain: 0.035 });
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

// ---------------------------------------------------------- recordings
// Which recording answers an event: (payload, game) => { name, gain, rate?, at?, where?, keep? } (or a list of them),
// [] for silence, or null to leave the event to SOUNDS. `where` makes it fade with distance like a spatial sound;
// `keep` plays the synthesized sound as well (a chime under a recording). Gains put a file (levelled in tools/sfx)
// beside the synthesized effects; `rate` varies the pitch a little so a repeated blow is never the same twice.
const any = (...names) => names[Math.floor(Math.random() * names.length)];
const surface = (game) => { const id = game.biome && game.biome.id; return id === 'rime' ? 'snow' : id === 'town' || id === 'vault' || id === 'shatter' ? 'stone' : 'grass'; };
const SKILL_SAMPLES = {
  cleave: { name: 'swing-heavy', gain: 0.5, rate: 0.88 }, volley: { name: 'volley', gain: 0.22 }, bolt: { name: 'bolt', gain: 0.42 },
  nova: { name: 'nova', gain: 0.5 }, mend: { name: 'mend', gain: 0.36 }, step: { name: 'dash', gain: 0.42 },
};
const SAMPLED = {
  step({ entity, water }, game) {
    if ((entity && entity.kind !== 'player') || water) return null;           // (wading keeps its splash)
    const kind = surface(game), n = kind === 'snow' ? 3 : 4;
    return { name: `step-${kind}-${1 + Math.floor(Math.random() * n)}`, gain: kind === 'stone' ? 0.24 : 0.3, rate: rand(0.92, 1.08) };
  },
  swing: ({ heavy }) => ({ name: heavy ? 'swing-heavy' : any('swing-1', 'swing-2', 'swing-3', 'swing-4'), gain: heavy ? 0.46 : 0.38, rate: rand(0.94, 1.08) }),
  shoot: ({ family, heavy }) => (family === 'rifle'
    ? { name: heavy ? 'rifle-heavy' : any('rifle-1', 'rifle-2', 'rifle-3'), gain: heavy ? 0.36 : 0.3, rate: rand(0.95, 1.06) }
    : { name: any('rod-1', 'rod-2'), gain: heavy ? 0.4 : 0.32, rate: rand(0.94, 1.08) }),
  damage({ target, crit, soft, source, indirect }) {
    if (soft) return [];
    if (target && target.kind === 'player') return { name: any('hurt-1', 'hurt-2'), gain: 0.4, rate: rand(0.9, 1.05) };
    if (target && target.guard) return { name: 'guard', gain: 0.26, rate: rand(1.15, 1.3), where: target };
    const big = crit || (target && target.hp <= 0);
    const blow = { name: big ? any('crit-1', 'crit-2') : any('hit-1', 'hit-2', 'hit-3', 'hit-4'), gain: big ? 0.36 : 0.28, rate: rand(0.92, 1.08) * (target && target.def && target.def.giant ? 0.8 : 1), where: target };
    // a blade of light in the hero's own hand sizzles where it cuts
    if (source && source.kind === 'player' && source.family === 'blade' && !indirect) return [blow, { name: any('saber-hit-1', 'saber-hit-2', 'saber-hit-3'), gain: big ? 0.3 : 0.24, rate: rand(0.94, 1.08), where: target }];
    return blow;
  },
  'monster:died': (m) => (m.def && m.def.fall ? null : { name: any('die-1', 'die-2', 'die-3'), gain: 0.24, rate: rand(0.9, 1.15) * (m.elite ? 0.8 : 1), at: 0.03, where: m }),
  'monster:strike': (m) => (m.def && m.def.giant ? null : { name: any('claw-1', 'claw-2'), gain: 0.22, rate: rand(0.9, 1.12), where: m }),
  slam: (d) => ({ name: d.heavy ? 'slam' : 'slam-2', gain: d.heavy ? 0.42 : 0.3, rate: rand(0.94, 1.04), where: d }),
  'monster:shot': (m) => ({ name: 'zap', gain: 0.16, rate: rand(0.9, 1.1), where: m }),
  'shot:hit': (d) => ({ name: any('shot-hit-1', 'shot-hit-2'), gain: 0.2, rate: rand(0.9, 1.1), where: d }),
  'bolt:hit': (d) => ({ name: any('burst', 'burst-2'), gain: 0.28, rate: rand(0.95, 1.08), where: d }),
  'hazard:cloud': (d) => ({ name: 'spores', gain: 0.2, rate: rand(0.9, 1.05), where: d }),
  guard: (d) => ({ name: 'guard', gain: 0.24, where: d.entity }),
  'charge:dust': (d) => ({ name: any('step-stone-1', 'step-stone-2'), gain: 0.3, rate: 0.6, where: d }),
  'boss:step': (d) => ({ name: any('elder-step-1', 'elder-step-2'), gain: 0.5, rate: rand(0.92, 1.05), where: d.entity || d }),
  'boss:rise': () => ({ name: 'rumble', gain: 0.45 }),
  'cine:rumble': ({ power = 0.5 }) => ({ name: 'rumble', gain: 0.2 + 0.3 * power, rate: rand(0.9, 1.05) }),
  'boss:roar': ({ entity }) => ({ name: 'elder-roar', gain: 0.55, where: entity }),
  'boss:down': () => ({ name: 'elder-fall', gain: 0.6 }),
  'gate:shut': (d) => ({ name: 'gate', gain: 0.28, where: d }),
  'craft:pass': () => ({ name: 'shuttle-pass', gain: 0.5 }),
  'craft:land': () => ({ name: 'shuttle-land', gain: 0.5 }),
  'arrive:beam': () => ({ name: 'teleport', gain: 0.34, keep: true }),
  travel: () => ({ name: 'teleport', gain: 0.3, keep: true }),
  'player:respawn': () => ({ name: 'teleport', gain: 0.32, keep: true }),
  'player:died': () => ({ name: 'hurt-2', gain: 0.5, rate: 0.7, keep: true }),
  equip: () => ({ name: 'equip', gain: 0.34 }),
  'lumen:bolt': () => ({ name: 'lumen-zap', gain: 0.22, rate: rand(0.95, 1.1) }),
  'lumen:burst': () => ({ name: 'lumen-burst', gain: 0.42 }),
  drink: () => ({ name: 'drink', gain: 0.4 }),
  skill: ({ id }) => (SKILL_SAMPLES[id] ? { ...SKILL_SAMPLES[id], rate: (SKILL_SAMPLES[id].rate || 1) * rand(0.96, 1.04) } : null),
  'relic:ring': (d) => (d.heavy ? { name: 'slam-2', gain: 0.28, where: d } : { name: 'burst-2', gain: 0.16, rate: 1.2, where: d }),
  pickup: (d) => (d.rare ? null : d.item === 'glint' ? { name: any('coins-1', 'coins-2'), gain: 0.18, rate: rand(0.95, 1.1) } : { name: 'pickup', gain: 0.24, rate: rand(0.95, 1.1) }),
  trade: () => ({ name: any('coins-1', 'coins-2'), gain: 0.3 }),
  'bounty:claimed': () => ({ name: 'coins-1', gain: 0.3, keep: true }),
  salvage: () => ({ name: 'salvage', gain: 0.28 }),
  hone: () => ({ name: 'hone', gain: 0.38, keep: true }),
  'ui:click': () => ({ name: 'click', gain: 0.32 }),
  deny: () => ({ name: 'deny', gain: 0.3 }),
  jump: ({ entity }) => (entity && entity.kind !== 'player' ? null : { name: any('jump-1', 'jump-2'), gain: 0.28, rate: rand(1.0, 1.2) }),
  landed: (d) => ({ name: 'land', gain: 0.4, rate: 0.82, where: d }),
  // going down to a contract with a blade of light: it is switched on
  'mission:begin': (d, game) => (game.player && game.player.family === 'blade' ? { name: 'saber-ignite', gain: 0.4, at: 0.5 } : []),
};
// every file SAMPLED can ask for (static/sfx/<name>.wav)
const SAMPLE_NAMES = ['step-grass-1', 'step-grass-2', 'step-grass-3', 'step-grass-4', 'step-stone-1', 'step-stone-2', 'step-stone-3', 'step-stone-4',
  'step-snow-1', 'step-snow-2', 'step-snow-3', 'land', 'jump-1', 'jump-2', 'swing-1', 'swing-2', 'swing-3', 'swing-heavy',
  'swing-4', 'saber-hum', 'saber-ignite', 'saber-hit-1', 'saber-hit-2', 'saber-hit-3', 'rifle-1', 'rifle-2', 'rifle-3', 'rifle-heavy', 'rod-1', 'rod-2', 'hit-1', 'hit-2', 'hit-3', 'hit-4', 'crit-1', 'crit-2', 'hurt-1', 'hurt-2',
  'shot-hit-1', 'shot-hit-2', 'burst', 'burst-2', 'slam', 'slam-2', 'volley', 'bolt', 'nova', 'mend', 'dash', 'die-1', 'die-2', 'die-3',
  'claw-1', 'claw-2', 'zap', 'spores', 'guard', 'elder-step-1', 'elder-step-2', 'elder-roar', 'elder-fall', 'rumble', 'shuttle-pass', 'shuttle-land',
  'teleport', 'gate', 'lumen-zap', 'lumen-burst', 'drink', 'coins-1', 'coins-2', 'pickup', 'equip', 'hone', 'salvage', 'click', 'deny'];
const SAMPLE_DIR = './static/sfx/';

/** Fetches and decodes every recording into the kit (kit.samples). Resolves when all are in, or have failed. */
function loadSamples(kit) {
  return Promise.all(SAMPLE_NAMES.map((name) => fetch(SAMPLE_DIR + name + '.wav')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
    .then((data) => kit.ctx.decodeAudioData(data))
    .then((buffer) => { kit.samples.set(name, buffer); })
    .catch(() => {})));        // a recording that cannot be had leaves its event to the synthesized sound
}

// ---------------------------------------------------------- music tables

const MAJOR = [0, 2, 4, 7, 9], MINOR = [0, 3, 5, 7, 10]; // five-note scales, no two notes a semitone apart: what chimes, effects and answers are tuned to (kit.key)
const STRING_FLOOR = 36;   // lowest note (MIDI) of the low strings a fight brings in
const HEAT_RISE = 1, HEAT_FALL = 2.5; // seconds for danger to be felt in the music, and to leave it
const DECK_FADE = 0.12;    // time constant, in seconds, of the fade when the key changes at once
const FELL_HUSH = 4.5;     // seconds of no music at all after an elder falls, before the area's piece comes back
const HELD_PAD = 0.8;      // level of the bed under a cinematic
const PAD_CUT = 0.7;       // time constant of a bed cut short: the same fall as the tail it would have had
const MIX_TIME = { all: 0.7, lead: 0.3, comp: 0.3, fight: 0.3, pad: 0.5 }; // time constants of the layer levels

// Chords as semitones above the piece's root: a bass note and an open pad
// voicing. Capitals are major and small letters minor; a flat is spelled b.
// A chord may hold notes the piece's mode does not: a tune is written to sit
// over its chords, and in a fight any note that would rub against the chord
// sounding is moved off it (see `over` in createMusic).
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
  V: { bass: 7, pad: [-5, 2, 11] },       // the major fifth chord a minor key borrows: it wants to go home
  bII: { bass: 1, pad: [1, 8, 17] },      // the major chord a semitone above home: the weight of the Phrygian mode
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

// ----------------------------------------------------- the pieces' words
//
// Every area has a piece of its own and every elder a theme of its own: one row
// each, in AREAS and BOSSES below. A row is written as a musician would say it:
// the key and mode, the meter and tempo, who has the tune, what holds the chords
// and what moves under it, and the tune itself. These tables are the words the
// rows use: MODES, CHORDS (above), VOICES, BEDS and FIGURES.

// Seven-note modes, in semitones above the tonic. A tune's degrees count in its
// row's mode: 1 is the tonic, 8 the octave above it.
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],      // major with a raised fourth: bright, afloat
  dorian: [0, 2, 3, 5, 7, 9, 10],      // minor with a raised sixth: old and open
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],    // minor with a raised seventh: uneasy
  phrygian: [0, 1, 3, 5, 7, 8, 10],    // minor with a lowered second: heavy
};
const STRONG = { 3: [0], 4: [0, 2], 5: [0, 3], 6: [0, 3], 7: [0, 4], 9: [0, 3, 6] }; // the beats a bar of each meter leans on

// A bowed string: two a few cents apart (one, if `one`), kept dark by a low-pass;
// a singing line (`vibrato`: [rate, depth in cents]) rocks a little once it speaks.
function bowed(k, n, o) {
  const freq = mtof(n.midi), loud = o.vibrato ? clamp((400 / freq) ** 0.25, 0.8, 1.3) : 1;   // a low string needs more bow
  for (const [detune, share] of o.one ? [[0, 0.8]] : [[0, 0.67], [o.spread ?? 6, 0.33]]) {
    k.tone({
      bus: n.bus, type: 'sawtooth', freq, detune, when: n.when, gain: o.gain * share * loud * n.gain,
      attack: o.attack, hold: Math.max(0.1, n.len - (o.vibrato ? 0.4 : 0.3)), decay: o.decay ?? 1.5, cutoff: Math.min(o.top, freq * o.bright),
      vibrato: o.vibrato && { rate: o.vibrato[0], depth: o.vibrato[1], delay: 0.45 },
    });
  }
}

// The instruments a row can name. Each sounds one note: k is the kit, and n says
// which (midi), when, how long it is held (len, in seconds: a struck voice rings
// on by itself), how strongly (gain: 1 is its usual level) and on which bus.
// `low` is the lowest note (MIDI) it sounds well on. None of them is plucked hard,
// and the high ones are held back so that nothing pierces.
const VOICES = {
  // felt piano: struck, two strings to a note (one, damped sooner, when `light`: in a fight)
  piano: { low: 40, play(k, n) { k.piano(mtof(n.midi), { bus: n.bus, when: n.when + rand(0, 0.02), gain: 0.14 * n.gain, strings: n.light ? 1 : 2, ring: n.light ? 0.7 : 1 }); } },
  // a violin: the bow takes half a second to speak
  violin: { low: 55, play(k, n) { bowed(k, n, { gain: 0.08, attack: 0.5, bright: 3, top: 2200, vibrato: [5.2, 12] }); } },
  // a cello: the same bow, slower and darker
  cello: { low: 36, play(k, n) { bowed(k, n, { gain: 0.085, attack: 0.55, bright: 2.6, top: 1400, vibrato: [4.7, 10] }); } },
  // strings in octaves: a violin and a cello under it, one string each (`also`: the other note it sounds)
  strings: { low: 48, also: -12, play(k, n) {
    bowed(k, n, { gain: 0.05, attack: 0.45, bright: 2.2, top: 1400, vibrato: [5.2, 10], one: true });
    bowed(k, { ...n, midi: n.midi - 12 }, { gain: 0.055, attack: 0.5, bright: 2.4, top: 1000, vibrato: [4.7, 8], one: true });
  } },
  // cellos and basses under a fight: bowed, never plucked, and kept dark
  lowstring: { low: 28, play(k, n) { bowed(k, n, { gain: 0.04, attack: 0.14, decay: 0.7, bright: 4, top: 700, spread: 8, one: n.light }); } },
  // a glass tone: a soft sine that swells in rather than being struck, with a fainter one a twelfth above
  glass: { low: 55, play(k, n) {
    const freq = mtof(n.midi), gain = 0.06 * n.gain * Math.min(1, Math.sqrt(660 / freq)), pan = rand(-0.3, 0.3), ring = clamp(n.len * 1.7, 1.8, 3.6);
    k.tone({ bus: n.bus, freq, when: n.when, pan, attack: 0.05, decay: ring, gain });
    if (freq * 3 < 4200) k.tone({ bus: n.bus, freq: freq * 3.01, when: n.when, pan, attack: 0.08, decay: ring * 0.4, gain: gain * 0.12 });
  } },
  // a celesta: a soft mallet on a metal bar. Struck, round, and gone in a second or two
  celesta: { low: 60, play(k, n) {
    const freq = mtof(n.midi), gain = 0.065 * n.gain * Math.min(1, Math.sqrt(784 / freq));
    const base = { bus: n.bus, when: n.when + rand(0, 0.015), attack: 0.007, pan: rand(-0.25, 0.25) };
    k.tone({ ...base, freq, decay: 1.8, gain });
    k.tone({ ...base, freq: freq * 2, decay: 0.7, gain: gain * 0.25 });
    if (freq * 4.2 < 4200) k.tone({ ...base, freq: freq * 4.2, decay: 0.22, gain: gain * 0.06 });
  } },
  // a music box: a thin tine, a hair out of tune
  musicbox: { low: 67, play(k, n) {
    const freq = mtof(n.midi), gain = 0.06 * n.gain * Math.min(1, Math.sqrt(1000 / freq)), base = { bus: n.bus, when: n.when + rand(0, 0.02), attack: 0.003 };
    k.tone({ ...base, type: 'triangle', freq, detune: rand(-8, 8), decay: 1.3, gain });
    if (freq * 4 < 4200) k.tone({ ...base, freq: freq * 4, decay: 0.3, gain: gain * 0.12 });
  } },
  // a flute: nearly a pure tone, with breath in it and a slow vibrato
  flute: { low: 60, play(k, n) {
    const freq = mtof(n.midi), gain = 0.07 * n.gain * Math.min(1, Math.sqrt(700 / freq)), hold = Math.max(0.1, n.len - 0.25);
    k.tone({ bus: n.bus, wave: k.waves.flute, freq, when: n.when, gain, attack: 0.09, hold, decay: 0.5, vibrato: { rate: 4.6, depth: 8, delay: 0.35 } });
    k.noise({ bus: n.bus, freq: freq * 1.5, q: 3, when: n.when, attack: 0.07, hold: hold * 0.5, decay: 0.5, gain: gain * 0.04 });
  } },
  // a quiet pipe organ: a few soft stops, steady, no vibrato
  organ: { low: 43, play(k, n) {
    const freq = mtof(n.midi), gain = 0.05 * n.gain * Math.min(1, Math.sqrt(520 / freq));
    k.tone({ bus: n.bus, wave: k.waves.organ, freq, when: n.when, gain, attack: 0.08, hold: Math.max(0.1, n.len - 0.1), decay: 0.6, cutoff: Math.min(2400, freq * 4) });
  } },
  // a soft low horn: the tone opens as the note swells
  horn: { low: 36, play(k, n) {
    const freq = mtof(n.midi), gain = 0.07 * n.gain * clamp((200 / freq) ** 0.25, 0.8, 1.25);
    const env = { bus: n.bus, freq, when: n.when, attack: 0.14, hold: Math.max(0.1, n.len - 0.3), decay: 0.6 };
    k.tone({ ...env, type: 'sawtooth', gain: gain * 0.55, cutoff: freq * 1.5, cutoffTo: Math.min(1100, freq * 3.2), glide: 0.35 });
    k.tone({ ...env, type: 'triangle', gain: gain * 0.6 });
  } },
  // someone humming, mouth closed: one low voice
  hum: { low: 48, play(k, n) {
    const freq = mtof(n.midi), gain = 0.07 * n.gain;
    const env = { bus: n.bus, freq, when: n.when, attack: 0.3, hold: Math.max(0.1, n.len - 0.35), decay: 0.7, vibrato: { rate: 5, depth: 16, delay: 0.3 } };
    k.tone({ ...env, type: 'sawtooth', gain: gain * 0.45, cutoff: Math.min(1000, freq * 3), formant: [480, 8, 2] });
    k.tone({ ...env, gain: gain * 0.7 });
  } },
  // a wordless choir, open ("ah"): several voices, slow to arrive
  choir: { low: 55, play(k, n) {
    const freq = mtof(n.midi), gain = 0.05 * n.gain * Math.min(1, Math.sqrt(520 / freq));
    for (const detune of [-9, 0, 8]) {
      k.tone({ bus: n.bus, type: 'sawtooth', freq, detune, pan: detune / 20, when: n.when, gain: gain * 0.4, attack: 0.8, hold: Math.max(0.2, n.len - 0.6), decay: 1.8, cutoff: Math.min(2600, freq * 4), formant: [950, 7, 1.4] });
    }
  } },
  // a big soft bell, with the hum an octave under it
  bell: { low: 45, play(k, n) {
    const freq = mtof(n.midi), gain = 0.1 * n.gain, base = { bus: n.bus, when: n.when, attack: 0.012 };
    k.tone({ ...base, freq, decay: 4.2, gain });
    k.tone({ ...base, freq: freq * 2.76, decay: 1.6, gain: gain * 0.18 });
    k.tone({ ...base, freq: freq / 2, decay: 5, gain: gain * 0.3 });
  } },
  // bowed metal: pure tones that are not quite in tune with each other, so the note slowly beats; very slow to arrive
  metal: { low: 47, play(k, n) {
    const freq = mtof(n.midi), gain = 0.05 * n.gain * Math.min(1, Math.sqrt(440 / freq)), pan = rand(-0.4, 0.4);
    const part = (ratio, share, detune = 0) => {
      if (freq * ratio < 4200) k.tone({ bus: n.bus, freq: freq * ratio, detune, when: n.when, pan, gain: gain * share, attack: 1.2, hold: Math.max(0.2, n.len - 1), decay: 3.2 });
    };
    part(1, 1); part(1, 0.6, 7); part(2.76, 0.16); part(5.4, 0.04);
  } },
};

// What holds the chords. Each sounds one chord from t0 for `span` seconds,
// swelling in and falling away, on the pad's bus (the one thing a cinematic
// leaves sounding). b: root (MIDI of the key), chord (a row of CHORDS), bass (its
// bass note, down where the row's bassFloor puts it), t0, span, swell, tail, and
// thin (the hero is hurt: half the players).
function sustain(k, b, midi, o) {
  b.sounding.push(midi);       // (the tune is kept clear of the notes a bed sounds)
  k.tone({ bus: 'pad', freq: mtof(midi), when: b.t0, attack: b.swell, hold: b.span - b.swell + 0.5, decay: b.tail, ...o });
}
const BEDS = {
  // a string pad: the chord's three notes, two bowed strings to each
  strings(k, b) {
    for (const offset of b.chord.pad) for (const detune of b.thin ? [0] : [-7, 7]) sustain(k, b, b.root + offset, { type: 'sawtooth', detune, gain: 0.028 });
  },
  // violins alone, an octave up, one to a note: thin, cold air
  high(k, b) {
    b.chord.pad.forEach((offset, i) => { if (!(b.thin && i === 0)) sustain(k, b, b.root + offset + 12, { type: 'sawtooth', detune: 4 * i - 4, gain: 0.032 }); });
  },
  // cellos and basses on the chord's bass, its fifth and its octave: no third, so neither major nor minor
  drone(k, b) {
    for (const up of b.thin ? [0, 7] : [0, 7, 12]) for (const detune of b.thin ? [0] : [-5, 5]) sustain(k, b, b.bass + up, { type: 'sawtooth', detune, gain: 0.026 });
  },
  // a wordless choir, low and closed ("oo")
  choir(k, b) {
    for (const offset of b.chord.pad) for (const detune of b.thin ? [0] : [-6, 6]) sustain(k, b, b.root + offset, { type: 'sawtooth', detune, gain: 0.023, formant: [560, 7, 1.4] });
  },
  // a quiet organ: the chord on a soft stop over a pedal note. It speaks at once and lets go at once, as pipes do
  organ(k, b) {
    const pipes = { ...b, swell: Math.min(b.swell, 0.4), tail: Math.min(b.tail, 1.6) };
    sustain(k, pipes, b.bass, { wave: k.waves.organ, gain: 0.025 });
    b.chord.pad.forEach((offset, i) => { if (!(b.thin && i === 0)) sustain(k, pipes, b.root + offset, { wave: k.waves.organ, gain: 0.017 }); });
  },
  // glass: pure tones an octave up, each a pair a hair apart, so the chord slowly beats
  glass(k, b) {
    for (const offset of b.chord.pad) for (const detune of b.thin ? [0] : [-4, 4]) sustain(k, b, b.root + offset + 12, { detune, gain: 0.021 });
  },
  // the void: a deep fifth far below and a few thin tones far above, with nothing between
  void(k, b) {
    for (const up of [0, 7]) for (const detune of b.thin ? [0] : [-4, 4]) sustain(k, b, b.bass + up, { type: 'triangle', detune, gain: 0.027 });
    for (const offset of b.chord.pad.slice(b.thin ? 2 : 1)) sustain(k, b, fold(b.root + offset, 79), { detune: 5, gain: 0.008 });   // (wherever the key lies, between G5 and F#6)
  },
};

// What moves under the tune. `on` says when it is played: as each new 'chord'
// arrives, as each 'phrase' of the tune begins, or in every 'bar' (two bars, if
// it has two, take turns). A note is [beat, which note of the chord, beats it is
// held, level]: 'bass' is the chord's bass, 'low' 'mid' 'top' the three notes of
// its voicing, and +7 or +12 lifts one by that many semitones. `light`: one
// player to a note, where there are many notes.
const FIGURES = {
  still: null,                                                                                  // nothing: the bed alone
  bass: { voice: 'piano', on: 'chord', bars: [[[0, 'bass', 4, 0.85]]] },                        // the piano's left hand, softly: the bass of each new chord
  root: { voice: 'piano', on: 'phrase', bars: [[[0, 'bass', 4, 0.85]]] },                       // ...or only as a phrase begins
  star: { voice: 'celesta', on: 'phrase', bars: [[[5, 'top+24', 2, 0.7]]] },                    // one high note, late in the bar: a far light
  tread: { voice: 'lowstring', on: 'bar', bars: [[[0, 'bass', 3], [3, 'bass', 2, 0.8]]] },      // two heavy steps to a bar of five
  cradle: { voice: 'lowstring', on: 'bar', light: true, bars: [[[0, 'bass', 3], [3, 'bass+7', 3, 0.85]]] },   // rocking: the bass, then its fifth
  pedal: { voice: 'lowstring', on: 'bar', bars: [[[0, 'bass', 4]]] },                           // the bass, bowed again each bar
  surge: { voice: 'lowstring', on: 'bar', light: true, bars: [                                  // a wave: up through the chord, and back down
    [[0, 'low', 3, 0.8], [3, 'mid', 3, 0.9], [6, 'top', 3, 1]],
    [[0, 'top', 3, 1], [3, 'mid', 3, 0.9], [6, 'low', 3, 0.8]],
  ] },
  orbit: { voice: 'glass', on: 'bar', bars: [                                                   // glass going round, quietly: up the chord and over the top
    [[0, 'low+12', 1, 0.6], [1, 'mid+12', 1, 0.6], [2, 'top+12', 1, 0.6]],
    [[0, 'mid+24', 1, 0.6], [1, 'top+12', 1, 0.6], [2, 'mid+12', 1, 0.6]],
  ] },
};

// ------------------------------------------------------------ the pieces
//
// One row per area (game.biome.id). Adding a place to visit is adding a row; an
// id without one plays the town's.
//
//   root        the tonic, as a MIDI note (D3 is 50);  mode: a name from MODES
//   meter       beats to the bar;  beat: seconds per beat when calm (in a meter of 6 or 9 the beat is the quick one, felt in threes)
//   lead        who has the tune: [a name from VOICES, the MIDI note its degree 1 is]
//   second      who takes the phrases marked 2 (optional)
//   bed         what holds the chords: a name from BEDS;  pad: how bright it is, in Hz
//   figure      what moves under the tune: a name from FIGURES;  bassFloor: the lowest note (MIDI) its bass may be
//   theme       the tune, a phrase to a line: [chords, notes, who]
//                 chords  one name from CHORDS for each bar of the phrase; a dot holds the chord before
//                 notes   bars split by |. A note is a degree of the mode (1 the tonic, 8 the octave above; a comma
//                         after it drops it an octave; b or # before it bends it a semitone), then a colon and its
//                         length in beats (one beat if left out). A dash is a rest; a bar left short is rest too
//                 who     2 if the second voice has this phrase
//               The piece plays its phrases in order, round and round. Now and then one is left out (SPARE).
//   tense       the chords while creatures are after the hero: the darker ones of the same mode
//   elder       { mode, chords } for a fight with an elder that has no theme of its own (see BOSSES): a darker mode on the same root
//   wind, birds, crickets   how much of each the ambience has (0 is none)
const AREAS = {
  // Meridian Landing. Home: D major in an easy four. A felt piano has the tune and a violin answers it, over warm
  // strings, with the piano's left hand under each new chord. The warmest, and the one with the most tune.
  town: {
    root: 50, mode: 'major', meter: 4, beat: 1.08,
    lead: ['piano', 62], second: ['violin', 62], bed: 'strings', pad: 800, figure: 'bass', bassFloor: 40,
    theme: [
      ['I . IV .', '5 10 9:2 | 8:2 5:2 | 6:4'],          // up a sixth, down by step, and at rest on the fourth chord
      ['I . Vsus .', '5 10 9:2 | 8:2 10:2 | 9:4'],       // the same, turned upward: a question
      ['vi . IV .', '10:3 9 | 8:2 6:2 | 8:4', 2],        // the violin answers it
      ['I Vsus I .', '5 10 9:2 | 8:2 9:2 | 8:4'],        // and the piano comes home
    ],
    tense: ['vi', 'ii', 'Vsus'],
    wind: 0.5, birds: 1.1, crickets: 0,
  },
  // Glasswood Terraces. F Lydian in a lilting six, quick and high: a celesta over a bed of glass, and no bass at
  // all, so it floats. Every phrase has the same long-short-long skip and turns on the raised fourth.
  glasswood: {
    root: 53, mode: 'lydian', meter: 6, beat: 0.32,
    lead: ['celesta', 77], bed: 'glass', pad: 1400, figure: 'still', bassFloor: 41,
    theme: [
      ['I . . . II/I . . .', '1:2 2 3:3 | 5:6 | 4:2 3 2:3'],
      ['I . . . vi . . .', '1:2 2 3:3 | 6:6 | 5:2 4 3:3'],
      ['II/I . . . I . . .', '2:2 3 4:3 | 6:6 | 4:2 3 2:3'],
      ['vi . . . I . . .', '6,:2 1 3:3 | 5:6 | 3:2 2 1:3'],
    ],
    tense: ['vi', 'iii', 'II'],
    elder: { mode: 'minor', chords: ['i', 'VI', 'iv', 'VII'] },
    wind: 0.6, birds: 1.5, crickets: 0,
  },
  // Ember Shelf. B flat Dorian in a slow three, the second beat leaned on like a sarabande: a cello alone over a
  // drone of open fifths, and a low piano note as each chord arrives.
  ember: {
    root: 46, mode: 'dorian', meter: 3, beat: 1.3,
    lead: ['cello', 58], bed: 'drone', pad: 620, figure: 'bass', bassFloor: 36,
    theme: [
      ['i . IV . . .', '1 5:2 | 4 3:2 | 2:3'],           // up a fifth and down by step
      ['i . VII . . .', '1 5:2 | 6 5:2 | 4:3'],          // ...over the top, by the raised sixth
      ['IV . i . . .', '6, 4:2 | 2 1:2 | 5,:3'],         // from below, falling to the low fifth
      ['v . i . . .', '5, 2:2 | 7, 5,:2 | 1:3'],         // and home
    ],
    tense: ['i', 'v', 'VII'],
    elder: { mode: 'minor', chords: ['i', 'vii', 'iv', 'VI'] },
    wind: 1, birds: 0.2, crickets: 0.6,
  },
  // The Hush. E flat minor in a slow five (three and two), the slowest of the walking pieces: glass tones falling
  // in pairs, like sighs, over a low closed choir.
  hush: {
    root: 51, mode: 'minor', meter: 5, beat: 1.42,
    lead: ['glass', 75], bed: 'choir', pad: 680, figure: 'root', bassFloor: 39,
    theme: [
      ['i . VI .', '5:3 3:2 | 4:3 2:2 | 1:5'],
      ['iv . i .', '6:3 4:2 | 5:3 3:2 | 2:5'],
      ['VI . VII .', '3:3 1:2 | 2:3 7,:2 | 2:5'],
      ['Isus . i .', '5,:3 2:2 | 1:3 7,:2 | 1:5'],
    ],
    tense: ['i', 'iv', 'VI'],
    elder: { mode: 'minor', chords: ['i', 'iv', 'vii', 'VI'] },
    wind: 0.35, birds: 0, crickets: 1.2,
  },
  // Rime Steps. E major in a light three, high and thin and mostly silence: a flute, over violins alone. Its
  // tune keeps touching the seventh.
  rime: {
    root: 52, mode: 'major', meter: 3, beat: 1.05,
    lead: ['flute', 76], bed: 'high', pad: 980, figure: 'still', bassFloor: 40,
    theme: [
      ['I . . . vi . . .', '5,:2 1 | 3:3 | 2:2 7, | 5,:3'],
      ['IV . . . I . . .', '6,:2 1 | 4:3 | 3:2 1 | 2:3'],
      ['vi . . . Vsus . . .', '8:2 7 | 5:3 | 6:2 5 | 3:3'],
      ['Isus . . . I . . .', '5,:2 1 | 2:3 | 5:2 3 | 1:3'],
    ],
    tense: ['vi', 'iii', 'ii'],
    elder: { mode: 'minor', chords: ['i', 'III', 'VI', 'v'] },
    wind: 1.15, birds: 0.2, crickets: 0,
  },
  // The Underhalls. C minor in the slowest four there is: a quiet organ, like a hymn heard through stone. The
  // chord changes in every bar, and a high stop sings a plain chant over it in even notes, two to the bar, with
  // a two-note amen at the end of each line.
  vault: {
    root: 48, mode: 'minor', meter: 4, beat: 1.5,
    lead: ['organ', 72], bed: 'organ', pad: 700, figure: 'still', bassFloor: 36,
    theme: [
      ['i iv VII III VI iv v i', '1:2 3:2 | 4:2 3:2 | 2:2 4:2 | 3:4 | - | - | 2:4 | 1:4'],
      ['i VI III VII iv i v i', '5:2 3:2 | 6:2 5:2 | 5:2 3:2 | 4:4 | - | - | 2:4 | 1:4'],
    ],
    tense: ['i', 'iv', 'vii'],
    elder: { mode: 'phrygian', chords: ['i', 'vii', 'iv', 'VI'] },
    wind: 0.25, birds: 0, crickets: 0,
  },
  // The Shatter. B Lydian in a very slow seven, so slow that it has no step to it: bowed metal, in fifths and
  // sixths a long way apart, over the void (a deep fifth and a few thin tones, nothing between), and one far
  // high note in each phrase. The chords are major ones a third apart, which is how awe is spelled.
  shatter: {
    root: 47, mode: 'lydian', meter: 7, beat: 1.5,
    lead: ['metal', 59], bed: 'void', pad: 1500, figure: 'star', bassFloor: 35,
    theme: [
      ['Isus .', '1:4 5:3 | 9:7'],                        // a fifth, and a fifth on top of it
      ['II/I .', '11:4 9:3 | 6:7'],                       // down from the raised fourth
      ['VI .', '8:4 5:3 | 2:7'],                          // the same fifths, falling, over a far chord
      ['I .', '5,:4 3:3 | 8:7'],                          // and up to the tonic
    ],
    tense: ['Isus', 'VI', 'III'],
    elder: { mode: 'minor', chords: ['i', 'VI', 'iv', 'VII'] },
    wind: 0.12, birds: 0, crickets: 0,
  },
};

// One row per elder (the creature's id: content/creatures.js). While it lives its
// theme is the piece, in its own key; an elder without a row gets the area's
// piece darkened (the area's `elder` mode, and the `elder` stance). A row is an
// area's row without the ambience, and with what makes it a fight:
//
//   drum      level of the soft low drum on each beat of the bar;  deep: a bigger, slower drum
//   wash      level of a wave of low noise that comes in and draws back over two bars
//   echo      [seconds, share]: every note of the tune comes back once, that much later and that much quieter
//   double    [voice, the MIDI note its degree 1 is]: a second instrument plays the tune along with the lead
//   rage      what changes when it is wounded (below half health): the same row with these fields put over it.
//             The key stays; the tune starts again from the top
const BOSSES = {
  // The Stone Warden. C sharp Phrygian in a slow five: two heavy steps to the bar (low strings and a deep
  // drum), a soft low horn in long notes that keeps coming back to the same one, and a drone under all.
  warden: {
    root: 37, mode: 'phrygian', meter: 5, beat: 1.1,
    lead: ['horn', 49], bed: 'drone', pad: 520, figure: 'tread', bassFloor: 30,
    drum: [0.06, 0, 0, 0.035, 0], deep: true,
    theme: [
      ['i . bII i . .', '1:3 5,:2 | 1:3 3:2 | 4:3 2:2 | 1:5'],
      ['i . vii i . .', '5:3 3:2 | 4:3 1:2 | 7,:3 2:2 | 1:5'],
    ],
    rage: { beat: 0.95, drum: [0.065, 0, 0, 0.04, 0.03], double: ['cello', 61] },
  },
  // The Spore Matron. A harmonic minor in a slow six: a lullaby, hummed low, that keeps landing on the
  // raised seventh; a music box gives it back two octaves up. Low strings rock under it, bass and fifth.
  matron: {
    root: 45, mode: 'harmonic', meter: 6, beat: 0.48,
    lead: ['hum', 57], second: ['musicbox', 69], bed: 'strings', pad: 560, figure: 'cradle', bassFloor: 40,
    theme: [
      ['i . iv i . .', '5:2 3 5:3 | 8:4 7:2 | 6:2 4 6:3 | 5:6'],
      ['i . V i . .', '5:2 3 5:3 | 8:4 9:2 | 9:2 7 9:3 | 8:6', 2],
    ],
    rage: { beat: 0.41, drum: [0.045, 0, 0, 0, 0, 0], double: ['musicbox', 69] },
  },
  // The Tide Sentinel. C Dorian in a rolling nine (three threes): low strings climb the chord and fall back,
  // bar after bar, with a wash of noise like a wave under them; strings in octaves surge up and ebb.
  sentinel: {
    root: 48, mode: 'dorian', meter: 9, beat: 0.4,
    lead: ['strings', 60], bed: 'strings', pad: 700, figure: 'surge', bassFloor: 36,
    drum: [0.05, 0, 0, 0, 0, 0, 0, 0, 0], deep: true, wash: 0.035,
    theme: [
      ['i . VII . . .', '1:3 3:3 5:3 | 8:9 | 7:6 6:3 | 4:9'],
      ['i . IV i . .', '1:3 3:3 5:3 | 8:6 10:3 | 8:6 6:3 | 5:9'],
    ],
    rage: { beat: 0.34, drum: [0.06, 0, 0, 0, 0, 0, 0.035, 0, 0], double: ['horn', 48] },
  },
  // The Lantern Keeper. D minor in a slow four, a procession: a big soft bell has the chant, and every note
  // of it comes back off the stone; a low choir holds the chords, the basses bow each bar, the drum walks.
  keeper: {
    root: 38, mode: 'minor', meter: 4, beat: 1.4,
    lead: ['bell', 62], echo: [0.45, 0.3], bed: 'choir', pad: 620, figure: 'pedal', bassFloor: 31,
    drum: [0.06, 0, 0.035, 0], deep: true,
    theme: [
      ['i . VI VII', '1:4 | 3:2 2:2 | 3:4 | 5:4'],
      ['iv . i .', '5:2 4:2 | 3:4 | 2:2 1:2'],
    ],
    rage: { beat: 1.15, drum: [0.065, 0, 0.035, 0.03], double: ['organ', 62] },
  },
  // The Star Drifter. F sharp Lydian in a slow three, a waltz with nothing under its feet: glass goes round
  // and round the chord, a wordless choir sings one long note to a bar, an octave leap and a slow way down,
  // and the chords are the far-apart major ones of the Shatter. No drum until it is wounded.
  drifter: {
    root: 54, mode: 'lydian', meter: 3, beat: 1.35,
    lead: ['choir', 66], bed: 'void', pad: 1500, figure: 'orbit', bassFloor: 35,
    theme: [
      ['I . II/I .', '5,:3 | 5:3 | 4:3 | 3:3'],
      ['vi . VI I', '3:3 | 6:3 | 5:6'],
      ['I . II/I .', '8:3 | 5:3 | 6:3 | 9:3'],
      ['vi . VI I', '8:3 | 10:3 | 8:6'],
    ],
    rage: { beat: 1.12, drum: [0.05, 0, 0.025], deep: true, double: ['horn', 54] },
  },
};

/** Reads a tune as a row writes it (see AREAS): for each bar, its notes as { at, len (beats), degree (0 is the tonic), sharp }. */
function readTune(text, meter) {
  return String(text ?? '').split('|').map((bar) => {
    const notes = [];
    let at = 0;
    for (const word of bar.trim().split(/\s+/)) {
      const m = /^([b#]?)(\d+|-)(,*)(?::(\d*\.?\d+))?$/.exec(word);
      if (!m) continue;
      const len = m[4] ? Number(m[4]) : 1;
      if (m[2] !== '-' && at < meter) notes.push({ at, len, degree: Number(m[2]) - 1 - 7 * m[3].length, sharp: m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0 });
      at += len;
    }
    return notes;
  });
}

/** Makes a row ready to play: its mode's notes, its phrases bar by bar, and its enraged self. A row with something missing still plays. */
function prepare(row) {
  const part = (p) => (Array.isArray(p) ? { voice: p[0], at: p[1] } : p || null);
  row.notes = lookup(MODES, row.mode, MODES.major);
  row.five = row.notes.includes(4) ? MAJOR : MINOR;       // what chimes, effects and answers are tuned to
  row.meter = row.meter > 0 ? Math.round(row.meter) : 4;
  row.strong = lookup(STRONG, row.meter, [0]);
  row.lead = part(row.lead) || { voice: 'piano', at: 60 };
  row.second = part(row.second);
  row.double = part(row.double);
  row.phrases = (row.theme || []).map(([chords, tune, who]) => {
    const phrase = { chords: [], spans: [], bars: readTune(tune, row.meter), who };
    String(chords).trim().split(/\s+/).forEach((name, i) => {
      const held = name === '.' && i > 0;
      phrase.chords.push(held ? phrase.chords[i - 1] : Object.hasOwn(CHORDS, name) ? name : 'Isus');
      phrase.spans.push(held ? 0 : 1);        // how many bars the chord that starts here lasts
      if (held) phrase.spans[phrase.spans.findLastIndex((bars) => bars > 0)]++;
    });
    return phrase;
  });
  row.home = row.phrases.length ? row.phrases[0].chords[0] : 'Isus';
  if (!row.tense || !row.tense.length) row.tense = [row.home];
  if (row.elder) {
    row.elder.notes = lookup(MODES, row.elder.mode, MODES.minor);
    row.elder.five = row.elder.notes.includes(4) ? MAJOR : MINOR;
  }
  // the gap between the notes of an answer: half a beat as the piece is felt
  row.step = Math.min(((row.meter % 3 === 0 && row.meter > 3 ? 3 : 1) * row.beat) / 2, ANSWER_STEP);
  // how long a phrase and the silence after it take, in seconds, on average
  row.breath = (row.phrases.reduce((bars, phrase) => bars + phrase.chords.length, 0) / Math.max(1, row.phrases.length)) * row.meter * row.beat;
  if (row.rage) row.fury = prepare({ ...row, ...row.rage, rage: null });
  return row;
}
for (const row of [...Object.values(AREAS), ...Object.values(BOSSES)]) prepare(row);
const areaOf = (game) => lookup(AREAS, game.biome && game.biome.id, AREAS.town);

// How the piece stands toward what is happening.
//
//   calm    the piece as its row writes it: an area at peace, or an elder's own theme
//   tense   creatures are after the hero
//   elder   an elder with no theme of its own is up;  rage: and it is wounded
//
// In the last three the tune is not played through. Its phrases' opening notes
// are, one phrase at a time, lower, with silence between; the chords are the
// row's `tense` (or `elder`) ones, wandering; and a fight's layers come in.
// They count in measures: a bar, or two bars of a quick meter (about four seconds).
//
//   pace    multiplies the beat (under 1 is faster);   bars: how many measures a chord lasts
//   drop    how many degrees of the scale the tune comes down (7 is an octave)
//   space   how far apart its fragments are, in phrases of the piece as written (one phrase is taken as 10 to 24 seconds)
//   left    level of the piano's bass note on every measure;  octave: it tolls with the octave above
//   drum    level of the low drum on the downbeat and in the middle of the measure;  deep: a bigger, slower drum
//   drone   the low strings hold one note a measure instead of marking its beats
//   toll    level of a low bell on every other measure
//
// Everything a fight adds is lower, slower and quieter than the tune.
const STANCES = {
  calm: { pace: 1, written: true },
  tense: { pace: 0.92, bars: 1, drop: 4, space: 1.15, left: 0.15, drum: [0.05, 0] },
  elder: { pace: 1.06, bars: 2, drop: 7, space: 1.3, left: 0.16, octave: true, drum: [0.055, 0.03], deep: true, drone: true, toll: 0.05 },
  rage: { pace: 0.86, bars: 1, drop: 7, space: 1.3, left: 0.16, octave: true, drum: [0.055, 0.03], deep: true, drone: true, toll: 0.05 },
};

// ------------------------------------------------------------------ entry

export function createAudio(game) {
  let kit = null, music = null, ambience = null;
  let soundOn = true, volume = 1, lastTick = 0, warned = false;
  let ready = Promise.resolve();        // the recordings loading (boot)
  // The player's own levels (the Sound settings: ui/settings.js), each 0..1, on top of the mix in LEVELS.
  const own = { master: 1, music: 1, sfx: 1, ambience: 1 };
  const unit = (v, was) => (Number.isFinite(+v) ? clamp(+v, 0, 1) : was);
  function hearSettings(v) {
    if (!v || typeof v !== 'object') return;
    for (const name in own) own[name] = unit(v[name], own[name]);
    volume = own.master;
    if ('mute' in v) soundOn = !v.mute;
  }
  hearSettings(game.settings);       // (what was chosen on an earlier visit)
  /** Moves the mixer to the player's levels, smoothly. The music reads LEVELS.music itself each time it mixes. */
  function setLevels(seconds = 0.12) {
    LEVELS.music = BASE_LEVELS.music * own.music;
    if (!kit) return;
    const now = kit.ctx.currentTime, to = (bus, level) => bus.node.gain.setTargetAtTime(level, now, seconds / 3);
    to(kit.buses.sfx, BASE_LEVELS.sfx * own.sfx); to(kit.buses.chime, BASE_LEVELS.sfx * own.sfx);
    to(kit.buses.amb, BASE_LEVELS.ambience * own.ambience); to(kit.buses.air, BASE_LEVELS.ambience * own.ambience);
    setMaster(seconds);
  }
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
      ready = loadSamples(fresh);
      // what the music listens for itself: where the hero is, and the moments it answers
      for (const [type, hear] of Object.entries(music.hears)) bus.on(type, (payload) => safely(() => hear(payload ?? {})));
      setLevels(0.4);
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
    safely(() => {
      // a recording, if one answers this event and is loaded; else (or as well, `keep`) the synthesized sound
      const pick = SAMPLED[type] && kit.samples.size ? SAMPLED[type](payload ?? {}, game) : null;
      let played = false, keep = !pick;
      for (const o of pick ? [].concat(pick) : []) {
        const level = o.where ? kit.nearness(o.where) : 1;
        if (level <= 0.02) { played = true; continue; }
        kit.level = level;
        played = kit.sample({ ...o, at: o.at || 0 }) || played;
        if (o.keep) keep = true;
      }
      kit.level = 1;
      if (pick && !played && [].concat(pick).length) keep = true;          // (not loaded: the synthesized sound stands in)
      if (keep && SOUNDS[type]) SOUNDS[type](kit, payload ?? {});
    });
    kit.delay = 0;
    kit.level = 1;
  }

  // A blade of light hums while it is drawn on a contract (in town it is not lit for anyone to hear): quietly at rest,
  // louder and a little higher as the hero moves, and swelling with each swing. One looped recording, never counted
  // against the effects' voices.
  let hum = null;
  function humTick(now) {
    const p = game.player, buffer = kit.samples.get('saber-hum');
    const want = !!(buffer && p && !p.dead && p.family === 'blade' && game.missions && game.missions.active);
    if (want && !hum) {
      const src = kit.ctx.createBufferSource(), amp = kit.ctx.createGain();
      src.buffer = buffer; src.loop = true; amp.gain.value = 0;
      src.connect(amp).connect(kit.buses.sfx.node);
      src.start(now);
      hum = { src, amp };
    } else if (!want && hum) {
      const h = hum; hum = null;
      h.amp.gain.setTargetAtTime(0, now, 0.15);
      h.src.stop(now + 1);
      h.src.onended = () => { h.src.disconnect(); h.amp.disconnect(); };
    }
    if (hum) {
      const move = clamp(p.move || 0, 0, 1), swing = p.action === 1 ? 1 : 0;
      hum.amp.gain.setTargetAtTime(0.06 + 0.05 * move + 0.09 * swing, now, swing ? 0.04 : 0.15);
      hum.src.playbackRate.setTargetAtTime(1 + 0.05 * move + 0.14 * swing, now, swing ? 0.05 : 0.2);
    }
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
    humTick(now);
  }

  const bus = game.bus;
  bus.on('begin', () => safely(boot));
  bus.on('sound', (on) => { soundOn = !!on; safely(setMaster); });
  // { master, music, sfx, ambience }, each 0..1: the Sound settings
  bus.on('volume', (v) => { hearSettings(v); safely(setLevels); });
  bus.on('frame', () => safely(tick));
  for (const type of new Set([...Object.keys(SOUNDS), ...Object.keys(SAMPLED)])) bus.on(type, (payload) => trigger(type, payload));
  if (typeof addEventListener === 'function') {
    // phones only count some events as a gesture (a lifted finger, a click), so listen for them all
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, wake, { passive: true });
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => safely(() => setMaster(0.3)));

  return {
    /** A promise that settles once the recordings are loaded (or have failed): the trailer waits on it. */
    get ready() { return ready; },
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
  // Two more tones the music's voices are built on (VOICES), as the strength of each harmonic.
  const wave = (...harmonics) => ctx.createPeriodicWave(new Float32Array(harmonics.length + 1), new Float32Array([0, ...harmonics]));
  const waves = {
    organ: wave(1, 0.5, 0.12, 0.25, 0, 0.06, 0, 0.08),   // pipes at 8, 4 and 2 feet, and a little of the ones between
    flute: wave(1, 0.3, 0.09, 0.03),                     // nearly pure
  };

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
   *    gain, attack, hold, decay, cutoff, cutoffTo (low-pass Hz), formant [Hz, dB, Q], pan (-1..1),
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
    if (o.formant) {           // a resonance, as a mouth gives a voice: one band lifted
      const peak = ctx.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = o.formant[0];
      peak.gain.value = o.formant[1];
      peak.Q.value = o.formant[2] ?? 1.5;
      chain.push(peak);
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

  /** A recording (static/sfx). o: name, gain, rate (playback speed, and so pitch), pan, bus, at | when. False if it is not loaded. */
  function sample(o) {
    const buffer = kit.samples.get(o.name), out = buses[o.bus] || buses.sfx, peak = (o.gain ?? 0.3) * kit.level;
    if (!buffer) return false;
    if (out.pool.n >= out.pool.max || !(peak > MIN_GAIN)) return true;
    const t0 = startTime(o), rate = o.rate ?? 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const amp = ctx.createGain();
    amp.gain.value = peak;
    const chain = [src, amp];
    if (o.pan && ctx.createStereoPanner) { const panner = ctx.createStereoPanner(); panner.pan.value = o.pan; chain.push(panner); }
    src.start(t0);
    finish(src, chain, out, t0, t0 + buffer.duration / rate + 0.02);
    return true;
  }

  /** Soft bell: a sine with one inharmonic partial that fades sooner. o: gain, decay, bus, at. */
  function bell(freq, o = {}) {
    const gain = o.gain ?? 0.07, decay = o.decay ?? 0.6, base = { bus: o.bus, at: o.at, attack: 0.004 };
    tone({ ...base, freq, decay, gain });
    if (freq * 2.76 < 4200) tone({ ...base, freq: freq * 2.76, decay: decay * 0.4, gain: gain * 0.2 });
  }

  const kit = {
    ctx, master, buses, padFilter, noiseBuffer, waves, tone, noise, piano, bell, sample,
    samples: new Map(),     // the recordings, by name, once loaded (loadSamples)
    level: 1,        // distance scale for the sound being triggered
    delay: 0,        // stagger for the sound being triggered
    root: AREAS.town.root,   // the music's current key root (MIDI)...
    scale: AREAS.town.five,  // ...and its five-note scale: both follow the piece playing (the area's, or its elder's)

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
 * The score. Each area has a piece of its own and each elder a theme of its
 * own (the rows of AREAS and BOSSES): a tune that is written down, sung by the
 * row's lead over the row's bed and figure, in the row's key, meter and tempo.
 * The piece is played phrase by phrase, round and round; now and then a phrase
 * is left out, so it never comes round quite the same.
 *
 * What is happening bends it (STANCES) by bringing layers in and out, never by
 * changing the track. Creatures after the hero darken the chords, cut the tune
 * down to its opening notes and add low strings and a soft drum; an elder takes
 * the piece over with its own theme, in its own key (one without a theme darkens
 * the area's piece and tolls); low health thins everything; a cinematic leaves
 * only the bed.
 *
 * Nothing is written far ahead of the audio clock. Three clocks keep it close
 * to the game: every tick reads the game (sense), every bar re-reads the stance,
 * and a fight's layers are written a beat at a time.
 */
function createMusic(kit, game) {
  const ctx = kit.ctx, out = kit.buses.music;
  const st = {
    at: -Infinity,                 // start time of the next beat
    bar: 0, beat: 0, len: 1,       // bars since the key or the stance was set, the beat within the bar, seconds per beat
    area: null,                    // the row of AREAS for where the hero is
    theme: null,                   // the row of BOSSES for the elder that is up, if it has one
    piece: null,                   // the row being played: the area's, the elder's, or the elder's enraged
    elder: false, fury: false,     // an elder is up / it is wounded
    stance: 'calm',
    heat: 0,                       // 0..1, smoothed: creatures are after the hero
    thin: 0, low: false,           // 0..1, smoothed: the hero's health is low
    held: false, blocks: true,     // a cinematic has the stage / the one playing holds the controls
    chordName: '', chord: CHORDS.I, chordIn: 0,   // the chord sounding, and bars until the next
    fit: () => false,              // may a note of the scale be sung over it?
    clear: () => true,             // may a note the tune writes be sung over it as it stands?
    phrase: 0, pbar: 0,            // where the tune is: which phrase, and which bar of it
    skip: false,                   // the phrase now passing is one that is left out
    wait: 0,                       // bars of the bed alone before the tune goes on
    rest: 1,                       // in a fight: measures until the next fragment of the tune
    wide: 1, mid: -1,              // in a fight: bars to a measure, and the beat its middle falls on
    fought: false,                 // the last beat had the fight layers in it
    busy: 0,                       // an effect's own flourish is sounding until then: answers wait for it
    felled: -Infinity,             // when an elder last came down
    mix: { all: -1 },              // the level each layer was last sent to
  };

  // ---- the mix: layers, and the decks they play through

  // A deck is the set of buses everything pitched plays through: `lead` (the
  // tune), `comp` (what moves under it), `call` (answers), `fight` (what danger
  // adds) and `pad` (the bed). When the key changes at once (another area, an
  // elder waking or coming down) the deck is faded out together with whatever
  // was ringing or already written into it, and a new one takes over, so two
  // keys are never heard together.
  let deck = null;
  const spent = [];   // gains that have been faded out, until they can be let go

  const levels = () => ({
    lead: st.held ? 0 : 1,
    comp: st.held ? 0 : 1,
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
    for (const name of ['lead', 'comp', 'call', 'fight', 'pad']) layer(name, level[name]);
    Object.assign(st.mix, level);
  }

  // A chord cut short (the stance changed under it, or an answer took the piece
  // home) takes its bed with it, so the next chord is not heard through it.
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

  const generic = () => st.elder && !st.theme;                       // an elder with no theme of its own
  const harmony = () => (generic() && st.area.elder) || st.piece;    // whose mode is in force
  const wanderers = () => (generic() && st.area.elder ? st.area.elder.chords : st.area.tense);   // the chords of a fight
  const pieceNow = () => (st.theme ? (st.fury && st.theme.fury) || st.theme : st.area);
  // a little danger does not start a fight in the music, and it is not over at the first lull
  const stanceNow = () => (st.theme ? 'calm' : st.elder ? (st.fury ? 'rage' : 'elder') : st.heat > (st.stance === 'tense' ? 0.25 : 0.5) ? 'tense' : 'calm');
  const fightStance = () => STANCES[st.elder ? (st.fury ? 'rage' : 'elder') : 'tense'];
  const barsFor = (seconds) => Math.max(1, Math.round(seconds / (st.piece.meter * st.len)));

  // Where the hero is, and which elder is up. Either one changing changes the
  // key at once: a new deck, and the piece (the area's, or the elder's own)
  // opens at the top of its tune.
  function place(now) {
    const area = areaOf(game), boss = (game.monsters || []).find((m) => m && m.boss && !m.dead);
    const elder = !!boss, theme = boss ? lookup(BOSSES, boss.defId, null) : null;
    if (area === st.area && elder === st.elder && theme === st.theme) return;
    const moved = area !== st.area, fallen = st.elder && !elder;
    Object.assign(st, { area, elder, theme, piece: theme || area, stance: 'calm' });
    st.heat = 0;                   // whatever fight there was is not this one
    kit.root = st.piece.root;
    kit.scale = harmony().five;
    newDeck(now);
    // (an elder's fall rings on its own tonic, which is not the area's: the area's piece waits for it to die away)
    Object.assign(st, { at: now + (fallen ? FELL_HUSH : moved ? 0.6 : 0.3), bar: 0, beat: 0, chordName: '', chordIn: 0, phrase: 0, pbar: 0, wait: 0, rest: 1, skip: false });
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
      // It is over. After an elder's fall, a silence before the tune; after any
      // other the piece opens again at the top of its tune, on a downbeat.
      if (now - st.felled < 15) Object.assign(st, { pbar: 0, wait: barsFor(8) });
      else {
        cutPad(now + 0.4);
        Object.assign(st, { at: now + 0.4, beat: 0, bar: 0, chordName: '', chordIn: 0, phrase: 0, pbar: 0, wait: 0, rest: 0 });
      }
    }
    st.held = held;
  }

  // ---- harmony

  // What may be sung over a chord. `clear`: not a semitone above one of its notes
  // in any octave (the harsh rub), and not right under a note the bed is
  // sounding. `fit`: that, and a note of the mode in force.
  function over(chord, sounding = chord.pad.map((offset) => kit.root + offset)) {
    const root = kit.root, notes = harmony().notes, held = new Set(sounding);
    const tones = new Set([chord.bass, ...chord.pad, ...sounding.map((midi) => midi - root)].map(pitchClass));
    const clear = (midi) => !tones.has(pitchClass(midi - root - 1)) && !held.has(midi + 1);
    return { clear, fit: (midi) => notes.includes(pitchClass(midi - root)) && clear(midi) };
  }

  // The nearest note to `midi` that fits (itself, if nothing near does).
  const snap = (midi, fit) => [0, 1, -1, 2, -2, 3, -3].map((d) => midi + d).find(fit) ?? midi;

  // The note a degree of the mode in force stands for, counted from `base`
  // (0 is the tonic there, 7 the octave above it).
  function pitch(base, degree, sharp = 0) {
    const notes = harmony().notes, octave = Math.floor(degree / 7);
    return base + 12 * octave + notes[degree - 7 * octave] + sharp;
  }

  // A chord arrives: the piece's bed holds it for `bars` bars from t0.
  function sound(name, t0, bars) {
    const piece = st.piece, chord = lookup(CHORDS, name, CHORDS.Isus), span = bars * piece.meter * st.len;
    if (st.chordIn > 0) cutPad(t0);      // the chord before is cut short
    const bed = {
      root: kit.root, chord, bass: fold(kit.root + chord.bass, piece.bassFloor ?? 36), t0, span, sounding: [],
      swell: Math.min(3, span * 0.4), tail: Math.min(5, span * 0.58), thin: st.thin > 0.5,
    };
    lookup(BEDS, piece.bed, BEDS.strings)(kit, bed);
    Object.assign(st, { chordName: name, chord, chordIn: bars }, over(chord, bed.sounding));
    kit.padFilter.frequency.setTargetAtTime((piece.pad || 800) * (generic() ? 0.75 : 1), t0, 2);
  }

  // ---- the tune, and what moves under it

  function sing(voice, midi, when, seconds, gain, more) {
    lookup(VOICES, voice, VOICES.piano).play(kit, { bus: 'lead', midi, when, len: seconds, gain: gain * rand(0.92, 1.08), ...more });
  }

  // One bar of the tune as written: the lead's, or the second voice's where the
  // phrase is marked for it.
  function tuneBar(t0, phrase, bar) {
    const piece = st.piece, by = (phrase.who === 2 && piece.second) || piece.lead, twin = piece.double;
    const also = lookup(VOICES, by.voice, VOICES.piano).also ?? 0, across = twin ? twin.at - by.at : 0;
    for (const n of phrase.bars[bar] || []) {
      let midi = pitch(by.at, n.degree, n.sharp);
      // (a row's tune is written to sit over its chords: this is for one that does not)
      if (!(st.clear(midi) && st.clear(midi + also))) midi = snap(midi, (m) => st.fit(m) && st.clear(m + also));
      const when = t0 + n.at * st.len, seconds = n.len * st.len, gain = piece.strong.includes(n.at) ? 1 : 0.88;
      sing(by.voice, midi, when, seconds, gain);
      if (piece.echo) sing(by.voice, midi, when + piece.echo[0], seconds, gain * piece.echo[1]);
      // the second instrument on the tune leaves out a note that would rub where it lies
      if (twin && twin.voice !== by.voice && st.thin < 0.5 && st.clear(midi + across)) sing(twin.voice, midi + across, when + 0.012, seconds, gain * 0.6);
    }
  }

  // In a fight the tune is not played through: one phrase's opening notes at a
  // time, lower (but no lower than the voice sounds well), in whatever the chord allows.
  function fragment(t0) {
    const piece = st.piece, phrases = piece.phrases;
    if (!phrases.length) return;
    const phrase = phrases[st.phrase % phrases.length], by = piece.lead, drop = STANCES[st.stance].drop;
    st.phrase = (st.phrase + 1) % phrases.length;
    const head = (phrase.bars[0] || []).slice(0, 3), notes = head.map((n) => pitch(by.at, n.degree - drop, n.sharp));
    if (!notes.length) return;
    const lift = 12 * Math.max(0, Math.ceil((lookup(VOICES, by.voice, VOICES.piano).low - Math.min(...notes)) / 12));
    head.forEach((n, i) => sing(by.voice, snap(notes[i] + lift, st.fit), t0 + n.at * st.len, n.len * st.len, 0.9, { light: true }));
  }

  // A note of the chord sounding, as a figure names it ('bass', 'low' 'mid' 'top', and '+12').
  function chordNote(part) {
    const [name, up = 0] = String(part).split('+'), chord = st.chord;
    const base = name === 'bass' ? fold(kit.root + chord.bass, st.piece.bassFloor ?? 36) : kit.root + chord.pad[{ low: 0, mid: 1, top: 2 }[name] ?? 0];
    return base + Number(up);
  }

  // One bar of the piece's figure. `fresh`: a chord arrives in this bar; `opening`: a phrase begins in it.
  function figureBar(t0, fresh, opening) {
    for (const name of [].concat(st.piece.figure || [])) {
      const figure = lookup(FIGURES, name, null);
      if (!figure || (figure.on === 'chord' && !fresh) || (figure.on === 'phrase' && !opening)) continue;
      const voice = lookup(VOICES, figure.voice, VOICES.piano);
      figure.bars[figure.on === 'bar' ? st.bar % figure.bars.length : 0].forEach(([beat, part, held = 1, level = 1], i) => {
        if (beat < st.piece.meter) voice.play(kit, { bus: 'comp', midi: chordNote(part), when: t0 + beat * st.len + 0.004 * i, len: held * st.len, gain: level, light: figure.light });
      });
    }
  }

  // The piano's left hand in a fight: the bass of the chord on every measure.
  // Against an elder it tolls in octaves.
  function leftHand(t0) {
    const stance = STANCES[st.stance], midi = fold(kit.root + st.chord.bass, st.piece.bassFloor ?? 36), when = t0 + rand(0, 0.03);
    // (the notes come every measure, so they are not left to ring into each other)
    kit.piano(mtof(midi), { bus: 'comp', when, gain: stance.left, ring: 0.6 });
    if (stance.octave && st.thin < 0.5) kit.piano(mtof(midi + 12), { bus: 'comp', strings: 1, ring: 0.6, when: when + 0.03, gain: stance.left * 0.5 });
  }

  // ---- what a fight adds: all of it low, slow and under the tune

  // A soft low drum: a felt beater on a big skin, more felt than heard.
  function drum(when, gain, deep) {
    const freq = deep ? 60 : 76;
    kit.tone({ bus: 'fight', freq, to: freq * 0.6, glide: 0.2, when, attack: 0.008, decay: deep ? 0.75 : 0.45, gain });
    kit.tone({ bus: 'fight', type: 'triangle', cutoff: 260, freq: freq * 1.9, to: freq * 1.1, glide: 0.1, when, attack: 0.006, decay: 0.18, gain: gain * 0.35 });
  }

  // Cellos and basses: bowed, never plucked, and kept dark.
  function lowString(midi, when, seconds, gain) {
    VOICES.lowstring.play(kit, { bus: 'fight', midi, when, len: seconds, gain: gain / 0.04 });
  }

  // A low bell on the tonic, left to ring.
  function toll(when, gain) {
    const freq = mtof(fold(kit.root, 55));
    kit.tone({ bus: 'fight', freq, when, attack: 0.012, decay: 5.5, gain });
    kit.tone({ bus: 'fight', freq: freq * 2.76, when, attack: 0.012, decay: 2.2, gain: gain * 0.18 });
  }

  // A wave coming in and drawing back: a breath of low noise (no hiss in it) that swells for half its length.
  function wash(when, seconds, gain) {
    kit.noise({ bus: 'fight', filter: 'lowpass', freq: 240, to: 700, glide: seconds * 0.45, when, attack: seconds * 0.45, hold: 0.2, decay: seconds * 0.5, gain });
  }

  // One beat of the fight layers. They follow the danger itself, not the stance
  // of the bar, so they arrive and leave within a beat of the game.
  function fightBeat(t0) {
    const on = !st.held && (st.elder || st.heat > (st.fought ? 0.2 : 0.3));
    const first = on && !st.fought, thin = st.thin > 0.5, piece = st.piece;
    st.fought = on;
    if (!on) return;
    if (st.theme) {                // an elder with a theme of its own: its row says what the drum does
      const hit = piece.drum && piece.drum[st.beat];
      if (hit) drum(t0, hit * (thin ? 0.8 : 1), piece.deep);
      if (!thin && piece.wash && st.beat === 0 && st.bar % 2 === 0) wash(t0, 2 * piece.meter * st.len, piece.wash);
      return;
    }
    // Where the beat falls in the measure. The first beat of a fight is a downbeat, wherever it falls.
    const stance = fightStance(), beats = st.wide * piece.meter, here = (st.bar % st.wide) * piece.meter + st.beat, at = first ? 0 : here;
    const hit = at === 0 ? stance.drum[0] : at === st.mid ? stance.drum[1] : 0;
    if (hit) drum(t0, hit * (thin ? 0.8 : 1), stance.deep);
    if (thin) return;              // low health: the drum alone
    const bass = fold(kit.root + st.chord.bass, STRING_FLOOR), half = Math.min(1.4, (beats * st.len) / 2);
    if (stance.drone) { if (at === 0) lowString(bass, t0, (beats - here) * st.len, 0.04); }   // held to the end of the measure
    else if (at === 0) lowString(bass, t0, half, 0.034);
    else if (at === st.mid) lowString(bass + 7, t0, half, 0.034);
    if (stance.toll && at === 0 && (first || Math.floor(st.bar / st.wide) % 2 === 0)) toll(t0, stance.toll);
  }

  // ---- answers

  function answer(kind) {
    if (st.held || !st.area) return;
    const a = ANSWERS[kind], piece = st.piece, half = piece.step;
    const t0 = Math.max(ctx.currentTime + 0.12, st.busy);
    // It is over: whatever fight there was leaves at once, the tune stops for
    // the answer, and the piece goes home (it stays if it is there already).
    st.heat = Math.min(st.heat, 0.2);
    const home = generic() && st.area.elder ? st.area.elder.chords[0] : piece.home, chord = lookup(CHORDS, home, CHORDS.Isus);
    if (!(st.chordName === home && st.stance === 'calm')) {
      cutPad(t0);
      Object.assign(st, { stance: 'calm', at: t0, beat: 0, bar: 0, chordName: '', chordIn: 0 });
    }
    const fit = over(chord).fit, base = fold(kit.root, a.floor), last = a.steps.length - 1;
    a.steps.forEach((step, i) => {
      const octave = Math.floor(step / 5);
      const midi = snap(base + 12 * octave + kit.scale[step - 5 * octave], fit);
      kit.piano(mtof(midi), { bus: 'call', when: t0 + i * half, gain: a.gain * (i === last ? 1.1 : 1) });
    });
    if (a.roll) {
      const when = t0 + (last + 1) * half;
      kit.piano(mtof(fold(kit.root + chord.bass, piece.bassFloor ?? 36)), { bus: 'call', when, gain: a.gain });
      chord.pad.forEach((offset, i) => kit.piano(mtof(kit.root + offset + 12), { bus: 'call', strings: 1, when: when + 0.05 + i * 0.07, gain: a.gain * 0.6 }));
    }
    // then the bed alone, and the tune picks up again at the top of a phrase
    Object.assign(st, { pbar: 0, wait: Math.max(st.wait, barsFor(8)), rest: Math.max(st.rest, 2) });
    st.busy = t0 + (last + 3) * half;
  }

  // ---- the scheduler

  // A bar of the piece as its row writes it.
  function writtenBar(t0) {
    const piece = st.piece, phrases = piece.phrases;
    if (st.held || st.wait > 0 || !phrases.length) {       // the bed alone, on the home chord
      if (st.chordIn <= 0 || st.chordName !== piece.home) sound(piece.home, t0, barsFor(9));
      if (st.wait > 0 && !st.held) st.wait--;
      st.pbar = 0;
      return;
    }
    const phrase = phrases[st.phrase % phrases.length], opening = st.pbar === 0, hurt = st.thin > 0.5;
    // Now and then a phrase is left out and the bed breathes alone: more often when the hero is hurt, and
    // never the first, so that a piece always begins by saying its tune.
    if (opening) st.skip = (st.phrase > 0 || hurt) && rand() > SPARE * (hurt ? 0.5 : 1);
    const fresh = phrase.spans[st.pbar] > 0;
    if (fresh) sound(phrase.chords[st.pbar], t0, phrase.spans[st.pbar]);
    else if (st.chordIn <= 0) sound(phrase.chords[st.pbar] || piece.home, t0, 1);
    if (!hurt) figureBar(t0, fresh, opening);
    if (!st.skip) tuneBar(t0, phrase, st.pbar);
    if (++st.pbar >= phrase.chords.length) { st.pbar = 0; st.phrase = (st.phrase + 1) % phrases.length; }
  }

  // A measure of a fight: a chord from the darker ones, the left hand, and now and then a fragment of the tune.
  function wanderBar(t0) {
    const stance = STANCES[st.stance], hurt = st.thin > 0.5;
    if (st.bar % st.wide) return;                          // the second bar of a measure of two
    if (st.chordIn <= 0) {
      // a new stance opens on its home chord; after that the piece wanders and comes back
      const list = wanderers(), home = list[0], was = st.chordName;
      sound(!list.includes(was) ? home : was !== home && rand() < 0.4 ? home : pick(list.filter((name) => name !== was)) ?? home, t0, stance.bars * st.wide);
    }
    if (st.held) return;           // a cinematic is playing: the bed alone
    leftHand(t0);
    if (st.rest > 0) { st.rest--; return; }
    fragment(t0);
    // the next one comes about a phrase later: the tune says under half of what it does in peace
    st.rest = Math.max(1, Math.round((stance.space * (hurt ? 2 : 1) * clamp(st.piece.breath, 10, 24)) / (st.wide * st.piece.meter * st.len)) - 1);
  }

  function startBar(t0) {
    const name = stanceNow(), piece = pieceNow();
    if (name !== st.stance || piece !== st.piece) {
      // a new stance (or an elder now enraged) starts on a new chord, and the tune at the top of a phrase
      if (st.chordIn > 0) cutPad(t0);
      Object.assign(st, { stance: name, phrase: piece === st.piece ? st.phrase : 0, piece, chordIn: 0, chordName: '', pbar: 0, bar: 0, rest: 1 });
    }
    const stance = STANCES[name], beats = piece.meter;
    st.len = piece.beat * stance.pace;
    // a fight counts in measures of about four seconds: a bar, or two of a quick meter
    st.wide = stance.written ? 1 : Math.max(1, Math.round(4 / (beats * st.len)));
    // ...and its second pulse falls on the strong beat nearest the middle of one
    const strong = [], middle = (st.wide * beats) / 2;
    for (let b = 0; b < st.wide; b++) for (const s of piece.strong) if (b * beats + s > 0) strong.push(b * beats + s);
    st.mid = strong.length ? strong.reduce((best, at) => (Math.abs(at - middle) < Math.abs(best - middle) ? at : best)) : -1;
    if (stance.written) writtenBar(t0); else wanderBar(t0);
    st.chordIn--;
  }

  function scheduleBeat() {
    const t0 = st.at;
    if (st.beat === 0) startBar(t0);
    fightBeat(t0);
    st.at = t0 + st.len;
    if (++st.beat >= st.piece.meter) { st.beat = 0; st.bar++; }
  }

  place(ctx.currentTime);

  return {
    update(now, dt) {
      sense(now, dt);
      if (st.at < now - 1) {       // back from a stall: pick up on a new bar, a new chord and the top of a phrase
        cutPad(now + 0.4);
        Object.assign(st, { at: now + 0.4, beat: 0, bar: 0, chordIn: 0, pbar: 0 });
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
