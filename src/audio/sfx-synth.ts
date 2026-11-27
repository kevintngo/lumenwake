/**
 * Rebuilds the game's sound effects from their spectral sketches (sfx-sketches.ts), so no sound file is fetched.
 *
 * A sketch holds, at key frames on a 2.5 ms grid:
 *   - the loudness of its noise in three groups of bands (low, middle, high),
 *   - the noise's shape: how each group's loudness is shared among its third-octave bands (27 in all, 20 Hz to
 *     11.5 kHz),
 *   - up to ten steady tones (partials): a pitch and a level each,
 *   - a buzz: the harmonics of one pitch, with the noise's shape, taking some of each group's loudness.
 * The noise is made frame by frame as spectra of that shape with seeded random phases, in three groups of bands
 * each with frames of its own length (see GROUPS), and each group is given its loudness sample by sample; the buzz is
 * its harmonics added up sample by sample; each partial is a sine. Levels go in straight lines in dB
 * between key frames, pitches in straight lines in octaves.
 *
 * tools/sfx-sketch.mjs writes the sketches from recordings and measures this same code against them, so what the
 * tool hears is what the game plays. Keep this file free of imports and of TypeScript that is more than type
 * annotations: the tool loads it directly with Node.
 */

export const SFX_RATE = 24000;
/** Third-octave bands, from 20 Hz to 11.5 kHz. */
export const BANDS = 27;
export const F_LO = 20;
export const F_HI = 11500;
/** Samples per step of the key-frame grid (2.5 ms). */
export const FINE = 60;
/** Decibels per level code; code 0 is 94.5 dB under code 63. */
export const STEP_DB = 1.5;
/** Partial pitches: steps per octave above FREQ_BASE (two characters, so up to 4095). */
export const FREQ_STEPS = 384;
export const FREQ_BASE = 20;
/** One character per six bits: digits, letters, '-' and '_' (nothing that needs escaping in a string). */
export const CODES = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
/**
 * The noise is made in three groups of bands, each in frames that suit it: long ones for the low bands (to tell
 * them apart), short ones for the high bands (to keep a blow sharp). `from` is the group's first band; frames start
 * every quarter frame. The sketch tool measures each group with the same frames, from the recording split at the
 * same edges.
 */
export const GROUPS: readonly { readonly frame: number; readonly from: number }[] = [
  { frame: 1024, from: 0 },
  { frame: 256, from: 11 },
  { frame: 128, from: 20 },
];
const RATIO = (F_HI / F_LO) ** (1 / BANDS);
const FADE_IN = 48;

export interface Sketch {
  /** Length in samples at SFX_RATE. */
  readonly n: number;
  /** The loudest level in the sketch, dB: level code 63 means this. */
  readonly ref: number;
  /** The first and last band with any noise in them (the others have none throughout). */
  readonly b0: number;
  readonly b1: number;
  /** Partial slots. */
  readonly k: number;
  /** Loudness of the noise (power, dB): key frames of a step count since the last one and a level code per group. */
  readonly e: string;
  /** Shape of the noise: key frames of a step count and, per band b0..b1, its share of its group's loudness (63 is all). */
  readonly s: string;
  /** Partials, one string per slot (joined by commas): key frames of a step count, two pitch codes and a level code (amplitude, dB; 0 is off). */
  readonly p: string;
  /**
   * A buzz (the harmonics of one pitch, shaped like the noise): key frames of a step count, two pitch codes and, per
   * group, how much of the group's loudness is the buzz rather than the noise (63 is all of it). Empty for none.
   */
  readonly h?: string;
  /** For a sound that loops: samples of its end crossfaded into its start (the result is that much shorter). */
  readonly loop?: number;
}

/** The lower edge of band b (b = BANDS is the top edge). */
export const bandEdge = (b: number): number => F_LO * RATIO ** b;
export const bandCenter = (b: number): number => F_LO * RATIO ** (b + 0.5);

