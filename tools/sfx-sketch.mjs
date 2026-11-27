#!/usr/bin/env node
// Writes src/audio/sfx-sketches.ts: a small spectral sketch of each of the game's sound effects, which
// src/audio/sfx-synth.ts turns back into sound when the game starts (so the game fetches no sound files).
//
//   node tools/sfx-sketch.mjs                      sketches the WAVs in public/sfx
//   node tools/sfx-sketch.mjs --rev a5d2234        ... or the WAVs as they were at a commit (they are no longer in the tree)
//   node tools/sfx-sketch.mjs --check <dir> [names]  also writes, per sound, a spectrogram (recording above, sketch below)
//                                                    and the sketch's WAV into <dir>, and leaves the module alone
//
// A sketch is measured on a 2.5 ms grid (see sfx-synth.ts for how it is played):
//   buzz      a pitch (YIN, every 5 ms) and, per group of bands, how much of the group is its harmonics (the
//             power above the floor through the valleys between them);
//   partials  up to ten steady tones besides: peaks that stand 11 dB clear of the spectrum round them (43 ms
//             windows, every 5 ms), followed from frame to frame, each slot with its own key frames;
//   noise     the rest: the recording (from 20 Hz up) split into the three groups of bands, each group's loudness
//             from its envelope (sharp in time) and each band's share of its group from spectra with the group's own
//             frame length; partials taken out of both;
//   key frames only where straight lines (in dB, and in octaves for pitch) between them would miss by more than
//             the tolerances below, so a steady stretch costs one frame and a blow keeps its 2.5 ms steps;
//   then the sketch is played, and each band is leaned by the colour it missed over the whole sound (twice).
// The report gives, per sound, how far the sketch's sound is from the recording: third-octave levels over time
// (dB), the loudness envelope (correlation, 5 ms), the long-term spectrum at a twelfth of an octave (dB), and the
// level (dB, from 20 Hz up).
// Needs Node 23+ (it loads sfx-synth.ts directly) and nothing else.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SFX_RATE, BANDS, FINE, STEP_DB, FREQ_STEPS, FREQ_BASE, CODES,
  GROUPS, bandEdge, bandCenter, groupOf, groupBands, renderSketch, seedOf,
} from '../src/audio/sfx-synth.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REV = opt('--rev');
const CHECK = opt('--check');
const ONLY = new Set(args);

// ------------------------------------------------------------------ settings
const MAX_SLOTS = 10;           // partials at once
const PROMINENCE = 11;          // dB a peak must stand over the spectrum round it to be a partial
const FLOOR_DB = 72;            // anything this far under the loudest level is silence
const ERR_FLOOR = 50;           // errors are not counted this far under the loudest level
const TOL_DB = 4;               // key frames: how far a straight line may miss a partial's level
const TOL_E = 3;                // ... the loudness
const TOL_S = 3;                // ... the bands' shares of it (root mean square over the bands)
const TOL_S_ONE = 9;            // ... any one band's share
const SHARE_FLOOR = -30;        // shares under this (dB of their group) are not told apart
const TOL_V = 6;                // ... how much of a group is the buzz (in 63rds)
const TOL_CENTS = 20;           // ... or a pitch
const MAX_GAP = 63;             // steps between key frames (one character)
const LOOPS = { 'saber-hum': 0.15 };   // sounds that loop: seconds of crossfade
const ROUNDS = 2;               // times the sketch is played back, measured and corrected

// ------------------------------------------------------------------ input
const NAMES = (() => {
  const src = readFileSync(path.join(ROOT, 'src/audio/sample-map.ts'), 'utf8');
  const list = src.slice(src.indexOf('SAMPLE_NAMES = ['), src.indexOf('] as const'));
  return [...list.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
})();

function wavBytes(name) {
  if (REV) return execFileSync('git', ['show', `${REV}:public/sfx/${name}.wav`], { cwd: ROOT, maxBuffer: 1 << 26 });
  return readFileSync(path.join(ROOT, 'public/sfx', name + '.wav'));
}

function readWav(buf) {
  let o = 12, rate = 0, ch = 1, bits = 16, data = null;
  while (o + 8 <= buf.length) {
    const id = buf.toString('ascii', o, o + 4), len = buf.readUInt32LE(o + 4);
    if (id === 'fmt ') { ch = buf.readUInt16LE(o + 10); rate = buf.readUInt32LE(o + 12); bits = buf.readUInt16LE(o + 22); }
    if (id === 'data') data = buf.subarray(o + 8, o + 8 + len);
    o += 8 + len + (len & 1);
  }
  if (bits !== 16 || !data) throw new Error('need 16-bit PCM');
  const n = Math.floor(data.length / 2 / ch), x = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < ch; c++) s += data.readInt16LE((i * ch + c) * 2); x[i] = s / ch / 32768; }
  if (rate !== SFX_RATE) throw new Error(`rate ${rate}, need ${SFX_RATE}`);
  return x;
}

function writeWav(file, y) {
  const n = y.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SFX_RATE, 24);
  b.writeUInt32LE(SFX_RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(y[i] * 32767))), 44 + i * 2);
  writeFileSync(file, b);
}

// ------------------------------------------------------------------ FFT
const ffts = new Map();
function fft(re, im) {
  const n = re.length;
  let t = ffts.get(n);
  if (!t) {
    const rev = new Uint32Array(n), bits = Math.log2(n);
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
    const cos = new Float64Array(n / 2), sin = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / n); sin[i] = -Math.sin((2 * Math.PI * i) / n); }
    ffts.set(n, (t = { rev, cos, sin }));
  }
  for (let i = 0; i < n; i++) { const j = t.rev[i]; if (j > i) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, step = n / size;
    for (let s = 0; s < n; s += size) for (let k = 0; k < half; k++) {
      const c = t.cos[k * step], si = t.sin[k * step], a = s + k, b = a + half;
      const xr = re[b] * c - im[b] * si, xi = re[b] * si + im[b] * c;
      re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
    }
  }
}
const hann = (n) => Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * (i + 0.5)) / n));

