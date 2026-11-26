import { clamp } from '../core/math';
import type { BiomeId, BossId } from '../types/domain';
import type { GameContext } from '../types/game-context';
import {
  MAJOR,
  MINOR,
  fold,
  lookup,
  mtof,
  rand,
  type BusName,
  type SynthKit,
  type ToneOptions,
} from './synth-kit';

export const SPARE = 0.86;
export const STRING_FLOOR = 36;
export const HEAT_RISE = 1;
export const HEAT_FALL = 2.5;
export const DECK_FADE = 0.12;
export const FELL_HUSH = 4.5;
export const HELD_PAD = 0.8;
export const PAD_CUT = 0.7;
const ANSWER_STEP = 0.5;
export const MIX_TIME = { all: 0.7, lead: 0.3, comp: 0.3, fight: 0.3, pad: 0.5 } as const;

export type ChordName =
  | 'I'
  | 'Isus'
  | 'II'
  | 'II/I'
  | 'ii'
  | 'iii'
  | 'IV'
  | 'Vsus'
  | 'vi'
  | 'i'
  | 'III'
  | 'iv'
  | 'v'
  | 'VI'
  | 'VII'
  | 'vii'
  | 'V'
  | 'bII';

export interface ChordDef {
  readonly bass: number;
  readonly pad: readonly [number, number, number];
}

export const CHORDS: Readonly<Record<ChordName, ChordDef>> = {
  I: { bass: 0, pad: [0, 7, 16] },
  Isus: { bass: 0, pad: [0, 7, 14] },
  II: { bass: 2, pad: [-3, 6, 14] },
  'II/I': { bass: 0, pad: [2, 9, 18] },
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
  vii: { bass: 10, pad: [-2, 5, 13] },
  V: { bass: 7, pad: [-5, 2, 11] },
  bII: { bass: 1, pad: [1, 8, 17] },
};

export type AnswerKind = 'clear' | 'done' | 'home';

interface AnswerDef {
  readonly steps: readonly number[];
  readonly floor: number;
  readonly gain: number;
  readonly roll?: boolean;
}

export const ANSWERS: Readonly<Record<AnswerKind, AnswerDef>> = {
  clear: { steps: [3, 5], floor: 60, gain: 0.11 },
  done: { steps: [2, 3, 5], floor: 57, gain: 0.12, roll: true },
  home: { steps: [8, 7, 6, 5], floor: 50, gain: 0.12, roll: true },
};

type ModeName = 'major' | 'lydian' | 'dorian' | 'minor' | 'harmonic' | 'phrygian';

const MODES: Readonly<Record<ModeName, readonly number[]>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

const STRONG: Readonly<Record<number, readonly number[]>> = {
  3: [0],
  4: [0, 2],
  5: [0, 3],
  6: [0, 3],
  7: [0, 4],
  9: [0, 3, 6],
};

export type VoiceName =
  | 'piano'
  | 'violin'
  | 'cello'
  | 'strings'
  | 'lowstring'
  | 'glass'
  | 'celesta'
  | 'musicbox'
  | 'flute'
  | 'organ'
  | 'horn'
  | 'hum'
  | 'choir'
  | 'bell'
  | 'metal';

interface VoiceNote {
  readonly bus: BusName;
  readonly midi: number;
  readonly when: number;
  readonly len: number;
  readonly gain: number;
  readonly light?: boolean;
}

interface VoiceDef {
  readonly low: number;
  readonly also?: number;
  play(k: SynthKit, n: VoiceNote): void;
}

interface BowedOptions {
  readonly gain: number;
  readonly attack: number;
  readonly decay?: number;
  readonly bright: number;
  readonly top: number;
  readonly spread?: number;
  readonly one?: boolean;
  readonly vibrato?: readonly [number, number];
}

function bowed(k: SynthKit, n: VoiceNote, o: BowedOptions): void {
  const freq = mtof(n.midi);
  const loud = o.vibrato ? clamp((400 / freq) ** 0.25, 0.8, 1.3) : 1;
  const pairs: readonly (readonly [number, number])[] = o.one
    ? [[0, 0.8]]
    : [
        [0, 0.67],
        [o.spread ?? 6, 0.33],
      ];
  for (const [detune, share] of pairs) {
    k.tone({
      bus: n.bus,
      type: 'sawtooth',
      freq,
      detune,
      when: n.when,
      gain: o.gain * share * loud * n.gain,
      attack: o.attack,
      hold: Math.max(0.1, n.len - (o.vibrato ? 0.4 : 0.3)),
      decay: o.decay ?? 1.5,
      cutoff: Math.min(o.top, freq * o.bright),
      vibrato: o.vibrato ? { rate: o.vibrato[0], depth: o.vibrato[1], delay: 0.45 } : undefined,
    });
  }
}

