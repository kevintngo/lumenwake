import { clamp } from '../core/math';
import type { GameContext } from '../types/game-context';

export const BASE_LEVELS = { master: 1, sfx: 1, music: 0.5, ambience: 0.55 } as const;
export const LEVELS = { master: 1, sfx: 1, music: 0.5, ambience: 0.55 };
const MAX_VOICES = { sfx: 24, chime: 16, music: 48, ambience: 16 } as const;
const HEARING = 30;
const NEAR = 4;
const MIN_GAIN = 0.0004;
export const MAJOR: readonly number[] = [0, 2, 4, 7, 9];
export const MINOR: readonly number[] = [0, 3, 5, 7, 10];

export const rand = (lo = 0, hi = 1): number => lo + Math.random() * (hi - lo);
export const randInt = (lo: number, hi: number): number => Math.floor(rand(lo, hi + 1));
export const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
export const mtof = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
export const pitchClass = (n: number): number => ((n % 12) + 12) % 12;
export const fold = (midi: number, floor: number): number => midi + 12 * Math.ceil((floor - midi) / 12);
export const lookup = <T>(
  table: Readonly<Record<string, T>>,
  key: string | undefined | null,
  fallback: T,
): T => (key != null && Object.hasOwn(table, key) ? table[key] : fallback);

export type BusName =
  | 'sfx'
  | 'chime'
  | 'music'
  | 'amb'
  | 'air'
  | 'lead'
  | 'comp'
  | 'call'
  | 'fight'
  | 'pad';

interface VoicePool {
  n: number;
  readonly max: number;
}

interface LiveVoice {
  readonly t0: number;
  readonly end: number;
}

export interface AudioBus {
  readonly node: GainNode;
  readonly pool: VoicePool;
  readonly live?: Map<AudioScheduledSourceNode, LiveVoice>;
}

interface KitBuses {
  sfx: AudioBus;
  chime: AudioBus;
  music: AudioBus;
  amb: AudioBus;
  air: AudioBus;
  lead?: AudioBus;
  comp?: AudioBus;
  call?: AudioBus;
  fight?: AudioBus;
  pad?: AudioBus;
}

interface KitWaves {
  readonly organ: PeriodicWave;
  readonly flute: PeriodicWave;
}

interface EnvelopeOptions {
  readonly attack?: number;
  readonly hold?: number;
  readonly decay?: number;
  readonly at?: number;
  readonly when?: number;
}

interface VibratoOptions {
  readonly rate: number;
  readonly depth: number;
  readonly delay?: number;
}

export interface ToneOptions extends EnvelopeOptions {
  readonly freq: number;
  readonly to?: number;
  readonly glide?: number;
  readonly type?: OscillatorType;
  readonly wave?: PeriodicWave;
  readonly detune?: number;
  readonly gain?: number;
  readonly cutoff?: number;
  readonly cutoffTo?: number;
  readonly formant?: readonly [number, number, number?];
  readonly pan?: number;
  readonly vibrato?: VibratoOptions;
  readonly bus?: BusName;
}

interface NoiseOptions extends EnvelopeOptions {
  readonly filter?: 'bandpass' | 'lowpass' | 'highpass';
  readonly freq?: number;
  readonly to?: number;
  readonly glide?: number;
  readonly q?: number;
  readonly gain?: number;
  readonly bus?: BusName;
}

interface PianoOptions {
  readonly gain?: number;
  readonly ring?: number;
  readonly strings?: number;
  readonly bus?: BusName;
  readonly at?: number;
  readonly when?: number;
}

interface BellOptions {
  readonly gain?: number;
  readonly decay?: number;
  readonly bus?: BusName;
  readonly at?: number;
}

interface SampleOptions {
  readonly name: string;
  readonly gain?: number;
  readonly rate?: number;
  readonly pan?: number;
  readonly bus?: BusName;
  readonly at?: number;
}

export type AudioPosition = { readonly x?: number; readonly z?: number } | null | undefined;

interface KitInit {
  readonly pad?: number;
  readonly root?: number;
  readonly scale?: readonly number[];
}

export interface SynthKit {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly buses: KitBuses;
  readonly padFilter: BiquadFilterNode;
  readonly noiseBuffer: AudioBuffer;
  readonly waves: KitWaves;
  readonly samples: Map<string, AudioBuffer>;
  level: number;
  delay: number;
  root: number;
  scale: readonly number[];
  tone(o: ToneOptions): void;
  noise(o: NoiseOptions): void;
  piano(freq: number, o?: PianoOptions): void;
  bell(freq: number, o?: BellOptions): void;
  sample(o: SampleOptions): boolean;
  key(step: number, floor?: number): number;
  nearness(at: AudioPosition): number;
}

function whiteNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function impulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const n = Math.floor(rate * seconds);
  const pre = Math.floor(rate * 0.018);
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

function softClip(ctx: AudioContext): WaveShaperNode {
  const shaper = ctx.createWaveShaper();
  const n = 2048;
  const curve = new Float32Array(n);
  const knee = 0.6;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    curve[i] = a < knee ? x : Math.sign(x) * (knee + (1 - knee) * Math.tanh((a - knee) / (1 - knee)));
  }
  shaper.curve = curve;
  return shaper;
}

export function createKit(ctx: AudioContext, game: GameContext, init?: KitInit): SynthKit {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(softClip(ctx)).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.8);
  reverb.connect(master);

  const pools: Record<keyof typeof MAX_VOICES, VoicePool> = {
    sfx: { n: 0, max: MAX_VOICES.sfx },
    chime: { n: 0, max: MAX_VOICES.chime },
    music: { n: 0, max: MAX_VOICES.music },
    ambience: { n: 0, max: MAX_VOICES.ambience },
  };

  const makeBus = (level: number, wet: number, pool: VoicePool): AudioBus => {
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

  const buses: KitBuses = {
    sfx: makeBus(LEVELS.sfx, 0.1, pools.sfx),
    chime: makeBus(LEVELS.sfx, 0.45, pools.chime),
    music: makeBus(LEVELS.music, 0.55, pools.music),
    amb: makeBus(LEVELS.ambience, 0, pools.ambience),
    air: makeBus(LEVELS.ambience, 0.4, pools.ambience),
  };

  const padFilter = ctx.createBiquadFilter();
  padFilter.frequency.value = init?.pad ?? 800;
  padFilter.Q.value = 0.3;
  padFilter.connect(buses.music.node);

  const noiseBuffer = whiteNoise(ctx, 5);
  const felt = ctx.createPeriodicWave(
    new Float32Array(7),
    new Float32Array([0, 1, 0.45, 0.2, 0.1, 0.05, 0.025]),
  );
  const wave = (...harmonics: number[]): PeriodicWave =>
    ctx.createPeriodicWave(new Float32Array(harmonics.length + 1), new Float32Array([0, ...harmonics]));
  const waves: KitWaves = {
    organ: wave(1, 0.5, 0.12, 0.25, 0, 0.06, 0, 0.08),
    flute: wave(1, 0.3, 0.09, 0.03),
  };

  const startTime = (o: { readonly when?: number; readonly at?: number }): number =>
    o.when ?? ctx.currentTime + kit.delay + (o.at ?? 0);

  function envelope(param: AudioParam, t0: number, peak: number, o: EnvelopeOptions): number {
    const attack = Math.max(0.002, o.attack ?? 0.005);
    const hold = Math.max(0, o.hold ?? 0);
    const decay = Math.max(0.01, o.decay ?? 0.2);
    const top = t0 + attack;
    const fall = top + hold;
    const end = fall + decay;
    param.value = 0;
    param.setValueAtTime(0, t0);
    param.linearRampToValueAtTime(peak, top);
    if (hold > 0) param.setValueAtTime(peak, fall);
    param.exponentialRampToValueAtTime(peak * 0.001, end);
    param.linearRampToValueAtTime(0, end + 0.02);
    return end + 0.03;
  }

  function finish(
    source: AudioScheduledSourceNode,
    chain: AudioNode[],
    out: AudioBus,
    t0: number,
    end: number,
    extras: AudioNode[] = [],
  ): void {
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

  function tone(o: ToneOptions): void {
    const out = (o.bus ? buses[o.bus] : undefined) || buses.sfx;
    const peak = (o.gain ?? 0.1) * kit.level;
    if (out.pool.n >= out.pool.max || !(peak > MIN_GAIN) || !(o.freq > 0)) return;
    const t0 = startTime(o);
    const osc = ctx.createOscillator();
    if (o.wave) osc.setPeriodicWave(o.wave);
    else osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.detune) osc.detune.value = o.detune;
    const amp = ctx.createGain();
    const end = envelope(amp.gain, t0, peak, o);
    const glideEnd = t0 + (o.glide ?? (end - t0) * 0.6);
    if (o.to !== undefined && o.to > 0) osc.frequency.exponentialRampToValueAtTime(o.to, glideEnd);

    const chain: AudioNode[] = [osc];
    const extras: AudioNode[] = [];
    if (o.cutoff !== undefined && o.cutoff > 0) {
      const filter = ctx.createBiquadFilter();
      filter.Q.value = 0.5;
      filter.frequency.setValueAtTime(o.cutoff, t0);
      if (o.cutoffTo !== undefined && o.cutoffTo > 0) filter.frequency.exponentialRampToValueAtTime(o.cutoffTo, glideEnd);
      chain.push(filter);
    }
    if (o.formant) {
      const formantFilter = ctx.createBiquadFilter();
      formantFilter.type = 'peaking';
      formantFilter.frequency.value = o.formant[0];
      formantFilter.gain.value = o.formant[1];
      formantFilter.Q.value = o.formant[2] ?? 1.5;
      chain.push(formantFilter);
    }
    chain.push(amp);
    if (o.pan && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = o.pan;
      chain.push(panner);
    }
    if (o.vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      const swell = t0 + (o.vibrato.delay ?? 0);
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

  function noise(o: NoiseOptions): void {
    const out = (o.bus ? buses[o.bus] : undefined) || buses.sfx;
    const type = o.filter || 'bandpass';
    const q = o.q ?? 0.8;
    const freq = o.freq ?? 1000;
    const mid = o.to !== undefined && o.to > 0 ? Math.sqrt(freq * o.to) : freq;
    const nyquist = ctx.sampleRate / 2;
    const width = type === 'lowpass' ? mid : type === 'highpass' ? nyquist - mid : mid / q;
    const peak = ((o.gain ?? 0.1) * kit.level) / Math.sqrt(clamp(width / nyquist, 0.01, 1));
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
    if (o.to !== undefined && o.to > 0) {
      filter.frequency.exponentialRampToValueAtTime(o.to, t0 + (o.glide ?? (end - t0) * 0.7));
    }
    src.start(t0, Math.random() * (noiseBuffer.duration - 1));
    finish(src, [src, filter, amp], out, t0, end);
  }

  function piano(freq: number, o: PianoOptions = {}): void {
    const strings = o.strings === 1 ? [0] : [-2.5, 2.5];
    const ring = clamp(6 * (220 / freq) ** 0.35, 2.5, 7.5) * (o.ring ?? 1);
    for (const detune of strings) {
      tone({
        bus: o.bus,
        at: o.at,
        when: o.when,
        wave: felt,
        freq,
        detune,
        attack: 0.01,
        decay: ring,
        gain: (o.gain ?? 0.15) / strings.length,
        cutoff: Math.min(3200, freq * 5),
        cutoffTo: Math.max(240, freq * 1.4),
        glide: 0.8,
      });
    }
  }

  function sample(o: SampleOptions): boolean {
    const buffer = kit.samples.get(o.name);
    const out = (o.bus ? buses[o.bus] : undefined) || buses.sfx;
    const peak = (o.gain ?? 0.3) * kit.level;
    if (!buffer) return false;
    if (out.pool.n >= out.pool.max || !(peak > MIN_GAIN)) return true;
    const t0 = startTime(o);
    const rate = o.rate ?? 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const amp = ctx.createGain();
    amp.gain.value = peak;
    const chain: AudioNode[] = [src, amp];
    if (o.pan && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = o.pan;
      chain.push(panner);
    }
    src.start(t0);
    finish(src, chain, out, t0, t0 + buffer.duration / rate + 0.02);
    return true;
  }

  function bell(freq: number, o: BellOptions = {}): void {
    const gain = o.gain ?? 0.07;
    const decay = o.decay ?? 0.6;
    const base = { bus: o.bus, at: o.at, attack: 0.004 };
    tone({ ...base, freq, decay, gain });
    if (freq * 2.76 < 4200) tone({ ...base, freq: freq * 2.76, decay: decay * 0.4, gain: gain * 0.2 });
  }

  const kit: SynthKit = {
    ctx,
    master,
    buses,
    padFilter,
    noiseBuffer,
    waves,
    tone,
    noise,
    piano,
    bell,
    sample,
    samples: new Map<string, AudioBuffer>(),
    level: 1,
    delay: 0,
    root: init?.root ?? 50,
    scale: init?.scale ?? MAJOR,

    key(step: number, floor = 60): number {
      const octave = Math.floor(step / 5);
      return mtof(fold(kit.root, floor) + 12 * octave + kit.scale[step - 5 * octave]);
    },

    nearness(at: AudioPosition): number {
      const p = game.player;
      if (
        !at ||
        !p ||
        typeof at.x !== 'number' ||
        typeof at.z !== 'number' ||
        !Number.isFinite(at.x) ||
        !Number.isFinite(at.z)
      ) {
        return 1;
      }
      const t = clamp((HEARING - Math.hypot(at.x - p.x, at.z - p.z)) / (HEARING - NEAR), 0, 1);
      return t * t;
    },
  };

  return kit;
}