/** Power spectra: frames centred every `hop` samples, `win`-sample Hann window, zero-padded to `size`. */
function stft(x, win, hop, size, frames) {
  const w = hann(win), out = [], count = frames ?? Math.ceil(x.length / hop) + 1;
  const re = new Float64Array(size), im = new Float64Array(size);
  for (let j = 0; j < count; j++) {
    re.fill(0); im.fill(0);
    const c = j * hop - win / 2;
    for (let i = 0; i < win; i++) { const t = c + i; if (t >= 0 && t < x.length) re[i] = x[t] * w[i]; }
    fft(re, im);
    const p = new Float64Array(size / 2 + 1);
    for (let k = 0; k <= size / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k];
    out.push(p);
  }
  return out;
}

// ------------------------------------------------------------------ partials
const T_HOP = 2 * FINE, T_FFT = 4096;
const BIN = SFX_RATE / T_FFT;

function findPartials(x, pitch) {
  const frames = Math.ceil(x.length / T_HOP) + 1;
  const T_WIN = 1024;          // long enough to tell apart the harmonics of a low buzz
  const minLen = Math.max(5, Math.min(10, Math.round(frames / 4)));
  const spec = stft(x, T_WIN, T_HOP, T_FFT, frames);
  const toA = 4 / T_WIN;       // a sine of amplitude A peaks at A * T_WIN / 4
  let top = -Infinity;
  const dbs = spec.map((p) => { const d = Float64Array.from(p, (v) => 10 * Math.log10(v + 1e-20)); for (const v of d) top = Math.max(top, v); return d; });
  const peaks = dbs.map((d, j) => {
    let frameTop = -Infinity;
    for (const v of d) frameTop = Math.max(frameTop, v);
    const found = [];
    const k0 = Math.max(2, Math.ceil(20 / BIN)), k1 = Math.floor(11000 / BIN);
    for (let k = k0; k <= k1; k++) {
      const v = d[k];
      if (!(v > d[k - 1] && v >= d[k + 1]) || v < frameTop - 35 || v < top - 45) continue;
      const half = Math.max(T_FFT / T_WIN * 12, Math.round(k * 0.12));
      const near = [];
      for (let q = Math.max(1, k - half); q <= Math.min(d.length - 1, k + half); q++) near.push(d[q]);
      near.sort((a, b) => a - b);
      if (v - near[near.length >> 1] < PROMINENCE) continue;
      const a = d[k - 1], c = d[k + 1], off = (0.5 * (a - c)) / (a - 2 * v + c);
      const peakDb = v - 0.25 * (a - c) * off;
      const f = (k + off) * BIN;
      if (pitch && pitch[j] && pitch[j].f0) { const h = Math.round(f / pitch[j].f0); if (h >= 1 && Math.abs(f / (h * pitch[j].f0) - 1) < 0.03) continue; }
      found.push({ f, a: Math.sqrt(10 ** (peakDb / 10)) * toA });
    }
    return found.sort((p, q) => q.a - p.a).slice(0, 2 * MAX_SLOTS);
  });
  // follow them
  const done = [], live = [];
  for (let j = 0; j < frames; j++) {
    const free = [...peaks[j]];
    for (const tr of live) {
      const last = tr.f[tr.f.length - 1];
      let best = -1, bestD = 0.035;
      for (let q = 0; q < free.length; q++) { const dd = Math.abs(Math.log2(free[q].f / last)); if (dd < bestD) { bestD = dd; best = q; } }
      if (best >= 0) { const pk = free.splice(best, 1)[0]; tr.f.push(pk.f); tr.a.push(pk.a); tr.miss = 0; }
      else { tr.f.push(last); tr.a.push(0); tr.miss++; }
    }
    for (let q = live.length - 1; q >= 0; q--) if (live[q].miss >= 2) done.push(live.splice(q, 1)[0]);
    for (const pk of free) live.push({ start: j, f: [pk.f], a: [pk.a], miss: 0 });
  }
  done.push(...live);
  const tracks = [];
  for (const tr of done) {
    while (tr.a.length && tr.a[tr.a.length - 1] === 0) { tr.a.pop(); tr.f.pop(); }
    if (tr.a.length < minLen) continue;
    tr.energy = tr.a.reduce((s, v) => s + v * v, 0);
    tr.end = tr.start + tr.a.length - 1;
    tracks.push(tr);
  }
  tracks.sort((a, b) => b.energy - a.energy);
  const slots = [];
  for (const tr of tracks) {
    if (tr.energy < (tracks[0].energy || 0) * 0.002) break;
    let s = slots.find((sl) => sl.every((o) => tr.start > o.end + 2 || tr.end < o.start - 2));
    if (!s && slots.length < MAX_SLOTS) slots.push((s = []));
    if (s) s.push(tr);
  }
  return { slots, frames };
}

// ------------------------------------------------------------------ a buzz (harmonics of one pitch)
const Y_WIN = 960, F0_LO = 55, F0_HI = 1200;
/**
 * The pitch of a buzz every 5 ms (YIN: the first dip of the normalised difference function under 0.25), and how
 * clearly periodic it is (1 - that dip). Short voiced runs are dropped and the pitch is smoothed (a median of five).
 */
