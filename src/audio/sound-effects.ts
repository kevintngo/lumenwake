import { clamp } from '../core/math';
import type { AbilityId, CreatureId, SiteId } from '../types/domain';
import type { Entity, MonsterEntity } from '../types/entity';
import type { GameEventMap } from '../types/events';
import { lookup, pick, rand, type AudioPosition, type SynthKit } from './synth-kit';

interface MonsterVoice {
  readonly freq: number;
  readonly type: OscillatorType;
  readonly bend: number;
}

const MONSTER_VOICE: Readonly<Record<CreatureId, MonsterVoice>> = {
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
  warden: { freq: 190, type: 'square', bend: 0.8 },
  matron: { freq: 330, type: 'sine', bend: 0.72 },
  sentinel: { freq: 420, type: 'triangle', bend: 1.1 },
  keeper: { freq: 150, type: 'triangle', bend: 0.75 },
  drifter: { freq: 520, type: 'sine', bend: 1.3 },
  thornmother: { freq: 360, type: 'sine', bend: 0.78 },
  saltcolossus: { freq: 175, type: 'square', bend: 0.82 },
  ambersentinel: { freq: 400, type: 'triangle', bend: 1.05 },
};

const DEFAULT_VOICE: MonsterVoice = { freq: 600, type: 'triangle', bend: 1.2 };
const voiceOf = (m: { readonly defId?: string }): MonsterVoice => lookup(MONSTER_VOICE, m.defId, DEFAULT_VOICE);
const isMonster = (e: Entity | null | undefined): e is MonsterEntity => !!e && e.kind === 'monster';

const SITE_STEPS: Readonly<Record<SiteId, readonly number[]>> = {
  mark: [0, 4, 7],
  beacon: [0, 7, 12],
  crystal: [4, 7, 11],
  cargo: [0, 2, 7],
};

function spatial<P>(
  play: (k: SynthKit, payload: P) => void,
  where: (payload: P) => AudioPosition = (payload) => payload as AudioPosition,
): (k: SynthKit, payload: P) => void {
  return (k, payload) => {
    const level = k.nearness(where(payload));
    if (level <= 0.02) return;
    k.level = level;
    play(k, payload);
  };
}

const SKILL_SOUNDS: Partial<Record<AbilityId, (k: SynthKit) => void>> = {
  bolt(k) {
    k.noise({ freq: 420, to: 1700, glide: 0.22, q: 0.9, attack: 0.05, hold: 0.05, decay: 0.4, gain: 0.13 });
    k.tone({ type: 'triangle', freq: 210, to: 95, attack: 0.02, decay: 0.4, gain: 0.08 });
  },
  mend(k) {
    for (const step of [0, 3, 5]) {
      k.tone({ bus: 'chime', freq: k.key(step, 62), attack: 0.3, hold: 0.15, decay: 1.4, gain: 0.045 });
    }
    k.bell(k.key(7, 62), { bus: 'chime', at: 0.3, decay: 1.2, gain: 0.04 });
  },
  step(k) {
    k.noise({ freq: 2100, to: 650, glide: 0.2, q: 0.7, attack: 0.03, decay: 0.3, gain: 0.1 });
  },
};

type SoundMap = {
  readonly [K in keyof GameEventMap]?: (k: SynthKit, payload: GameEventMap[K]) => void;
};