export const VOICES: Readonly<Record<VoiceName, VoiceDef>> = {
  piano: {
    low: 40,
    play(k, n) {
      k.piano(mtof(n.midi), {
        bus: n.bus,
        when: n.when + rand(0, 0.02),
        gain: 0.14 * n.gain,
        strings: n.light ? 1 : 2,
        ring: n.light ? 0.7 : 1,
      });
    },
  },
  violin: {
    low: 55,
    play(k, n) {
      bowed(k, n, { gain: 0.08, attack: 0.5, bright: 3, top: 2200, vibrato: [5.2, 12] });
    },
  },
  cello: {
    low: 36,
    play(k, n) {
      bowed(k, n, { gain: 0.085, attack: 0.55, bright: 2.6, top: 1400, vibrato: [4.7, 10] });
    },
  },
  strings: {
    low: 48,
    also: -12,
    play(k, n) {
      bowed(k, n, { gain: 0.05, attack: 0.45, bright: 2.2, top: 1400, vibrato: [5.2, 10], one: true });
      bowed(k, { ...n, midi: n.midi - 12 }, { gain: 0.055, attack: 0.5, bright: 2.4, top: 1000, vibrato: [4.7, 8], one: true });
    },
  },
  lowstring: {
    low: 28,
    play(k, n) {
      bowed(k, n, { gain: 0.04, attack: 0.14, decay: 0.7, bright: 4, top: 700, spread: 8, one: n.light });
    },
  },
  glass: {
    low: 55,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.06 * n.gain * Math.min(1, Math.sqrt(660 / freq));
      const pan = rand(-0.3, 0.3);
      const ring = clamp(n.len * 1.7, 1.8, 3.6);
      k.tone({ bus: n.bus, freq, when: n.when, pan, attack: 0.05, decay: ring, gain });
      if (freq * 3 < 4200) {
        k.tone({ bus: n.bus, freq: freq * 3.01, when: n.when, pan, attack: 0.08, decay: ring * 0.4, gain: gain * 0.12 });
      }
    },
  },
  celesta: {
    low: 60,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.065 * n.gain * Math.min(1, Math.sqrt(784 / freq));
      const base = { bus: n.bus, when: n.when + rand(0, 0.015), attack: 0.007, pan: rand(-0.25, 0.25) };
      k.tone({ ...base, freq, decay: 1.8, gain });
      k.tone({ ...base, freq: freq * 2, decay: 0.7, gain: gain * 0.25 });
      if (freq * 4.2 < 4200) k.tone({ ...base, freq: freq * 4.2, decay: 0.22, gain: gain * 0.06 });
    },
  },
  musicbox: {
    low: 67,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.06 * n.gain * Math.min(1, Math.sqrt(1000 / freq));
      const base = { bus: n.bus, when: n.when + rand(0, 0.02), attack: 0.003 };
      k.tone({ ...base, type: 'triangle', freq, detune: rand(-8, 8), decay: 1.3, gain });
      if (freq * 4 < 4200) k.tone({ ...base, freq: freq * 4, decay: 0.3, gain: gain * 0.12 });
    },
  },
  flute: {
    low: 60,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.07 * n.gain * Math.min(1, Math.sqrt(700 / freq));
      const hold = Math.max(0.1, n.len - 0.25);
      k.tone({
        bus: n.bus,
        wave: k.waves.flute,
        freq,
        when: n.when,
        gain,
        attack: 0.09,
        hold,
        decay: 0.5,
        vibrato: { rate: 4.6, depth: 8, delay: 0.35 },
      });
      k.noise({ bus: n.bus, freq: freq * 1.5, q: 3, when: n.when, attack: 0.07, hold: hold * 0.5, decay: 0.5, gain: gain * 0.04 });
    },
  },
  organ: {
    low: 43,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.05 * n.gain * Math.min(1, Math.sqrt(520 / freq));
      k.tone({
        bus: n.bus,
        wave: k.waves.organ,
        freq,
        when: n.when,
        gain,
        attack: 0.08,
        hold: Math.max(0.1, n.len - 0.1),
        decay: 0.6,
        cutoff: Math.min(2400, freq * 4),
      });
    },
  },
  horn: {
    low: 36,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.07 * n.gain * clamp((200 / freq) ** 0.25, 0.8, 1.25);
      const env = { bus: n.bus, freq, when: n.when, attack: 0.14, hold: Math.max(0.1, n.len - 0.3), decay: 0.6 };
      k.tone({ ...env, type: 'sawtooth', gain: gain * 0.55, cutoff: freq * 1.5, cutoffTo: Math.min(1100, freq * 3.2), glide: 0.35 });
      k.tone({ ...env, type: 'triangle', gain: gain * 0.6 });
    },
  },
  hum: {
    low: 48,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.07 * n.gain;
      const env = {
        bus: n.bus,
        freq,
        when: n.when,
        attack: 0.3,
        hold: Math.max(0.1, n.len - 0.35),
        decay: 0.7,
        vibrato: { rate: 5, depth: 16, delay: 0.3 },
      };
      k.tone({ ...env, type: 'sawtooth', gain: gain * 0.45, cutoff: Math.min(1000, freq * 3), formant: [480, 8, 2] });
      k.tone({ ...env, gain: gain * 0.7 });
    },
  },
  choir: {
    low: 55,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.05 * n.gain * Math.min(1, Math.sqrt(520 / freq));
      for (const detune of [-9, 0, 8]) {
        k.tone({
          bus: n.bus,
          type: 'sawtooth',
          freq,
          detune,
          pan: detune / 20,
          when: n.when,
          gain: gain * 0.4,
          attack: 0.8,
          hold: Math.max(0.2, n.len - 0.6),
          decay: 1.8,
          cutoff: Math.min(2600, freq * 4),
          formant: [950, 7, 1.4],
        });
      }
    },
  },
  bell: {
    low: 45,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.1 * n.gain;
      const base = { bus: n.bus, when: n.when, attack: 0.012 };
      k.tone({ ...base, freq, decay: 4.2, gain });
      k.tone({ ...base, freq: freq * 2.76, decay: 1.6, gain: gain * 0.18 });
      k.tone({ ...base, freq: freq / 2, decay: 5, gain: gain * 0.3 });
    },
  },
  metal: {
    low: 47,
    play(k, n) {
      const freq = mtof(n.midi);
      const gain = 0.05 * n.gain * Math.min(1, Math.sqrt(440 / freq));
      const pan = rand(-0.4, 0.4);
      const part = (ratio: number, share: number, detune = 0): void => {
        if (freq * ratio < 4200) {
          k.tone({
            bus: n.bus,
            freq: freq * ratio,
            detune,
            when: n.when,
            pan,
            gain: gain * share,
            attack: 1.2,
            hold: Math.max(0.2, n.len - 1),
            decay: 3.2,
          });
        }
      };
      part(1, 1);
      part(1, 0.6, 7);
      part(2.76, 0.16);
      part(5.4, 0.04);
    },
  },
};