function findPitch(x) {
  const frames = Math.ceil(x.length / T_HOP) + 1, N = 2048, out = [];
  const re = new Float64Array(N), im = new Float64Array(N), seg = new Float64Array(Y_WIN), pre = new Float64Array(Y_WIN + 1);
  const tMin = Math.floor(SFX_RATE / F0_HI), tMax = Math.ceil(SFX_RATE / F0_LO), d = new Float64Array(tMax + 2);
  for (let j = 0; j < frames; j++) {
    const c = j * T_HOP - Y_WIN / 2;
    for (let i = 0; i < Y_WIN; i++) { const t = c + i; seg[i] = t >= 0 && t < x.length ? x[t] : 0; pre[i + 1] = pre[i] + seg[i] * seg[i]; }
    if (pre[Y_WIN] < 1e-9) { out.push({ f0: 0, clear: 0 }); continue; }
    re.fill(0); im.fill(0); re.set(seg); fft(re, im);
    for (let k = 0; k < N; k++) { re[k] = re[k] * re[k] + im[k] * im[k]; im[k] = 0; }
    fft(re, im);                    // (real and even, so forward is the inverse, times N)
    let run = 0, best = -1;
    d[0] = 1;
    for (let tau = 1; tau <= tMax; tau++) {
      const r = re[tau] / N, e1 = pre[Y_WIN - tau], e2 = pre[Y_WIN] - pre[tau];
      const diff = Math.max(0, e1 + e2 - 2 * r);
      run += diff;
      d[tau] = run > 0 ? (diff * tau) / run : 1;
      if (best < 0 && tau > tMin + 1 && d[tau - 1] < 0.25 && d[tau - 1] <= d[tau] && d[tau - 1] <= d[tau - 2]) best = tau - 1;
    }
    if (best < 0) { out.push({ f0: 0, clear: 0 }); continue; }
    const a = d[best - 1], b = d[best], cc = d[best + 1], off = (0.5 * (a - cc)) / (a - 2 * b + cc || 1);
    out.push({ f0: SFX_RATE / (best + Math.max(-0.5, Math.min(0.5, off))), clear: 1 - b });
  }
  // drop runs shorter than 20 ms; smooth
  for (let j = 0; j < frames; ) {
    if (!out[j].f0) { j++; continue; }
    let k = j; while (k < frames && out[k].f0) k++;
    if (k - j < 4) for (let q = j; q < k; q++) out[q] = { f0: 0, clear: 0 };
    j = k;
  }
  return out.map((o, j) => {
    if (!o.f0) return o;
    const near = [];
    for (let q = j - 2; q <= j + 2; q++) if (out[q] && out[q].f0) near.push(out[q].f0);
    near.sort((p, q) => p - q);
    return { f0: near[near.length >> 1], clear: o.clear };
  });
}

/**
 * How much of each group's power is the buzz, in each tonal frame: the power above the floor that runs through the
 * valleys between its harmonics.
 */
function findVoicing(x, pitch) {
  const W = 2048, NF = 8192, bin = SFX_RATE / NF;
  const spec = stft(x, W, T_HOP, NF, pitch.length);
  return spec.map((p, j) => {
    const f0 = pitch[j].f0, v = new Float64Array(GROUPS.length);
    if (!f0) return v;
    const valley = [];
    for (let h = 0; (h + 0.5) * f0 < SFX_RATE / 2; h++) {
      const m = (h + 0.5) * f0, lo = Math.max(1, Math.floor((m - f0 / 6) / bin)), hi = Math.min(NF / 2, Math.ceil((m + f0 / 6) / bin));
      let mn = Infinity; for (let q = lo; q <= hi; q++) mn = Math.min(mn, p[q]);
      valley.push([m, Math.max(mn, 1e-30)]);
    }
    const floorAt = (f) => {
      const u = f / f0 - 0.5, i0 = Math.max(0, Math.min(valley.length - 2, Math.floor(u))), t = Math.max(0, Math.min(1, u - i0));
      return Math.exp(Math.log(valley[i0][1]) * (1 - t) + Math.log(valley[i0 + 1][1]) * t);
    };
    GROUPS.forEach((_, g) => {
      const [first, end] = groupBands(g);
      let tot = 0, ex = 0;
      for (let q = Math.ceil(bandEdge(first) / bin); q < Math.min(NF / 2, bandEdge(end) / bin); q++) { tot += p[q]; ex += Math.max(0, p[q] - floorAt(q * bin)); }
      v[g] = tot > 0 ? Math.min(1, ex / tot) : 0;
    });
    return v;
  });
}

/** A slot's tracks on the step grid: Hz and linear amplitude at each step. */
function slotOnGrid(slot, steps) {
  const F = new Float64Array(steps + 1), A = new Float64Array(steps + 1);
  slot.sort((a, b) => a.start - b.start);
  const at = (tr, j) => {   // value of a track at coarse frame j (fractional)
    const q = j - tr.start, i0 = Math.max(0, Math.min(tr.f.length - 1, Math.floor(q))), i1 = Math.min(tr.f.length - 1, i0 + 1), t = Math.max(0, Math.min(1, q - i0));
    return [tr.f[i0] * (tr.f[i1] / tr.f[i0]) ** t, tr.a[i0] + (tr.a[i1] - tr.a[i0]) * t];
  };
  for (let i = 0; i <= steps; i++) {
    const j = i / 2;
    const tr = slot.find((o) => j >= o.start - 1 && j <= o.end + 1);
    if (tr) {
      const [f, a] = at(tr, j);
      F[i] = f;
      A[i] = j < tr.start ? a * Math.max(0, j - tr.start + 1) : j > tr.end ? a * Math.max(0, tr.end + 1 - j) : a;
    } else {
      const next = slot.find((o) => o.start > j), prev = [...slot].reverse().find((o) => o.end < j);
      F[i] = next ? next.f[0] : prev ? prev.f[prev.f.length - 1] : 440;
      A[i] = 0;
    }
  }
  return { F, A };
}

// ------------------------------------------------------------------ noise bands
/** Second-order Butterworth high-pass at 20 Hz (what is under it is not heard, and the bands do not reach it). */
function highPass20(x) {
  const w = Math.tan((Math.PI * 20) / SFX_RATE), r = Math.SQRT2, n0 = 1 / (1 + r * w + w * w);
  const b0 = n0, b1 = -2 * n0, a1 = 2 * (w * w - 1) * n0, a2 = (1 - r * w + w * w) * n0;
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let t = 0; t < x.length; t++) { const v = b0 * x[t] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[t]; y2 = y1; y1 = v; y[t] = v; }
  return y;
}

// Band power is measured with a window that suits the band: long for the low ones (to tell them apart), short for
// the high ones (to keep a blow sharp).
// (the same groups, and frame lengths, the game makes the noise with)
const RES = GROUPS.map((g) => ({ win: g.frame, nfft: Math.max(2048, 4 * g.frame) }));
const resOf = Array.from({ length: BANDS }, (_, b) => groupOf(b));