export const SOUNDS: SoundMap = {
  step(k, { entity }) {
    if (entity && entity.kind !== 'player') return;
    const v = rand(0.88, 1.14);
    k.noise({ filter: 'lowpass', freq: 620 * v, to: 260 * v, decay: 0.13, gain: 0.045 });
    k.tone({ freq: 92 * v, to: 58 * v, decay: 0.12, gain: 0.05 });
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

  damage: spatial<GameEventMap['damage']>(
    (k, { target, crit, soft }) => {
      if (soft) return;
      const v = rand(0.92, 1.1);
      if (target && target.kind === 'player') {
        k.tone({ freq: 125 * v, to: 52, decay: 0.32, gain: 0.24 });
        k.noise({ filter: 'lowpass', freq: 380, to: 160, decay: 0.2, gain: 0.12 });
        return;
      }
      if (isMonster(target) && target.guard) {
        k.tone({ type: 'triangle', freq: 1180 * v, to: 900 * v, glide: 0.04, attack: 0.002, decay: 0.1, gain: 0.08 });
        k.noise({ freq: 3000, q: 2, attack: 0.002, decay: 0.05, gain: 0.06 });
        return;
      }
      k.noise({ freq: (crit ? 1700 : 1150) * v, q: 1.1, attack: 0.003, decay: 0.12, gain: crit ? 0.17 : 0.14 });
      k.tone({ type: 'triangle', freq: 230 * v, to: 120 * v, attack: 0.003, decay: 0.16, gain: 0.15 });
      if (crit) k.bell(k.key(3, 74), { decay: 0.5, gain: 0.05 });
      if (target && target.hp <= 0) {
        const elite = isMonster(target) && target.elite;
        k.tone({ freq: 104 * v, to: 46, attack: 0.004, decay: elite ? 0.55 : 0.3, gain: elite ? 0.2 : 0.13 });
      }
    },
    (p) => p.target,
  ),

  'monster:special': spatial<MonsterEntity>((k, m) => {
    const voice = voiceOf(m);
    const f = voice.freq * (m.elite ? 0.82 : 1);
    k.tone({
      type: voice.type,
      cutoff: Math.min(2400, f * 3.5),
      freq: f * 0.62,
      to: f * 1.25,
      glide: 0.32,
      attack: 0.06,
      hold: 0.16,
      decay: 0.22,
      gain: 0.085,
    });
    k.noise({ freq: 500, to: 1900, glide: 0.34, q: 1.6, attack: 0.2, hold: 0.06, decay: 0.16, gain: 0.05 });
  }),

  slam: spatial<GameEventMap['slam']>((k, { heavy }) => {
    const v = rand(0.92, 1.08);
    k.tone({ freq: (heavy ? 88 : 112) * v, to: 40, decay: heavy ? 0.5 : 0.32, gain: heavy ? 0.26 : 0.17 });
    k.noise({
      filter: 'lowpass',
      freq: heavy ? 700 : 900,
      to: 140,
      attack: 0.004,
      decay: heavy ? 0.45 : 0.28,
      gain: heavy ? 0.16 : 0.11,
    });
  }),

  'monster:shot': spatial<MonsterEntity>((k, m) => {
    const f = voiceOf(m).freq * rand(0.95, 1.06);
    k.tone({ type: 'triangle', freq: f * 1.1, to: f * 0.55, glide: 0.14, attack: 0.004, decay: 0.2, gain: 0.07 });
    k.noise({ freq: 2400, to: 900, q: 1.2, attack: 0.004, decay: 0.12, gain: 0.05 });
  }),

  'shot:hit': spatial<GameEventMap['shot:hit']>((k) => {
    k.noise({ filter: 'lowpass', freq: 1100, to: 300, attack: 0.004, decay: 0.2, gain: 0.09 });
    k.tone({ freq: 190, to: 95, decay: 0.14, gain: 0.07 });
  }),

  'hazard:cloud': spatial<GameEventMap['hazard:cloud']>((k, { life }) => {
    k.tone({ freq: 240, to: 150, glide: 0.2, attack: 0.02, decay: 0.24, gain: 0.05 });
    k.noise({
      freq: 2600,
      to: 1100,
      glide: 0.8,
      q: 0.7,
      attack: 0.18,
      hold: 0.25,
      decay: Math.min(1.6, (life || 2) * 0.5),
      gain: 0.05,
    });
  }),

  'charge:dust': spatial<GameEventMap['charge:dust']>((k) => {
    const v = rand(0.9, 1.12);
    k.tone({ freq: 84 * v, to: 52 * v, decay: 0.11, gain: 0.075 });
    k.noise({ filter: 'lowpass', freq: 520 * v, to: 220, decay: 0.1, gain: 0.04 });
  }),

  guard: spatial<GameEventMap['guard']>(
    (k) => {
      k.tone({ type: 'triangle', freq: 540, to: 410, glide: 0.04, attack: 0.002, decay: 0.09, gain: 0.09 });
      k.noise({ freq: 2800, q: 2, attack: 0.002, decay: 0.05, gain: 0.05 });
    },
    (p) => p.entity,
  ),

  miss(k, { target, text }) {
    if (!target || target.kind !== 'player' || text !== 'Dodged') return;
    k.noise({ freq: 1500, to: 3000, glide: 0.1, q: 1.6, attack: 0.03, decay: 0.14, gain: 0.05 });
  },

  lowhealth(k) {
    for (const at of [0, 0.26]) {
      k.tone({ freq: 74, to: 52, at, attack: 0.008, decay: 0.26, gain: at ? 0.13 : 0.17 });
    }
  },

  'monster:alert': spatial<MonsterEntity>((k, m) => {
    const voice = voiceOf(m);
    const f = voice.freq * rand(0.94, 1.08) * (m.elite ? 0.82 : 1);
    const call = { type: voice.type, cutoff: Math.min(2600, f * 4), attack: 0.008, glide: 0.08 };
    k.tone({ ...call, freq: f, to: f * voice.bend, decay: 0.14, gain: 0.08 });
    k.tone({ ...call, freq: f * 1.19, to: f * 1.19 * voice.bend, at: 0.12, decay: 0.2, gain: 0.07 });
  }),

  'monster:strike': spatial<MonsterEntity>((k, m) => {
    const voice = voiceOf(m);
    const f = voice.freq * rand(0.9, 1.1);
    k.noise({ freq: 900, to: 420, q: 1, decay: 0.15, gain: 0.12 });
    k.tone({ type: voice.type, cutoff: 1400, freq: f * 0.6, to: f * 0.38, decay: 0.18, gain: 0.1 });
  }),

  'monster:died': spatial<MonsterEntity>((k, m) => {
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

  'boss:step': spatial<GameEventMap['boss:step']>(
    (k) => {
      const v = rand(0.92, 1.08);
      k.tone({ freq: 62 * v, to: 34, decay: 0.5, gain: 0.3 });
      k.noise({ filter: 'lowpass', freq: 420, to: 110, attack: 0.006, decay: 0.42, gain: 0.14 });
    },
    (p) => (p.x !== undefined ? p : p.entity),
  ),

  'cine:rumble'(k, { power = 0.5 }) {
    k.noise({ filter: 'lowpass', freq: 240, to: 90, attack: 0.12, hold: 0.25, decay: 0.7, gain: 0.1 + 0.1 * power });
    k.tone({ freq: 48, to: 38, attack: 0.08, hold: 0.2, decay: 0.6, gain: 0.16 + 0.1 * power });
  },

  'boss:rise'(k) {
    k.noise({ filter: 'lowpass', freq: 160, to: 520, glide: 2.6, attack: 0.5, hold: 2.0, decay: 1.2, gain: 0.16 });
    k.tone({ freq: 41, to: 55, glide: 3.0, attack: 0.6, hold: 2.2, decay: 1.0, gain: 0.2 });
    for (const [step, at] of [
      [0, 0.2],
      [7, 1.1],
      [10, 2.0],
    ] as const) {
      k.tone({
        bus: 'chime',
        type: 'triangle',
        cutoff: 900,
        freq: k.key(step, 38),
        at,
        attack: 0.9,
        hold: 0.6,
        decay: 1.6,
        gain: 0.05,
      });
    }
  },

  'boss:stand'(k) {
    k.tone({ freq: 70, to: 30, decay: 0.9, gain: 0.34 });
    k.noise({ filter: 'lowpass', freq: 600, to: 120, attack: 0.005, decay: 0.8, gain: 0.2 });
  },

  'boss:roar': spatial<GameEventMap['boss:roar']>(
    (k, { entity }) => {
      const f = (entity ? voiceOf(entity).freq : 300) * 0.22;
      k.tone({
        type: 'sawtooth',
        cutoff: 520,
        freq: f * 1.25,
        to: f * 0.7,
        glide: 1.3,
        attack: 0.12,
        hold: 0.7,
        decay: 0.9,
        gain: 0.2,
      });
      k.tone({
        type: 'sawtooth',
        cutoff: 380,
        freq: f * 0.63,
        to: f * 0.36,
        glide: 1.4,
        attack: 0.16,
        hold: 0.7,
        decay: 0.9,
        gain: 0.16,
      });
      k.noise({ freq: 700, to: 320, glide: 1.2, q: 0.8, attack: 0.15, hold: 0.6, decay: 0.8, gain: 0.1 });
    },
    () => null,
  ),

  'boss:fell'(k) {
    k.piano(k.key(0, 33), { bus: 'chime', strings: 2, ring: 1.6, gain: 0.3 });
    k.noise({ filter: 'lowpass', freq: 520, to: 140, glide: 2.6, attack: 0.3, hold: 1.8, decay: 1.4, gain: 0.12 });
  },

  'boss:down'(k) {
    k.tone({ freq: 58, to: 26, decay: 1.4, gain: 0.36 });
    k.noise({ filter: 'lowpass', freq: 800, to: 100, attack: 0.005, decay: 1.2, gain: 0.22 });
    [0, 7, 12].forEach((step, i) =>
      k.piano(k.key(step, 45), { bus: 'chime', strings: 1, ring: 1.4, at: 0.9 + i * 0.32, gain: 0.16 }),
    );
  },

  'boss:enrage'(k) {
    k.tone({ freq: 52, to: 44, attack: 0.05, hold: 0.3, decay: 0.7, gain: 0.2 });
  },

  'gate:shut': spatial<GameEventMap['gate:shut']>((k) => {
    k.tone({ type: 'triangle', freq: 150, to: 70, decay: 0.3, gain: 0.16 });
    k.noise({ filter: 'lowpass', freq: 900, to: 200, attack: 0.004, decay: 0.3, gain: 0.12 });
  }),

  'cine:open'(k) {
    k.tone({
      bus: 'chime',
      type: 'triangle',
      cutoff: 1100,
      freq: k.key(0, 50),
      attack: 1.4,
      hold: 2.2,
      decay: 2.6,
      gain: 0.05,
    });
    [0, 4, 7].forEach((step, i) =>
      k.piano(k.key(step, 62), { bus: 'chime', strings: 1, ring: 1.4, at: 0.5 + i * 0.7, gain: 0.15 }),
    );
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
    [0, 7, 12].forEach((step, i) =>
      k.bell(k.key(step, 62), { bus: 'chime', at: 0.25 + i * 0.12, decay: 1.3, gain: 0.05 }),
    );
  },

  shoot(k, { family, heavy }) {
    const v = rand(0.94, 1.06);
    if (family === 'rifle') {
      k.tone({
        type: 'triangle',
        freq: 780 * v,
        to: 240 * v,
        glide: 0.09,
        attack: 0.002,
        decay: 0.12,
        gain: heavy ? 0.13 : 0.1,
      });
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
    if (rarity >= 4) return;
    [0, 7, 12]
      .concat(rarity >= 3 ? [16] : [])
      .forEach((step, i) => k.bell(k.key(step, 67), { bus: 'chime', at: i * 0.1, decay: 1.5, gain: 0.06 }));
  },

  'site:used'(k, { site }) {
    const steps = lookup(SITE_STEPS, site, [0, 4, 7]);
    steps.forEach((step, i) => k.bell(k.key(step, 67), { bus: 'chime', at: i * 0.11, decay: 1.2, gain: 0.05 }));
    k.noise({ freq: 900, to: 2600, glide: 0.4, q: 1.2, attack: 0.2, decay: 0.5, gain: 0.04 });
  },

  'site:guard': spatial<GameEventMap['site:guard']>(
    (k, { guard }) => {
      const f = voiceOf(guard).freq * 0.7;
      k.tone({ type: 'sawtooth', cutoff: 900, freq: f, to: f * 1.4, glide: 0.25, attack: 0.03, hold: 0.1, decay: 0.3, gain: 0.1 });
    },
    (p) => p.guard,
  ),

  'lumen:bolt'(k) {
    k.tone({ type: 'sine', freq: 1250 * rand(0.96, 1.05), to: 760, glide: 0.1, attack: 0.004, decay: 0.12, gain: 0.03 });
  },

  'lumen:ready'(k) {
    [0, 7].forEach((step, i) => k.bell(k.key(step, 74), { bus: 'chime', at: i * 0.13, decay: 0.9, gain: 0.045 }));
  },

  'lumen:burst'(k, { burst }) {
    const kind = burst ? burst.kind : 'ring';
    if (kind === 'mend') {
      [0, 4, 7, 12].forEach((step, i) =>
        k.tone({ bus: 'chime', freq: k.key(step, 67), at: i * 0.08, attack: 0.03, decay: 0.9, gain: 0.045 }),
      );
      return;
    }
    if (kind === 'ward') {
      k.tone({ type: 'triangle', freq: 180, to: 300, glide: 0.3, attack: 0.03, hold: 0.1, decay: 0.6, gain: 0.1 });
      k.bell(k.key(0, 62), { bus: 'chime', decay: 1.4, gain: 0.05 });
      return;
    }
    k.noise({ freq: 500, to: 2200, glide: 0.25, q: 0.9, attack: 0.03, decay: 0.45, gain: 0.11 });
    k.tone({ freq: 150, to: 70, attack: 0.01, decay: 0.45, gain: 0.12 });
    k.bell(k.key(7, 67), { bus: 'chime', at: 0.05, decay: 0.9, gain: 0.04 });
  },

  'lumen:fed'(k) {
    k.tone({ type: 'sine', freq: 520, to: 780, glide: 0.08, attack: 0.005, decay: 0.14, gain: 0.05 });
  },

  'lumen:changed'(k) {
    [0, 4, 7, 11, 14].forEach((step, i) =>
      k.bell(k.key(step, 62), { bus: 'chime', at: i * 0.14, decay: 1.5, gain: 0.05 }),
    );
  },

  'lance:fire': spatial<GameEventMap['lance:fire']>((k) => {
    k.tone({ type: 'sawtooth', cutoff: 1800, freq: 620, to: 140, glide: 0.18, attack: 0.003, decay: 0.3, gain: 0.13 });
    k.noise({ freq: 2800, to: 700, glide: 0.2, q: 1.0, attack: 0.003, decay: 0.25, gain: 0.08 });
  }),

  talk(k) {
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
    const steps = focus ? [0, 3, 5] : [2, 3, 5, 7];
    const floor = focus ? 67 : 72;
    steps.forEach((step, i) =>
      k.tone({ bus: 'chime', freq: k.key(step, floor), at: i * 0.07, attack: 0.02, decay: 0.7, gain: 0.04 }),
    );
  },

  drink(k) {
    k.tone({ freq: 270, to: 170, glide: 0.07, attack: 0.006, decay: 0.12, gain: 0.12 });
    k.tone({ freq: 330, to: 540, glide: 0.05, at: 0.1, decay: 0.1, gain: 0.1 });
  },

  skill(k, { id }) {
    const play = Object.hasOwn(SKILL_SOUNDS, id) ? SKILL_SOUNDS[id] : undefined;
    if (play) play(k);
  },

  'bolt:hit': spatial<GameEventMap['bolt:hit']>((k) => {
    k.noise({ filter: 'lowpass', freq: 1500, to: 320, attack: 0.008, decay: 0.45, gain: 0.13 });
    k.tone({ freq: 150, to: 62, decay: 0.3, gain: 0.14 });
  }),

  'player:died'(k) {
    const f = k.key(0, 55);
    k.tone({ freq: f, to: f / 3, glide: 1.4, attack: 0.03, hold: 0.3, decay: 1.8, gain: 0.2 });
    k.tone({
      bus: 'chime',
      type: 'triangle',
      cutoff: 700,
      freq: f * 1.19,
      to: f * 0.4,
      glide: 1.4,
      attack: 0.05,
      hold: 0.3,
      decay: 1.5,
      gain: 0.06,
    });
  },

  'player:respawn'(k) {
    const f = k.key(0, 62);
    k.tone({ bus: 'chime', freq: f * 0.667, to: f, glide: 0.8, attack: 0.25, hold: 0.45, decay: 1.2, gain: 0.1 });
    k.bell(f * 2, { bus: 'chime', at: 0.75, decay: 1.6, gain: 0.05 });
  },

  'ui:click'(k) {
    k.tone({ type: 'triangle', freq: 620, to: 480, glide: 0.03, attack: 0.002, decay: 0.07, gain: 0.06 });
  },

  'relic:ring'(k, { heavy }) {
    k.tone({ freq: heavy ? 120 : 160, to: 70, attack: 0.005, decay: heavy ? 0.4 : 0.22, gain: heavy ? 0.11 : 0.07 });
    k.bell(k.key(heavy ? 7 : 4, 62), { bus: 'chime', decay: 0.7, gain: 0.03 });
  },

  'relic:found'(k) {
    [0, 4, 7, 11, 14].forEach((step, i) =>
      k.bell(k.key(step, 62), { bus: 'chime', at: i * 0.13, decay: 2.0, gain: 0.055 }),
    );
  },

  salvage(k) {
    k.noise({ freq: 1800, to: 700, q: 1.6, attack: 0.002, decay: 0.09, gain: 0.05 });
    k.bell(k.key(0, 74), { at: 0.05, decay: 0.3, gain: 0.04 });
  },

  hone(k) {
    k.tone({ type: 'triangle', freq: 300, to: 520, glide: 0.18, attack: 0.01, decay: 0.2, gain: 0.07 });
    [7, 12].forEach((step, i) =>
      k.bell(k.key(step, 67), { bus: 'chime', at: 0.12 + i * 0.1, decay: 0.9, gain: 0.045 }),
    );
  },

  trade(k) {
    k.bell(k.key(3, 74), { decay: 0.3, gain: 0.05 });
    k.bell(k.key(5, 74), { at: 0.06, decay: 0.45, gain: 0.05 });
  },

  deny(k) {
    k.tone({ type: 'triangle', cutoff: 500, freq: 150, to: 118, glide: 0.08, decay: 0.18, gain: 0.13 });
  },

  boon(k) {
    for (const step of [0, 2, 3]) {
      k.tone({ bus: 'chime', freq: k.key(step, 57), attack: 0.4, hold: 0.3, decay: 1.8, gain: 0.04 });
    }
    k.bell(k.key(5, 69), { bus: 'chime', at: 0.45, decay: 2, gain: 0.05 });
  },

  talent(k) {
    const note = { bus: 'chime' as const, strings: 1, ring: 0.6 };
    k.piano(k.key(3, 57), { ...note, gain: 0.16 });
    k.piano(k.key(5, 57), { ...note, at: 0.14, gain: 0.17 });
    k.bell(k.key(8, 57), { bus: 'chime', at: 0.3, decay: 1.4, gain: 0.04 });
  },

  'guide:step'(k) {
    k.bell(k.key(3, 74), { bus: 'chime', decay: 0.7, gain: 0.05 });
    k.bell(k.key(5, 74), { bus: 'chime', at: 0.1, decay: 1, gain: 0.05 });
  },

  jump(k, { entity }) {
    if (entity && entity.kind !== 'player') return;
    const v = rand(0.94, 1.08);
    k.noise({ freq: 520 * v, to: 1500 * v, glide: 0.14, q: 0.8, attack: 0.03, decay: 0.16, gain: 0.05 });
  },

  landed: spatial<GameEventMap['landed']>((k) => {
    const v = rand(0.92, 1.08);
    k.tone({ freq: 96 * v, to: 54, attack: 0.004, decay: 0.16, gain: 0.07 });
    k.noise({ filter: 'lowpass', freq: 520 * v, to: 220, attack: 0.004, decay: 0.12, gain: 0.04 });
  }),

  fell(k) {
    k.tone({ type: 'triangle', cutoff: 1400, freq: 520, to: 150, glide: 0.5, attack: 0.02, hold: 0.1, decay: 0.45, gain: 0.07 });
    k.noise({ freq: 1300, to: 380, glide: 0.5, q: 0.7, attack: 0.06, decay: 0.45, gain: 0.035 });
  },
};