type BedName = 'strings' | 'high' | 'drone' | 'choir' | 'organ' | 'glass' | 'void';

interface BedContext {
  readonly root: number;
  readonly chord: ChordDef;
  readonly bass: number;
  readonly t0: number;
  readonly span: number;
  readonly swell: number;
  readonly tail: number;
  readonly thin: boolean;
  readonly sounding: number[];
}

function sustain(k: SynthKit, b: BedContext, midi: number, o: Omit<ToneOptions, 'freq'>): void {
  b.sounding.push(midi);
  k.tone({
    bus: 'pad',
    freq: mtof(midi),
    when: b.t0,
    attack: b.swell,
    hold: b.span - b.swell + 0.5,
    decay: b.tail,
    ...o,
  });
}

export const BEDS: Readonly<Record<BedName, (k: SynthKit, b: BedContext) => void>> = {
  strings(k, b) {
    for (const offset of b.chord.pad) {
      for (const detune of b.thin ? [0] : [-7, 7]) {
        sustain(k, b, b.root + offset, { type: 'sawtooth', detune, gain: 0.028 });
      }
    }
  },
  high(k, b) {
    b.chord.pad.forEach((offset, i) => {
      if (!(b.thin && i === 0)) {
        sustain(k, b, b.root + offset + 12, { type: 'sawtooth', detune: 4 * i - 4, gain: 0.032 });
      }
    });
  },
  drone(k, b) {
    for (const up of b.thin ? [0, 7] : [0, 7, 12]) {
      for (const detune of b.thin ? [0] : [-5, 5]) {
        sustain(k, b, b.bass + up, { type: 'sawtooth', detune, gain: 0.026 });
      }
    }
  },
  choir(k, b) {
    for (const offset of b.chord.pad) {
      for (const detune of b.thin ? [0] : [-6, 6]) {
        sustain(k, b, b.root + offset, { type: 'sawtooth', detune, gain: 0.023, formant: [560, 7, 1.4] });
      }
    }
  },
  organ(k, b) {
    const pipes: BedContext = { ...b, swell: Math.min(b.swell, 0.4), tail: Math.min(b.tail, 1.6) };
    sustain(k, pipes, b.bass, { wave: k.waves.organ, gain: 0.025 });
    b.chord.pad.forEach((offset, i) => {
      if (!(b.thin && i === 0)) {
        sustain(k, pipes, b.root + offset, { wave: k.waves.organ, gain: 0.017 });
      }
    });
  },
  glass(k, b) {
    for (const offset of b.chord.pad) {
      for (const detune of b.thin ? [0] : [-4, 4]) {
        sustain(k, b, b.root + offset + 12, { detune, gain: 0.021 });
      }
    }
  },
  void(k, b) {
    for (const up of [0, 7]) {
      for (const detune of b.thin ? [0] : [-4, 4]) {
        sustain(k, b, b.bass + up, { type: 'triangle', detune, gain: 0.027 });
      }
    }
    for (const offset of b.chord.pad.slice(b.thin ? 2 : 1)) {
      sustain(k, b, fold(b.root + offset, 79), { detune: 5, gain: 0.008 });
    }
  },
};