/** |W(δ)|² of a Hann window of `win` samples, at offsets δ (Hz) on a table of eighth-bins of an nfft transform. */
function lobeTable(win, nfft) {
  const w = hann(win), span = 4 * (nfft / win), table = new Float64Array(span * 16 + 1);
  for (let q = 0; q < table.length; q++) {
    const nu = ((q / 8 - span) * SFX_RATE) / nfft;
    let re = 0, im = 0;
    for (let i = 0; i < win; i++) { const a = (-2 * Math.PI * nu * i) / SFX_RATE; re += w[i] * Math.cos(a); im += w[i] * Math.sin(a); }
    table[q] = re * re + im * im;
  }
  return { table, span };
}

/**
 * The recording split into the groups' frequency ranges (one transform of the whole of it, power-complementary edges
 * a twelfth of an octave wide), so that a short frame measuring a high group cannot pick up the low ones.
 */
function splitGroups(x) {
  let size = 1; while (size < 2 * x.length) size <<= 1;
  const re = new Float64Array(size), im = new Float64Array(size);
  re.set(x); fft(re, im);
  const edges = GROUPS.slice(1).map((g) => bandEdge(g.from));
  const gain = (g, f) => {
    let v = 1;
    const ramp = (e) => { const t = Math.log2(f / e) * 12; return t <= -0.5 ? 0 : t >= 0.5 ? 1 : Math.sin((Math.PI / 2) * (t + 0.5)); };
    if (g > 0) v *= ramp(edges[g - 1]);
    if (g < edges.length) v *= Math.sqrt(1 - ramp(edges[g]) ** 2);
    return v;
  };
  return GROUPS.map((_, g) => {
    const r2 = new Float64Array(size), i2 = new Float64Array(size);
    // the analytic signal: positive frequencies doubled, negative ones dropped; its real part is the group's signal,
    // its magnitude the group's envelope
    for (let k = 1; k < size / 2; k++) {
      const f = (k * SFX_RATE) / size, m = 2 * gain(g, f);
      r2[k] = re[k] * m; i2[k] = -im[k] * m;          // conjugated, for the inverse
    }
    fft(r2, i2);
    const sig = new Float64Array(x.length), env = new Float64Array(x.length);
    for (let t = 0; t < x.length; t++) {
      const a = r2[t] / size, b = -i2[t] / size;
      sig[t] = a; env[t] = (a * a + b * b) / 2;          // power: a sine of amplitude A has |analytic|² = A²
    }
    return { sig, env };
  });
}

/** Noise power per step and band (the partials taken out of the spectrum first). */
function bandPowers(x, steps, parts, steady = false) {
  const P = Array.from({ length: steps + 1 }, () => new Float64Array(BANDS));
  const split = splitGroups(x);
  // each group's loudness from its envelope (sharp in time, unlike a long frame), less its partials
  // a short window (and, for a steady sound, a median in dB, to keep its loudness from wobbling)
  const SMOOTH = steady ? [48, 24, 12] : [8, 4, 2], MEDIAN = steady ? [8, 8, 8] : [0, 0, 0];
  const loud = Array.from({ length: steps + 1 }, () => new Float64Array(GROUPS.length));
  GROUPS.forEach((_, g) => {
    const W = SMOOTH[g] * FINE, w = hann(W), env = split[g].env;
    const [first, end] = groupBands(g), lo = bandEdge(first), hi = bandEdge(end);
    const raw = new Float64Array(steps + 1);
    for (let i = 0; i <= steps; i++) {
      let s2 = 0, ws = 0;
      for (let k = 0; k < W; k++) { const t = i * FINE - W / 2 + k; if (t < 0 || t >= env.length) continue; s2 += w[k] * env[t]; ws += w[k]; }
      raw[i] = 10 * Math.log10((ws > 0 ? s2 / ws : 0) + 1e-30);
    }
    for (let i = 0; i <= steps; i++) {
      const near = [];
      for (let q = Math.max(0, i - MEDIAN[g]); q <= Math.min(steps, i + MEDIAN[g]); q++) near.push(raw[q]);
      near.sort((a, b) => a - b);
      const v = 10 ** (near[near.length >> 1] / 10);
      let tone = 0;
      for (const pt of parts) if (pt.F[i] >= lo && pt.F[i] < hi) tone += (pt.A[i] * pt.A[i]) / 2;
      loud[i][g] = v > 1e-29 ? Math.max(v - tone, 0.03 * v) : 0;
    }
  });
  P.loud = loud;
  RES.forEach((r, ri) => {
    const bands = [];
    for (let b = 0; b < BANDS; b++) if (resOf[b] === ri) bands.push(b);
    if (!bands.length) return;
    const spec = stft(split[ri].sig, r.win, FINE, r.nfft, steps + 1);
    const w2 = hann(r.win).reduce((s, v) => s + v * v, 0);
    const bin = SFX_RATE / r.nfft;
    const { table, span } = lobeTable(r.win, r.nfft);
    const [first, end] = groupBands(ri);
    // the group's lowest and highest bands also take what spills past the group's edges (the split is not a wall)
    const ranges = bands.map((b) => [b, b === first ? 1 : Math.ceil(bandEdge(b) / bin), b === end - 1 ? r.nfft / 2 : Math.ceil(bandEdge(b + 1) / bin) - 1]);
    for (let i = 0; i <= steps; i++) {
      const p = spec[i];
      const left = Float64Array.from(p);
      for (const pt of parts) {
        const A = pt.A[i];
        if (!(A > 0)) continue;
        const c = pt.F[i] / bin;
        for (let q = Math.max(0, Math.ceil(c - span)); q <= Math.min(r.nfft / 2, Math.floor(c + span)); q++) {
          const u = (q - c + span) * 8, u0 = Math.floor(u), f = u - u0;
          const lobe = table[u0] * (1 - f) + (table[u0 + 1] ?? 0) * f;
          left[q] -= ((A * A) / 4) * lobe;
        }
      }
      for (const [b, q0, q1] of ranges) {
        let sum = 0;
        for (let q = q0; q <= q1; q++) sum += Math.max(left[q], 0.03 * p[q]);
        P[i][b] = ((2 / r.nfft) * sum) / w2;
      }
    }
  });
  return P;
}