/** A small seeded generator (mulberry32), uniform in [0, 1). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The seed a sound's noise is made from: its name, hashed (FNV-1a). */
export function seedOf(name: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Key frames read from one of a sketch's strings: the step of each, and `width` codes per frame. */
export function readFrames(text: string, width: number): { at: Int32Array; codes: Uint8Array } {
  const per = 1 + width;
  const count = Math.floor(text.length / per);
  const at = new Int32Array(count);
  const codes = new Uint8Array(count * width);
  let step = 0;
  for (let j = 0; j < count; j++) {
    step += CODES.indexOf(text[j * per]);
    at[j] = step;
    for (let w = 0; w < width; w++) codes[j * width + w] = CODES.indexOf(text[j * per + 1 + w]);
  }
  return { at, codes };
}

/**
 * Levels on the step grid (steps + 1 of them) from key frames: straight lines in dB, -Infinity where both ends of a
 * stretch are code 0. `dbOf` turns a code into dB.
 */
export function levelGrid(
  at: Int32Array,
  codes: Uint8Array,
  width: number,
  offset: number,
  steps: number,
  dbOf: (code: number) => number,
): Float32Array {
  const out = new Float32Array(steps + 1).fill(-Infinity);
  for (let j = 0; j + 1 < at.length; j++) {
    const ca = codes[j * width + offset];
    const cb = codes[(j + 1) * width + offset];
    if (ca === 0 && cb === 0) continue;
    const a = dbOf(ca);
    const b = dbOf(cb);
    const i0 = at[j];
    const i1 = at[j + 1];
    for (let i = i0; i <= i1 && i <= steps; i++) out[i] = a + ((b - a) * (i - i0)) / Math.max(1, i1 - i0);
  }
  return out;
}

/** Pitches on the step grid: straight lines in octaves between key frames. */
export function pitchGrid(at: Int32Array, codes: Uint8Array, width: number, offset: number, steps: number): Float32Array {
  const out = new Float32Array(steps + 1);
  const hz = (j: number): number =>
    FREQ_BASE * 2 ** ((codes[j * width + offset] * 64 + codes[j * width + offset + 1]) / FREQ_STEPS);
  const last = at.length - 1;
  for (let j = 0; j < last; j++) {
    const a = hz(j);
    const b = hz(j + 1);
    const i0 = at[j];
    const i1 = at[j + 1];
    for (let i = i0; i <= i1 && i <= steps; i++) out[i] = a * (b / a) ** ((i - i0) / Math.max(1, i1 - i0));
  }
  for (let i = at[last] + 1; i <= steps; i++) out[i] = hz(last);
  return out;
}

/** In-place complex FFT (radix 2); `inverse` leaves out the 1/n. */
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k;
        const b = a + (len >> 1);
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** The band a frequency falls in (-1 under the lowest, BANDS over the highest). */
export const bandOf = (f: number): number =>
  f < F_LO ? -1 : Math.min(BANDS, Math.floor(Math.log(f / F_LO) / Math.log(RATIO) + 1e-9));

/** The group a band's noise is made in. */
export const groupOf = (b: number): number => {
  let g = 0;
  while (g + 1 < GROUPS.length && b >= GROUPS[g + 1].from) g++;
  return g;
};
/** A group's first band and the one after its last. */
export const groupBands = (g: number): [number, number] => [GROUPS[g].from, g + 1 < GROUPS.length ? GROUPS[g + 1].from : BANDS];

/** The bins of a group's frame that fall in its bands, and the band each falls in. */
interface BinMap {
  readonly bins: Int32Array;
  readonly band: Int32Array;
}
const binMaps: BinMap[] = [];
function binMap(g: number): BinMap {
  if (!binMaps[g]) {
    const N = GROUPS[g].frame;
    const [first, end] = groupBands(g);
    const bins: number[] = [];
    const band: number[] = [];
    for (let k = 1; k < N / 2; k++) {
      const b = bandOf((k * SFX_RATE) / N);
      if (b < first || b >= end) continue;
      bins.push(k);
      band.push(b);
    }
    binMaps[g] = { bins: Int32Array.from(bins), band: Int32Array.from(band) };
  }
  return binMaps[g];
}
/** A band's width in dB-Hz: its share of the power, spread over it, is this much less per hertz. */
const widthDb = Array.from({ length: BANDS }, (_, b) => 10 * Math.log10(bandEdge(b + 1) - bandEdge(b)));

/** Renders a sketch to samples at SFX_RATE. The same sketch and seed always give the same samples. */
export function renderSketch(s: Sketch, seed: number): Float32Array {
  const n = s.n;
  const steps = Math.ceil(n / FINE);
  const y = new Float32Array(n);
  const level = (c: number): number => s.ref - (63 - c) * STEP_DB;
  const share = (c: number): number => -(63 - c) * STEP_DB;

  // ---- noise: per group, unit-power frames of the group's shape, overlapped, then given the group's loudness
  const loud = readFrames(s.e, GROUPS.length);
  const nb = s.b1 - s.b0 + 1;
  const shape = readFrames(s.s, nb);
  const S: Float32Array[] = [];
  for (let b = 0; b < BANDS; b++) {
    S.push(
      b < s.b0 || b > s.b1
        ? new Float32Array(steps + 1).fill(-Infinity)
        : levelGrid(shape.at, shape.codes, nb, b - s.b0, steps, share),
    );
  }
  const G = GROUPS.length;
  const buzz = s.h ? readFrames(s.h, 2 + G) : null;
  const voiced = Array.from({ length: G }, (_, g) => {
    const v = buzz ? levelGrid(buzz.at, buzz.codes, 2 + G, 2 + g, steps, (c) => c / 63) : null;
    return Float32Array.from({ length: steps + 1 }, (_, i) => (v && v[i] > 0 ? v[i] : 0));
  });
  // the buzz's pitch, and how many harmonics fall in each group (a group none fall in keeps all its noise)
  const f0 = buzz ? pitchGrid(buzz.at, buzz.codes, 2 + G, 0, steps) : null;
  const groupAt = (f: number): number => {
    const b = bandOf(f);
    return b < 0 || b >= BANDS ? -1 : groupOf(b);
  };
  if (f0) {
    for (let i = 0; i <= steps; i++) {
      for (let g = 0; g < G; g++) {
        if (!(voiced[g][i] > 0)) continue;
        const [first, end] = groupBands(g);
        if (Math.floor(bandEdge(end) / f0[i] - 1e-9) < Math.ceil(bandEdge(first) / f0[i])) voiced[g][i] = 0;
      }
    }
  }
  const loudness: Float32Array[] = [];
  const rnd = seeded(seed);
  const dens = new Float64Array(BANDS);
  const noise = new Float32Array(n);
  for (let g = 0; g < G; g++) {
    const E = levelGrid(loud.at, loud.codes, G, g, steps, level);
    const whole = Float32Array.from(E, (db) => (db > -Infinity ? 10 ** (db / 20) : 0));
    loudness.push(whole);
    const amp = Float32Array.from(whole, (a, i) => a * Math.sqrt(1 - voiced[g][i]));
    if (!amp.some((v) => v > 0)) continue;
    const N = GROUPS[g].frame;
    const H = N / 4;
    const map = binMap(g);
    // Hann frames a quarter apart overlap to a steady 1.5 in power
    const win = Float64Array.from({ length: N }, (_, i) => (0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / N)) / Math.sqrt(1.5));
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    noise.fill(0);
    for (let start = -N + H; start < n; start += H) {
      let on = false;
      const last = Math.min(steps, Math.ceil((start + N) / FINE));
      for (let i = Math.max(0, Math.floor(start / FINE)); i <= last; i++) {
        if (amp[i] > 0) {
          on = true;
          break;
        }
      }
      if (!on) continue;
      const at = Math.max(0, Math.min(steps, Math.round((start + N / 2) / FINE)));
      for (let b = 0; b < BANDS; b++) dens[b] = S[b][at] > -Infinity ? S[b][at] - widthDb[b] : -150;
      re.fill(0);
      im.fill(0);
      let power = 0;
      for (let q = 0; q < map.bins.length; q++) {
        const k = map.bins[q];
        const m = 10 ** (dens[map.band[q]] / 20);
        const ph = rnd() * 2 * Math.PI;
        re[k] = m * Math.cos(ph);
        im[k] = m * Math.sin(ph);
        re[N - k] = re[k];
        im[N - k] = -im[k];
        power += m * m;
      }
      if (power <= 0) continue;
      fft(re, im, true);
      // the frame's samples have power 2·power (no 1/N above): scaled to 1
      const scale = 1 / Math.sqrt(2 * power);
      for (let i = 0; i < N; i++) {
        const t = start + i;
        if (t >= 0 && t < n) noise[t] += re[i] * scale * win[i];
      }
    }
    for (let t = 0; t < n; t++) {
      const i = (t / FINE) | 0;
      y[t] += noise[t] * (amp[i] + (amp[i + 1] - amp[i]) * ((t - i * FINE) / FINE));
    }
  }

  // ---- buzz: harmonics of the pitch, each as loud as the shape is where it falls
  if (buzz && f0) {
    let low = Infinity;
    for (let i = 0; i <= steps; i++) if (voiced.some((v) => v[i] > 0)) low = Math.min(low, f0[i]);
    const H = low < Infinity ? Math.floor(bandEdge(BANDS) / low) : 0;
    const A = new Float32Array((steps + 1) * Math.max(1, H));
    const sum = new Float64Array(G);
    for (let i = 0; i <= steps && H > 0; i++) {
      if (!voiced.some((v) => v[i] > 0)) continue;
      sum.fill(0);
      for (let h = 1; h <= H; h++) {
        const f = h * f0[i];
        const g = groupAt(f);
        if (g < 0 || !(voiced[g][i] > 0) || !(loudness[g][i] > 0)) continue;
        const b = bandOf(f);
        const d = S[b][i] > -Infinity ? 10 ** ((S[b][i] - widthDb[b]) / 10) : 0;
        A[i * H + h - 1] = d;
        sum[g] += d;
      }
      // each group's harmonics together carry its voiced share of its loudness: Σ A²/2 = loudness² · voiced
      for (let h = 1; h <= H; h++) {
        const g = groupAt(h * f0[i]);
        const d = A[i * H + h - 1];
        if (g >= 0 && d > 0) A[i * H + h - 1] = loudness[g][i] * Math.sqrt((2 * voiced[g][i] * d) / sum[g]);
      }
    }
    let phase = 0;
    const dw = (2 * Math.PI) / SFX_RATE;
    for (let t = 0; t < n && H > 0; t++) {
      const i = (t / FINE) | 0;
      const fr = (t - i * FINE) / FINE;
      phase += dw * (f0[i] + (f0[i + 1] - f0[i]) * fr);
      if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
      const a0 = i * H;
      const a1 = Math.min(steps, i + 1) * H;
      if (!(A[a0] > 0 || A[a1] > 0 || A[a0 + 1] > 0 || A[a1 + 1] > 0) && !voiced.some((v) => v[i] > 0 || v[Math.min(steps, i + 1)] > 0)) continue;
      // sin(h·φ) for h = 1.. by the recurrence sin((h+1)φ) = 2cos φ sin(hφ) - sin((h-1)φ)
      const c2 = 2 * Math.cos(phase);
      let prev = 0;
      let cur = Math.sin(phase);
      let sum = 0;
      for (let h = 0; h < H; h++) {
        const a = A[a0 + h] + (A[a1 + h] - A[a0 + h]) * fr;
        sum += a * cur;
        const next = c2 * cur - prev;
        prev = cur;
        cur = next;
      }
      y[t] += sum;
    }
  }

  // ---- partials
  if (s.k > 0 && s.p) {
    const slots = s.p.split(',');
    const dw = (2 * Math.PI) / SFX_RATE;
    for (let p = 0; p < slots.length; p++) {
      const tone = readFrames(slots[p], 3);
      const A = levelGrid(tone.at, tone.codes, 3, 2, steps, level);
      const hz = pitchGrid(tone.at, tone.codes, 3, 0, steps);
      const a = Float32Array.from(A, (db) => (db > -Infinity ? 10 ** (db / 20) : 0));
      let phase = seeded(seed + p + 1)() * 2 * Math.PI;
      for (let t = 0; t < n; t++) {
        const i = (t / FINE) | 0;
        const fr = (t - i * FINE) / FINE;
        phase += dw * (hz[i] + (hz[i + 1] - hz[i]) * fr);
        const v = a[i] + (a[i + 1] - a[i]) * fr;
        if (v > 0) y[t] += v * Math.sin(phase);
      }
    }
  }

  const L = s.loop || 0;
  // the recordings were cut 2 ms before each sound starts: so is this (a sudden start would click)
  if (!L) for (let t = 0; t < Math.min(n, FADE_IN); t++) y[t] *= 0.5 - 0.5 * Math.cos((Math.PI * (t + 0.5)) / FADE_IN);
  if (L > 0 && L < n / 2) {
    const m = n - L;
    for (let i = 0; i < L; i++) {
      const t = (i + 0.5) / L;
      y[i] = y[i] * Math.sqrt(t) + y[m + i] * Math.sqrt(1 - t);
    }
    return y.slice(0, m);
  }
  return y;
}