type FigureName = 'still' | 'bass' | 'root' | 'star' | 'tread' | 'cradle' | 'pedal' | 'surge' | 'orbit';

type FigureBeat = readonly [number, string, number?, number?];

interface FigureDef {
  readonly voice: VoiceName;
  readonly on: 'chord' | 'phrase' | 'bar';
  readonly light?: boolean;
  readonly bars: readonly (readonly FigureBeat[])[];
}

export const FIGURES: Readonly<Record<FigureName, FigureDef | null>> = {
  still: null,
  bass: { voice: 'piano', on: 'chord', bars: [[[0, 'bass', 4, 0.85]]] },
  root: { voice: 'piano', on: 'phrase', bars: [[[0, 'bass', 4, 0.85]]] },
  star: { voice: 'celesta', on: 'phrase', bars: [[[5, 'top+24', 2, 0.7]]] },
  tread: {
    voice: 'lowstring',
    on: 'bar',
    bars: [
      [
        [0, 'bass', 3],
        [3, 'bass', 2, 0.8],
      ],
    ],
  },
  cradle: {
    voice: 'lowstring',
    on: 'bar',
    light: true,
    bars: [
      [
        [0, 'bass', 3],
        [3, 'bass+7', 3, 0.85],
      ],
    ],
  },
  pedal: { voice: 'lowstring', on: 'bar', bars: [[[0, 'bass', 4]]] },
  surge: {
    voice: 'lowstring',
    on: 'bar',
    light: true,
    bars: [
      [
        [0, 'low', 3, 0.8],
        [3, 'mid', 3, 0.9],
        [6, 'top', 3, 1],
      ],
      [
        [0, 'top', 3, 1],
        [3, 'mid', 3, 0.9],
        [6, 'low', 3, 0.8],
      ],
    ],
  },
  orbit: {
    voice: 'glass',
    on: 'bar',
    bars: [
      [
        [0, 'low+12', 1, 0.6],
        [1, 'mid+12', 1, 0.6],
        [2, 'top+12', 1, 0.6],
      ],
      [
        [0, 'mid+24', 1, 0.6],
        [1, 'top+12', 1, 0.6],
        [2, 'mid+12', 1, 0.6],
      ],
    ],
  },
};

interface VoicePart {
  readonly voice: VoiceName;
  readonly at: number;
}

type PartSpec = readonly [VoiceName, number] | VoicePart;

interface TuneNote {
  readonly at: number;
  readonly len: number;
  readonly degree: number;
  readonly sharp: number;
}

export interface PreparedPhrase {
  readonly chords: readonly ChordName[];
  readonly spans: readonly number[];
  readonly bars: readonly (readonly TuneNote[])[];
  readonly who?: number;
}

interface ElderOverlay {
  readonly chords: readonly ChordName[];
  readonly notes: readonly number[];
  readonly five: readonly number[];
}

interface RawElderOverlay {
  readonly mode: ModeName;
  readonly chords: readonly ChordName[];
}

type ThemeLine = readonly [string, string, number?];

interface RawRageOverride {
  readonly beat?: number;
  readonly drum?: readonly number[];
  readonly deep?: boolean;
  readonly double?: PartSpec;
}

interface RawPieceRow {
  readonly root: number;
  readonly mode: ModeName;
  readonly meter: number;
  readonly beat: number;
  readonly lead?: PartSpec;
  readonly second?: PartSpec | null;
  readonly double?: PartSpec | null;
  readonly bed: BedName;
  readonly pad?: number;
  readonly figure?: FigureName | readonly FigureName[];
  readonly bassFloor?: number;
  readonly theme?: readonly ThemeLine[];
  readonly tense?: readonly ChordName[];
  readonly elder?: RawElderOverlay;
  readonly drum?: readonly number[];
  readonly deep?: boolean;
  readonly wash?: number;
  readonly echo?: readonly [number, number];
  readonly rage?: RawRageOverride | null;
  readonly wind?: number;
  readonly birds?: number;
  readonly crickets?: number;
}