// ------------------------------------------------------------------ a sketch
/** Key frames for a stream: Douglas-Peucker on the step grid, `miss(a, c, i)` in tolerances (over 1 needs a frame). */
function keyFrames(steps, miss) {
  const keys = new Set([0, steps]);
  const stack = [[0, steps]];
  while (stack.length) {
    const [a, c] = stack.pop();
    if (c - a < 2) continue;
    let worst = 0, at = -1;
    for (let i = a + 1; i < c; i++) { const e = miss(a, c, i); if (e > worst) { worst = e; at = i; } }
    if (worst <= 1 && c - a <= MAX_GAP) continue;
    if (worst <= 1) at = (a + c) >> 1;
    keys.add(at);
    stack.push([a, at], [at, c]);
  }
  return [...keys].sort((a, b) => a - b);
}
const encode = (keys, codesAt) => { let d = '', last = 0; for (const i of keys) { d += CODES[i - last] + codesAt(i); last = i; } return d; };

/** The noise's targets from a signal (from 20 Hz up): each group's loudness and each band's share of its group, per step. */
function noiseTargets(hp, steps, parts, steady) {
  const P = bandPowers(hp, steps, parts, steady);
  const G = GROUPS.length;
  const Eg = P.loud;
  const Pg = P.map((row) => { const e = new Float64Array(G); row.forEach((v, b) => { e[resOf[b]] += v; }); return e; });
  const half = Array.from({ length: BANDS }, (_, b) => [2, 3, 4][resOf[b]]);
  const raw = P.map((row, i) => row.map((v, b) => (Pg[i][resOf[b]] > 0 ? v / Pg[i][resOf[b]] : 0)));
  const share = [];
  for (let i = 0; i <= steps; i++) {
    const row = new Float64Array(BANDS), sum = new Float64Array(G);
    for (let b = 0; b < BANDS; b++) {
      const g = resOf[b];
      let num = 0, den = 0;
      for (let q = -half[b]; q <= half[b]; q++) {
        const j = i + q; if (j < 0 || j > steps) continue;
        const w = (1 - Math.abs(q) / (half[b] + 1)) * Math.min(Pg[j][g], Pg[i][g]);
        num += w * raw[j][b]; den += w;
      }
      row[b] = den > 0 ? num / den : raw[i][b]; sum[g] += row[b];
    }
    for (let b = 0; b < BANDS; b++) row[b] = sum[resOf[b]] > 0 ? row[b] / sum[resOf[b]] : 0;
    share.push(row);
  }
  return { Eg, share };
}

/** Energy per band over the whole of a signal (from 20 Hz up), with long frames: what the ear averages a colour over. */
function longBands(x) {
  const spec = stft(highPass20(x), 1024, 256, 4096), out = new Float64Array(BANDS), bin = SFX_RATE / 4096;
  for (const p of spec) for (let b = 0; b < BANDS; b++) for (let q = Math.ceil(bandEdge(b) / bin); q < Math.min(p.length, Math.ceil(bandEdge(b + 1) / bin)); q++) out[b] += p[q];
  return out;
}

function sketch(name, x) {
  const n = x.length, steps = Math.ceil(n / FINE);
  // a buzz, if there is one
  const hpx = highPass20(x);
  const pitch = findPitch(hpx);
  const vo = pitch.some((q) => q.f0) ? findVoicing(hpx, pitch) : null;
  // partials (not on the buzz's harmonics)
  const { slots } = findPartials(x, pitch);
  const parts = slots.map((s) => slotOnGrid(s, steps));
  // the noise: the loudness of each group of bands, and each band's share of its group's
  const want = noiseTargets(hpx, steps, parts, !!LOOPS[name]);
  // then, a few times: make the sketch, play it, and lean each band (and so each group) by the colour it missed over
  // the whole sound (a fixed lean per band, so nothing of the noise's chance is copied)
  let Eg = want.Eg.map((r) => Float64Array.from(r)), share = want.share.map((r) => Float64Array.from(r)), made = null;
  const wantLong = longBands(x);
  for (let round = 0; round <= ROUNDS; round++) {
    made = encodeSketch(name, n, steps, Eg, share, parts, pitch, vo);
    if (round === ROUNDS) break;
    const gotLong = longBands(renderSketch({ ...made.sk, loop: 0 }, seedOf(name)));
    const lean = Array.from(wantLong, (w, b) => (w > 0 && gotLong[b] > 0 ? Math.max(1 / 16, Math.min(16, w / gotLong[b])) : 1));
    const gw = new Float64Array(GROUPS.length), gg = new Float64Array(GROUPS.length);
    wantLong.forEach((w, b) => { gw[resOf[b]] += w; gg[resOf[b]] += gotLong[b]; });
    Eg = Eg.map((r) => r.map((v, g) => (gw[g] > 0 && gg[g] > 0 ? v * Math.max(1 / 16, Math.min(16, gw[g] / gg[g])) : v)));
    share = share.map((r) => {
      const row = r.map((v, b) => v * lean[b]), sum = new Float64Array(GROUPS.length);
      row.forEach((v, b) => { sum[resOf[b]] += v; });
      return row.map((v, b) => (sum[resOf[b]] > 0 ? v / sum[resOf[b]] : 0));
    });
  }
  return made;
}

function encodeSketch(name, n, steps, Eg, share, parts, pitch, vo) {
  const G = GROUPS.length;
  const Edb = Eg.map((e) => Array.from(e, (v) => (v > 0 ? 10 * Math.log10(v) : -Infinity)));
  const ampDb = parts.map((pt) => Array.from(pt.A, (a) => (a > 0 ? 20 * Math.log10(a) : -Infinity)));
  let ref = -Infinity;
  for (const e of Edb) for (const v of e) ref = Math.max(ref, v);
  for (const row of ampDb) for (const v of row) ref = Math.max(ref, v);
  ref = Math.round(ref * 10) / 10;
  const code = (db) => (db < ref - FLOOR_DB ? 0 : Math.max(0, Math.min(63, Math.round(63 - (ref - db) / STEP_DB))));
  const level = (c) => ref - (63 - c) * STEP_DB;
  const shareCode = (db) => (db < -60 ? 0 : Math.max(0, Math.min(63, Math.round(63 + db / STEP_DB))));
  const shareDb = (c) => -(63 - c) * STEP_DB;
  const fcode = (f) => Math.max(0, Math.min(4095, Math.round(FREQ_STEPS * Math.log2(f / FREQ_BASE))));
  const fval = (c) => FREQ_BASE * 2 ** (c / FREQ_STEPS);

  const Ec = Edb.map((e) => e.map(code));
  const Sc = share.map((row, i) => Array.from(row, (v, b) => {
    const db = v > 0 ? 10 * Math.log10(v) : -Infinity, ec = Ec[i][resOf[b]];
    return ec === 0 || level(ec) + db < ref - FLOOR_DB ? 0 : shareCode(db);
  }));
  const keep = ampDb.map((row, p) => ({ p, live: row.some((v) => code(v) > 0) })).filter((o) => o.live).map((o) => o.p);
  const Ac = keep.map((p) => ampDb[p].map(code));
  const Fc = keep.map((p) => Array.from(parts[p].F, fcode));
  const k = keep.length;
  // the buzz on the step grid: pitch (held through the gaps) and each group's voiced share
  const G2 = GROUPS.length;
  const F0 = new Float64Array(steps + 1), Vc = Array.from({ length: steps + 1 }, () => new Uint8Array(G2));
  let anyV = false;
  if (vo) {
    for (let i = 0; i <= steps; i++) {
      const j0 = Math.min(pitch.length - 1, Math.floor(i / 2)), j1 = Math.min(pitch.length - 1, j0 + 1), t = i / 2 - j0;
      const a = pitch[j0].f0, b = pitch[j1].f0;
      F0[i] = a && b ? a * (b / a) ** t : a || b || 0;
      for (let g = 0; g < G2; g++) {
        const v = (a ? vo[j0][g] : 0) * (1 - t) + (b ? vo[j1][g] : 0) * t;
        Vc[i][g] = v < 0.12 || !Ec[i][g] ? 0 : Math.min(63, Math.round(v * 63));
        if (Vc[i][g]) anyV = true;
      }
    }
    let last = 0; for (let i = 0; i <= steps; i++) if (F0[i]) last = F0[i]; else F0[i] = last;
    let next = 0; for (let i = steps; i >= 0; i--) if (Vc[i].some((c) => c)) next = F0[i] || next; else if (!F0[i] || i < steps) F0[i] = F0[i] || next;
    for (let i = 0; i <= steps; i++) if (!F0[i]) F0[i] = next || 100;
  }
  const F0c = Array.from(F0, (f) => fcode(f || 100));
  let b0 = BANDS, b1 = -1;
  for (const row of Sc) row.forEach((c, b) => { if (c > 0) { b0 = Math.min(b0, b); b1 = Math.max(b1, b); } });
  if (b1 < 0) { b0 = 0; b1 = 0; }

  const floorE = ref - ERR_FLOOR;
  const lerp = (a, b, t) => a + (b - a) * t;
  // loudness
  const eKeys = keyFrames(steps, (a, c, i) => {
    let e = 0;
    for (let g = 0; g < G; g++) {
      const want = Ec[i][g] ? Math.max(floorE, level(Ec[i][g])) : floorE;
      const got = Ec[a][g] === 0 && Ec[c][g] === 0 ? floorE : Math.max(floorE, lerp(level(Ec[a][g]), level(Ec[c][g]), (i - a) / (c - a)));
      e = Math.max(e, Math.abs(got - want) / TOL_E);
    }
    return e;
  });
  // shape (only where the sound is not far under its loudest)
  const sKeys = keyFrames(steps, (a, c, i) => {
    let sq = 0, cnt = 0, worst = 0;
    for (let b = b0; b <= b1; b++) {
      const ec = Ec[i][resOf[b]];
      if (!ec || level(ec) < ref - 40) continue;
      const want = Math.max(SHARE_FLOOR, Sc[i][b] ? shareDb(Sc[i][b]) : -99);
      const got = Sc[a][b] === 0 && Sc[c][b] === 0 ? -99 : lerp(shareDb(Sc[a][b]), shareDb(Sc[c][b]), (i - a) / (c - a));
      const d = Math.abs(Math.max(SHARE_FLOOR, got) - want);
      sq += d * d; cnt++; worst = Math.max(worst, d);
    }
    return cnt ? Math.max(Math.sqrt(sq / cnt) / TOL_S, worst / TOL_S_ONE) : 0;
  });
  // partials: each slot with key frames of its own
  const pKeys = Array.from({ length: k }, (_, p) => keyFrames(steps, (a, c, i) => {
    const t = (i - a) / (c - a), va = Ac[p][a], vc = Ac[p][c];
    const want = Ac[p][i] ? level(Ac[p][i]) : -Infinity;
    const got = va === 0 && vc === 0 ? -Infinity : lerp(level(va), level(vc), t);
    let e = Math.abs(Math.max(floorE, got) - Math.max(floorE, want)) / TOL_DB;
    if (want > ref - 50 && got > ref - 50) {
      const fa = fval(Fc[p][a]), fc = fval(Fc[p][c]), fi = fval(Fc[p][i]);
      e = Math.max(e, Math.abs(1200 * Math.log2((fa * (fc / fa) ** t) / fi)) / TOL_CENTS);
    }
    return e;
  }));
  const hKeys = anyV ? keyFrames(steps, (a, c, i) => {
    const t = (i - a) / (c - a);
    let e = 0;
    for (let g = 0; g < G2; g++) e = Math.max(e, Math.abs(lerp(Vc[a][g], Vc[c][g], t) - Vc[i][g]) / TOL_V);
    if (Vc[i].some((v) => v)) {
      const fa = fval(F0c[a]), fc = fval(F0c[c]), fi = fval(F0c[i]);
      e = Math.max(e, Math.abs(1200 * Math.log2((fa * (fc / fa) ** t) / fi)) / TOL_CENTS);
    }
    return e;
  }) : [];
  const sk = {
    n, ref, b0, b1, k,
    e: encode(eKeys, (i) => Ec[i].map((c) => CODES[c]).join('')),
    s: encode(sKeys, (i) => { let d = ''; for (let b = b0; b <= b1; b++) d += CODES[Sc[i][b]]; return d; }),
    p: pKeys.map((keys, p) => encode(keys, (i) => CODES[Fc[p][i] >> 6] + CODES[Fc[p][i] & 63] + CODES[Ac[p][i]])).join(','),
  };
  if (anyV) sk.h = encode(hKeys, (i) => CODES[F0c[i] >> 6] + CODES[F0c[i] & 63] + Array.from(Vc[i], (c) => CODES[c]).join(''));
  if (LOOPS[name]) sk.loop = Math.round(LOOPS[name] * SFX_RATE);
  return { sk, frames: `${eKeys.length}/${sKeys.length}/${pKeys.reduce((t, q) => t + q.length, 0)}/${hKeys.length}`, partials: k, chars: sk.e.length + sk.s.length + sk.p.length + (sk.h || '').length };
}