export interface PreparedPiece {
  readonly root: number;
  readonly notes: readonly number[];
  readonly five: readonly number[];
  readonly meter: number;
  readonly strong: readonly number[];
  readonly beat: number;
  readonly lead: VoicePart;
  readonly second: VoicePart | null;
  readonly double: VoicePart | null;
  readonly bed: BedName;
  readonly pad: number;
  readonly figure?: FigureName | readonly FigureName[];
  readonly bassFloor: number;
  readonly phrases: readonly PreparedPhrase[];
  readonly home: ChordName;
  readonly tense: readonly ChordName[];
  readonly elder: ElderOverlay | null;
  readonly drum?: readonly number[];
  readonly deep?: boolean;
  readonly wash?: number;
  readonly echo?: readonly [number, number];
  readonly step: number;
  readonly breath: number;
  readonly fury: PreparedPiece | null;
  readonly wind: number;
  readonly birds: number;
  readonly crickets: number;
}

function readTune(text: string | undefined, meter: number): TuneNote[][] {
  return String(text ?? '')
    .split('|')
    .map((bar) => {
      const notes: TuneNote[] = [];
      let at = 0;
      for (const word of bar.trim().split(/\s+/)) {
        const m = /^([b#]?)(\d+|-)(,*)(?::(\d*\.?\d+))?$/.exec(word);
        if (!m) continue;
        const len = m[4] ? Number(m[4]) : 1;
        if (m[2] !== '-' && at < meter) {
          notes.push({
            at,
            len,
            degree: Number(m[2]) - 1 - 7 * m[3].length,
            sharp: m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0,
          });
        }
        at += len;
      }
      return notes;
    });
}

function toPart(p: PartSpec | null | undefined): VoicePart | null {
  if (!p) return null;
  return Array.isArray(p) ? { voice: p[0], at: p[1] } : (p as VoicePart);
}

function prepare(row: RawPieceRow): PreparedPiece {
  const notes = lookup(MODES, row.mode, MODES.major);
  const five = notes.includes(4) ? MAJOR : MINOR;
  const meter = row.meter > 0 ? Math.round(row.meter) : 4;
  const strong = lookup(STRONG, String(meter), [0]);
  const lead = toPart(row.lead) || { voice: 'piano', at: 60 };
  const second = toPart(row.second);
  const double = toPart(row.double);
  const phrases: PreparedPhrase[] = (row.theme || []).map(([chordsText, tune, who]) => {
    const chords: ChordName[] = [];
    const spans: number[] = [];
    let lastChordIdx = 0;
    String(chordsText)
      .trim()
      .split(/\s+/)
      .forEach((name, i) => {
        const held = name === '.' && i > 0;
        chords.push(held ? chords[i - 1] : Object.hasOwn(CHORDS, name) ? (name as ChordName) : 'Isus');
        spans.push(held ? 0 : 1);
        if (held) spans[lastChordIdx]++;
        else lastChordIdx = i;
      });
    return { chords, spans, bars: readTune(tune, meter), who };
  });
  const home: ChordName = phrases.length ? phrases[0].chords[0] : 'Isus';
  const tense: readonly ChordName[] = row.tense && row.tense.length ? row.tense : [home];
  let elder: ElderOverlay | null = null;
  if (row.elder) {
    const elderNotes = lookup(MODES, row.elder.mode, MODES.minor);
    elder = {
      chords: row.elder.chords,
      notes: elderNotes,
      five: elderNotes.includes(4) ? MAJOR : MINOR,
    };
  }
  const step = Math.min((((meter % 3 === 0 && meter > 3 ? 3 : 1) * row.beat) / 2), ANSWER_STEP);
  const breath =
    (phrases.reduce((bars, phrase) => bars + phrase.chords.length, 0) / Math.max(1, phrases.length)) *
    meter *
    row.beat;
  const fury = row.rage ? prepare({ ...row, ...row.rage, rage: null }) : null;

  return {
    root: row.root,
    notes,
    five,
    meter,
    strong,
    beat: row.beat,
    lead,
    second,
    double,
    bed: row.bed,
    pad: row.pad ?? 800,
    figure: row.figure,
    bassFloor: row.bassFloor ?? 36,
    phrases,
    home,
    tense,
    elder,
    drum: row.drum,
    deep: row.deep,
    wash: row.wash,
    echo: row.echo,
    step,
    breath,
    fury,
    wind: row.wind ?? 0,
    birds: row.birds ?? 0,
    crickets: row.crickets ?? 0,
  };
}

const RAW_AREAS: Readonly<Record<BiomeId, RawPieceRow>> = {
  town: {
    root: 50,
    mode: 'major',
    meter: 4,
    beat: 1.08,
    lead: ['piano', 62],
    second: ['violin', 62],
    bed: 'strings',
    pad: 800,
    figure: 'bass',
    bassFloor: 40,
    theme: [
      ['I . IV .', '5 10 9:2 | 8:2 5:2 | 6:4'],
      ['I . Vsus .', '5 10 9:2 | 8:2 10:2 | 9:4'],
      ['vi . IV .', '10:3 9 | 8:2 6:2 | 8:4', 2],
      ['I Vsus I .', '5 10 9:2 | 8:2 9:2 | 8:4'],
    ],
    tense: ['vi', 'ii', 'Vsus'],
    wind: 0.5,
    birds: 1.1,
    crickets: 0,
  },
  glasswood: {
    root: 53,
    mode: 'lydian',
    meter: 6,
    beat: 0.32,
    lead: ['celesta', 77],
    bed: 'glass',
    pad: 1400,
    figure: 'still',
    bassFloor: 41,
    theme: [
      ['I . . . II/I . . .', '1:2 2 3:3 | 5:6 | 4:2 3 2:3'],
      ['I . . . vi . . .', '1:2 2 3:3 | 6:6 | 5:2 4 3:3'],
      ['II/I . . . I . . .', '2:2 3 4:3 | 6:6 | 4:2 3 2:3'],
      ['vi . . . I . . .', '6,:2 1 3:3 | 5:6 | 3:2 2 1:3'],
    ],
    tense: ['vi', 'iii', 'II'],
    elder: { mode: 'minor', chords: ['i', 'VI', 'iv', 'VII'] },
    wind: 0.6,
    birds: 1.5,
    crickets: 0,
  },
  ember: {
    root: 46,
    mode: 'dorian',
    meter: 3,
    beat: 1.3,
    lead: ['cello', 58],
    bed: 'drone',
    pad: 620,
    figure: 'bass',
    bassFloor: 36,
    theme: [
      ['i . IV . . .', '1 5:2 | 4 3:2 | 2:3'],
      ['i . VII . . .', '1 5:2 | 6 5:2 | 4:3'],
      ['IV . i . . .', '6, 4:2 | 2 1:2 | 5,:3'],
      ['v . i . . .', '5, 2:2 | 7, 5,:2 | 1:3'],
    ],
    tense: ['i', 'v', 'VII'],
    elder: { mode: 'minor', chords: ['i', 'vii', 'iv', 'VI'] },
    wind: 1,
    birds: 0.2,
    crickets: 0.6,
  },
  hush: {
    root: 51,
    mode: 'minor',
    meter: 5,
    beat: 1.42,
    lead: ['glass', 75],
    bed: 'choir',
    pad: 680,
    figure: 'root',
    bassFloor: 39,
    theme: [
      ['i . VI .', '5:3 3:2 | 4:3 2:2 | 1:5'],
      ['iv . i .', '6:3 4:2 | 5:3 3:2 | 2:5'],
      ['VI . VII .', '3:3 1:2 | 2:3 7,:2 | 2:5'],
      ['Isus . i .', '5,:3 2:2 | 1:3 7,:2 | 1:5'],
    ],
    tense: ['i', 'iv', 'VI'],
    elder: { mode: 'minor', chords: ['i', 'iv', 'vii', 'VI'] },
    wind: 0.35,
    birds: 0,
    crickets: 1.2,
  },
  rime: {
    root: 52,
    mode: 'major',
    meter: 3,
    beat: 1.05,
    lead: ['flute', 76],
    bed: 'high',
    pad: 980,
    figure: 'still',
    bassFloor: 40,
    theme: [
      ['I . . . vi . . .', '5,:2 1 | 3:3 | 2:2 7, | 5,:3'],
      ['IV . . . I . . .', '6,:2 1 | 4:3 | 3:2 1 | 2:3'],
      ['vi . . . Vsus . . .', '8:2 7 | 5:3 | 6:2 5 | 3:3'],
      ['Isus . . . I . . .', '5,:2 1 | 2:3 | 5:2 3 | 1:3'],
    ],
    tense: ['vi', 'iii', 'ii'],
    elder: { mode: 'minor', chords: ['i', 'III', 'VI', 'v'] },
    wind: 1.15,
    birds: 0.2,
    crickets: 0,
  },
  vault: {
    root: 48,
    mode: 'minor',
    meter: 4,
    beat: 1.5,
    lead: ['organ', 72],
    bed: 'organ',
    pad: 700,
    figure: 'still',
    bassFloor: 36,
    theme: [
      ['i iv VII III VI iv v i', '1:2 3:2 | 4:2 3:2 | 2:2 4:2 | 3:4 | - | - | 2:4 | 1:4'],
      ['i VI III VII iv i v i', '5:2 3:2 | 6:2 5:2 | 5:2 3:2 | 4:4 | - | - | 2:4 | 1:4'],
    ],
    tense: ['i', 'iv', 'vii'],
    elder: { mode: 'phrygian', chords: ['i', 'vii', 'iv', 'VI'] },
    wind: 0.25,
    birds: 0,
    crickets: 0,
  },
  shatter: {
    root: 47,
    mode: 'lydian',
    meter: 7,
    beat: 1.5,
    lead: ['metal', 59],
    bed: 'void',
    pad: 1500,
    figure: 'star',
    bassFloor: 35,
    theme: [
      ['Isus .', '1:4 5:3 | 9:7'],
      ['II/I .', '11:4 9:3 | 6:7'],
      ['VI .', '8:4 5:3 | 2:7'],
      ['I .', '5,:4 3:3 | 8:7'],
    ],
    tense: ['Isus', 'VI', 'III'],
    elder: { mode: 'minor', chords: ['i', 'VI', 'iv', 'VII'] },
    wind: 0.12,
    birds: 0,
    crickets: 0,
  },
  bloomfall: {
    root: 55,
    mode: 'major',
    meter: 3,
    beat: 1.0,
    lead: ['piano', 66],
    second: ['violin', 64],
    bed: 'strings',
    pad: 900,
    figure: 'still',
    bassFloor: 41,
    theme: [
      ['I . . . IV . . .', '3:2 5 | 8:3 | 6:2 5 | 3:3'],
      ['vi . . . Vsus . . .', '3:2 5 | 6:3 | 5:2 3 | 2:3'],
      ['IV . . . I . . .', '4:2 6 | 8:3 | 7:2 5 | 6:3'],
      ['ii . . . I . . .', '2:2 4 | 6:3 | 5:2 2 | 1:3'],
    ],
    tense: ['vi', 'ii', 'IV'],
    elder: { mode: 'minor', chords: ['i', 'VI', 'III', 'VII'] },
    wind: 0.5,
    birds: 1.4,
    crickets: 0,
  },
  saltglass: {
    root: 50,
    mode: 'dorian',
    meter: 4,
    beat: 1.2,
    lead: ['piano', 62],
    bed: 'glass',
    pad: 1200,
    figure: 'still',
    bassFloor: 38,
    theme: [
      ['i . IV .', '1 5 4:2 | 3:2 1:2 | 2:4'],
      ['i . VII .', '1 5 6:2 | 5:2 4:2 | 5:4'],
      ['IV . i .', '6 4 3:2 | 2:2 1:2 | 5,:4'],
      ['v . i .', '5, 2 4:2 | 3:2 2:2 | 1:4'],
    ],
    tense: ['i', 'v', 'VII'],
    elder: { mode: 'minor', chords: ['i', 'iv', 'VI', 'v'] },
    wind: 1.0,
    birds: 0.15,
    crickets: 0,
  },
  amberwood: {
    root: 52,
    mode: 'major',
    meter: 3,
    beat: 1.15,
    lead: ['violin', 62],
    second: ['piano', 62],
    bed: 'strings',
    pad: 760,
    figure: 'bass',
    bassFloor: 38,
    theme: [
      ['I . vi . . .', '5 3:2 | 2 1:2 | 2:3'],
      ['IV . I . . .', '6 5:2 | 4 3:2 | 5:3'],
      ['vi . IV . . .', '3 6:2 | 5 4:2 | 3:3'],
      ['ii . Vsus . . .', '4 2:2 | 7, 2:2 | 1:3'],
    ],
    tense: ['vi', 'ii', 'iii'],
    elder: { mode: 'minor', chords: ['i', 'iv', 'VII', 'III'] },
    wind: 0.7,
    birds: 0.8,
    crickets: 0.4,
  },
};

const RAW_BOSSES: Readonly<Record<BossId, RawPieceRow>> = {
  warden: {
    root: 37,
    mode: 'phrygian',
    meter: 5,
    beat: 1.1,
    lead: ['horn', 49],
    bed: 'drone',
    pad: 520,
    figure: 'tread',
    bassFloor: 30,
    drum: [0.06, 0, 0, 0.035, 0],
    deep: true,
    theme: [
      ['i . bII i . .', '1:3 5,:2 | 1:3 3:2 | 4:3 2:2 | 1:5'],
      ['i . vii i . .', '5:3 3:2 | 4:3 1:2 | 7,:3 2:2 | 1:5'],
    ],
    rage: { beat: 0.95, drum: [0.065, 0, 0, 0.04, 0.03], double: ['cello', 61] },
  },
  matron: {
    root: 45,
    mode: 'harmonic',
    meter: 6,
    beat: 0.48,
    lead: ['hum', 57],
    second: ['musicbox', 69],
    bed: 'strings',
    pad: 560,
    figure: 'cradle',
    bassFloor: 40,
    theme: [
      ['i . iv i . .', '5:2 3 5:3 | 8:4 7:2 | 6:2 4 6:3 | 5:6'],
      ['i . V i . .', '5:2 3 5:3 | 8:4 9:2 | 9:2 7 9:3 | 8:6', 2],
    ],
    rage: { beat: 0.41, drum: [0.045, 0, 0, 0, 0, 0], double: ['musicbox', 69] },
  },
  sentinel: {
    root: 48,
    mode: 'dorian',
    meter: 9,
    beat: 0.4,
    lead: ['strings', 60],
    bed: 'strings',
    pad: 700,
    figure: 'surge',
    bassFloor: 36,
    drum: [0.05, 0, 0, 0, 0, 0, 0, 0, 0],
    deep: true,
    wash: 0.035,
    theme: [
      ['i . VII . . .', '1:3 3:3 5:3 | 8:9 | 7:6 6:3 | 4:9'],
      ['i . IV i . .', '1:3 3:3 5:3 | 8:6 10:3 | 8:6 6:3 | 5:9'],
    ],
    rage: { beat: 0.34, drum: [0.06, 0, 0, 0, 0, 0, 0.035, 0, 0], double: ['horn', 48] },
  },
  keeper: {
    root: 38,
    mode: 'minor',
    meter: 4,
    beat: 1.4,
    lead: ['bell', 62],
    echo: [0.45, 0.3],
    bed: 'choir',
    pad: 620,
    figure: 'pedal',
    bassFloor: 31,
    drum: [0.06, 0, 0.035, 0],
    deep: true,
    theme: [
      ['i . VI VII', '1:4 | 3:2 2:2 | 3:4 | 5:4'],
      ['iv . i .', '5:2 4:2 | 3:4 | 2:2 1:2'],
    ],
    rage: { beat: 1.15, drum: [0.065, 0, 0.035, 0.03], double: ['organ', 62] },
  },
  drifter: {
    root: 54,
    mode: 'lydian',
    meter: 3,
    beat: 1.35,
    lead: ['choir', 66],
    bed: 'void',
    pad: 1500,
    figure: 'orbit',
    bassFloor: 35,
    theme: [
      ['I . II/I .', '5,:3 | 5:3 | 4:3 | 3:3'],
      ['vi . VI I', '3:3 | 6:3 | 5:6'],
      ['I . II/I .', '8:3 | 5:3 | 6:3 | 9:3'],
      ['vi . VI I', '8:3 | 10:3 | 8:6'],
    ],
    rage: { beat: 1.12, drum: [0.05, 0, 0.025], deep: true, double: ['horn', 54] },
  },
};

export const AREAS: Readonly<Record<BiomeId, PreparedPiece>> = {
  town: prepare(RAW_AREAS.town),
  glasswood: prepare(RAW_AREAS.glasswood),
  ember: prepare(RAW_AREAS.ember),
  hush: prepare(RAW_AREAS.hush),
  rime: prepare(RAW_AREAS.rime),
  vault: prepare(RAW_AREAS.vault),
  shatter: prepare(RAW_AREAS.shatter),
  bloomfall: prepare(RAW_AREAS.bloomfall),
  saltglass: prepare(RAW_AREAS.saltglass),
  amberwood: prepare(RAW_AREAS.amberwood),
};

export const BOSSES: Readonly<Record<BossId, PreparedPiece>> = {
  warden: prepare(RAW_BOSSES.warden),
  matron: prepare(RAW_BOSSES.matron),
  sentinel: prepare(RAW_BOSSES.sentinel),
  keeper: prepare(RAW_BOSSES.keeper),
  drifter: prepare(RAW_BOSSES.drifter),
};

export const areaOf = (game: GameContext): PreparedPiece =>
  lookup(AREAS, game.biome && game.biome.id, AREAS.town);

export type StanceName = 'calm' | 'tense' | 'elder' | 'rage';

interface CalmStance {
  readonly pace: number;
  readonly written: true;
}

export interface FightStance {
  readonly pace: number;
  readonly written?: false;
  readonly bars: number;
  readonly drop: number;
  readonly space: number;
  readonly left: number;
  readonly octave?: boolean;
  readonly drum: readonly [number, number];
  readonly deep?: boolean;
  readonly drone?: boolean;
  readonly toll?: number;
}

export const STANCES: {
  readonly calm: CalmStance;
  readonly tense: FightStance;
  readonly elder: FightStance;
  readonly rage: FightStance;
} = {
  calm: { pace: 1, written: true },
  tense: { pace: 0.92, bars: 1, drop: 4, space: 1.15, left: 0.15, drum: [0.05, 0] },
  elder: {
    pace: 1.06,
    bars: 2,
    drop: 7,
    space: 1.3,
    left: 0.16,
    octave: true,
    drum: [0.055, 0.03],
    deep: true,
    drone: true,
    toll: 0.05,
  },
  rage: {
    pace: 0.86,
    bars: 1,
    drop: 7,
    space: 1.3,
    left: 0.16,
    octave: true,
    drum: [0.055, 0.03],
    deep: true,
    drone: true,
    toll: 0.05,
  },
};