// ------------------------------------------------------------------ how close
const THIRD = (() => { const e = []; for (let f = 20; f < 12000; f *= 2 ** (1 / 3)) e.push(f); return e; })();
function measure(x, y) {
  const n = Math.min(x.length, y.length);
  x = x.subarray(0, n); y = y.subarray(0, n);
  // third-octave levels over time (2048-point frames every 10 ms)
  const S = 2048, hop = 240;
  const sx = stft(x, 1024, hop, S), sy = stft(y, 1024, hop, S);
  const bins = (spec) => spec.map((p) => THIRD.slice(0, -1).map((lo, q) => {
    const hi = THIRD[q + 1]; let s = 0;
    for (let kk = Math.floor(lo / (SFX_RATE / S)); kk <= Math.ceil(hi / (SFX_RATE / S)); kk++) s += p[kk] || 0;
    return 10 * Math.log10(s + 1e-20);
  }));
  const bx = bins(sx), by = bins(sy);
  let top = -Infinity;
  for (const r of bx) for (const v of r) top = Math.max(top, v);
  let sum = 0, cnt = 0;
  for (let j = 0; j < bx.length; j++) for (let q = 0; q < bx[j].length; q++) {
    const a = Math.max(top - 50, bx[j][q]), b = Math.max(top - 50, by[j][q]);
    if (a <= top - 50 && b <= top - 50) continue;
    sum += Math.abs(a - b); cnt++;
  }
  const bandErr = cnt ? sum / cnt : 0;
  // envelope (5 ms RMS, dB) correlation where it is within 50 dB of the top
  const W = 120, ex = [], ey = [];
  for (let i = 0; i + W <= n; i += W) {
    let a = 0, b = 0; for (let t = i; t < i + W; t++) { a += x[t] * x[t]; b += y[t] * y[t]; }
    ex.push(10 * Math.log10(a / W + 1e-20)); ey.push(10 * Math.log10(b / W + 1e-20));
  }
  const emax = Math.max(...ex), fx = ex.map((v) => Math.max(v, emax - 50)), fy = ey.map((v) => Math.max(v, emax - 50));
  const mean = (v) => v.reduce((s, q) => s + q, 0) / v.length;
  const mx = mean(fx), my = mean(fy);
  let cxy = 0, cxx = 0, cyy = 0;
  for (let i = 0; i < fx.length; i++) { cxy += (fx[i] - mx) * (fy[i] - my); cxx += (fx[i] - mx) ** 2; cyy += (fy[i] - my) ** 2; }
  const envCorr = fx.length > 2 && cxx > 0 && cyy > 0 ? cxy / Math.sqrt(cxx * cyy) : 1;
  // long-term spectrum, smoothed to a twelfth of an octave
  const lt = (spec) => { const acc = new Float64Array(spec[0].length); for (const p of spec) for (let kk = 0; kk < p.length; kk++) acc[kk] += p[kk]; return acc; };
  const lx = lt(sx), ly = lt(sy);
  let ltop = -Infinity; const sm = [];
  for (let f = 60; f < 11000; f *= 2 ** (1 / 12)) {
    const lo = Math.floor((f * 2 ** (-1 / 24)) / (SFX_RATE / S)), hi = Math.ceil((f * 2 ** (1 / 24)) / (SFX_RATE / S));
    let a = 0, b = 0; for (let kk = lo; kk <= hi; kk++) { a += lx[kk]; b += ly[kk]; }
    const da = 10 * Math.log10(a + 1e-20), db = 10 * Math.log10(b + 1e-20); sm.push([da, db]); ltop = Math.max(ltop, da);
  }
  let ls = 0, lc = 0;
  for (const [a, b] of sm) { if (a < ltop - 40 && b < ltop - 40) continue; ls += Math.abs(Math.max(a, ltop - 40) - Math.max(b, ltop - 40)); lc++; }
  // level: the power from 20 Hz up (what is under 20 Hz is not heard)
  const pow = (spec) => { let s = 0; for (const p of spec) for (let kk = Math.ceil(20 / (SFX_RATE / S)); kk < p.length; kk++) s += p[kk]; return s; };
  return { bandErr, envCorr, ltsErr: lc ? ls / lc : 0, level: 10 * Math.log10(pow(sy) / pow(sx)) };
}

// ------------------------------------------------------------------ pictures
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function png(file, w, h, rgb) {
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const heat = (v) => {   // 0..1 -> black, violet, red, orange, pale yellow
  const stops = [[0, 0, 4], [60, 15, 110], [180, 40, 80], [240, 120, 20], [252, 250, 170]];
  const p = Math.max(0, Math.min(0.9999, v)) * (stops.length - 1), i = Math.floor(p), t = p - i;
  return stops[i].map((c, q) => Math.round(c + (stops[i + 1][q] - c) * t));
};
function spectrogram(file, x, y) {
  const short = x.length < SFX_RATE * 0.5, win = short ? 512 : 1024, hop = short ? 60 : 240, S = 2048;
  const sx = stft(x, win, hop, S), sy = stft(y, win, hop, S);
  const H = 150, cols = Math.max(sx.length, sy.length), W = Math.max(360, Math.min(600, cols)), scale = cols / W;
  let top = -Infinity; for (const p of sx) for (const v of p) top = Math.max(top, 10 * Math.log10(v + 1e-20));
  const rgb = Buffer.alloc(W * (2 * H + 4) * 3);
  const paint = (spec, y0) => {
    for (let cx = 0; cx < W; cx++) for (let r = 0; r < H; r++) {
      const f = 50 * (12000 / 50) ** (1 - (r + 0.5) / H), kk = f / (SFX_RATE / S), k0 = Math.floor(kk), t = kk - k0;
      let best = 0;
      for (let j = Math.floor(cx * scale); j < Math.max(Math.floor(cx * scale) + 1, Math.floor((cx + 1) * scale)); j++) {
        const p = spec[Math.min(spec.length - 1, j)];
        best = Math.max(best, p[k0] * (1 - t) + p[k0 + 1] * t);
      }
      const v = (10 * Math.log10(best + 1e-20) - (top - 80)) / 80;
      const c = heat(v), o = ((y0 + r) * W + cx) * 3;
      rgb[o] = c[0]; rgb[o + 1] = c[1]; rgb[o + 2] = c[2];
    }
  };
  paint(sx, 0);
  for (let r = H; r < H + 4; r++) for (let cx = 0; cx < W; cx++) { const o = (r * W + cx) * 3; rgb[o] = 90; rgb[o + 1] = 200; rgb[o + 2] = 120; }
  paint(sy, H + 4);
  png(file, W, 2 * H + 4, rgb);
}

// ------------------------------------------------------------------ run
const names = NAMES.filter((nm) => !ONLY.size || ONLY.has(nm));
const out = {}, rows = [];
if (CHECK) mkdirSync(CHECK, { recursive: true });
const started = Date.now();
for (const name of names) {
  const x = readWav(wavBytes(name));
  const { sk, frames, partials, chars } = sketch(name, x);
  out[name] = sk;
  const y = renderSketch({ ...sk, loop: 0 }, seedOf(name));
  const m = measure(x, y);
  rows.push({ name, secs: x.length / SFX_RATE, frames, partials, chars, ...m });
  if (CHECK) {
    spectrogram(path.join(CHECK, name + '.png'), x, y);
    writeWav(path.join(CHECK, name + '.sketch.wav'), renderSketch(sk, seedOf(name)));
  }
}
rows.sort((a, b) => b.bandErr - a.bandErr);
console.log('name              secs keys e/s/p/h  k  chars  band dB  env r  lts dB  level dB');
for (const r of rows) console.log(`${r.name.padEnd(16)} ${r.secs.toFixed(2).padStart(5)} ${String(r.frames).padStart(13)} ${String(r.partials).padStart(2)} ${String(r.chars).padStart(6)}  ${r.bandErr.toFixed(2).padStart(6)}  ${r.envCorr.toFixed(3)}  ${r.ltsErr.toFixed(2).padStart(6)}  ${r.level.toFixed(2).padStart(7)}`);
const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
console.log(`mean: band ${avg('bandErr').toFixed(2)} dB, env r ${avg('envCorr').toFixed(3)}, lts ${avg('ltsErr').toFixed(2)} dB; ${rows.reduce((s, r) => s + r.chars, 0)} chars; ${((Date.now() - started) / 1000).toFixed(1)} s`);

if (!CHECK && !ONLY.size) {
  const lines = names.map((nm) => {
    const s = out[nm];
    return `  ${/^[a-z]+$/.test(nm) ? nm : `'${nm}'`}: { n: ${s.n}, ref: ${s.ref}, b0: ${s.b0}, b1: ${s.b1}, k: ${s.k}, ${s.loop ? `loop: ${s.loop}, ` : ''}e: '${s.e}', s: '${s.s}', p: '${s.p}'${s.h ? `, h: '${s.h}'` : ''} },`;
  });
  const src = `// Generated by tools/sfx-sketch.mjs from the game's old sound files; do not edit by hand.
//
// Spectral sketches of the game's sound effects: sfx-synth.ts rebuilds each one when the game starts (a few
// steady tones and 24 bands of shaped noise), so the game fetches no sound files. They are sketched from:
//   - CC0 recordings from Kenney's packs (kenney.nl): impact-sounds, sci-fi-sounds, rpg-audio, digital-audio and
//     interface-sounds (footsteps, blows, crits, being hit, the rifle, bursts, slams, coins, cloth, metal, the
//     interface);
//   - effects made for this game with ElevenLabs sound effects v2 through fal (fal-ai/elevenlabs/sound-effects/v2):
//     the blade's swings, hum, hits and switching on, the rod's casts, the frost ring, mend, the dash, creatures
//     felled and striking, the elders' steps, roar and fall, the rumble, the shuttle, the teleport, the lumen's
//     burst and the potion. What is rebuilt from these remains covered by ElevenLabs' terms for generated audio.
import type { Sketch } from './sfx-synth';

export const SKETCHES: Readonly<Record<string, Sketch>> = {
${lines.join('\n')}
};
`;
  writeFileSync(path.join(ROOT, 'src/audio/sfx-sketches.ts'), src);
  console.log(`wrote src/audio/sfx-sketches.ts: ${(Buffer.byteLength(src) / 1000).toFixed(1)} KB, ${(deflateSync(src).length / 1000).toFixed(1)} KB deflated`);
}
