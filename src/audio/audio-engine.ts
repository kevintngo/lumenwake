import { clamp } from '../core/math';
import type { AudioLevels } from '../types/domain';
import type { GameEventMap } from '../types/events';
import type { GameContext } from '../types/game-context';
import { createAmbience, type AmbiencePlayer } from './ambience';
import { AREAS } from './music-data';
import { createMusic, type MusicPlayer } from './music-player';
import { SAMPLED, SAMPLE_NAMES, type SampleCue, type SampleResult } from './sample-map';
import { SOUNDS } from './sound-effects';
import { BASE_LEVELS, LEVELS, createKit, type AudioBus, type SynthKit } from './synth-kit';

const REPEAT_GAP = 0.035;
const REPEAT_GAPS: Partial<Record<keyof GameEventMap, number>> = { step: 0.13, 'charge:dust': 0.1 };
const MAX_STAGGER = 0.12;
const TICK = 0.1;
const SAMPLE_DIR = `${import.meta.env.BASE_URL}sfx/`;

type AudioContextCtor = typeof AudioContext;
type LevelKey = 'master' | 'music' | 'sfx' | 'ambience';
const LEVEL_KEYS: readonly LevelKey[] = ['master', 'music', 'sfx', 'ambience'];

const isCueList = (value: SampleCue | readonly SampleCue[]): value is readonly SampleCue[] => Array.isArray(value);

function loadSamples(kit: SynthKit): Promise<void> {
  return Promise.all(
    SAMPLE_NAMES.map((name) =>
      fetch(SAMPLE_DIR + name + '.wav')
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => kit.ctx.decodeAudioData(data))
        .then((buffer) => {
          kit.samples.set(name, buffer);
        })
        .catch(() => {}),
    ),
  ).then(() => {});
}

export function createAudio(game: GameContext): void {
  let kit: SynthKit | null = null;
  let music: MusicPlayer | null = null;
  let ambience: AmbiencePlayer | null = null;
  let soundOn = true;
  let volume = 1;
  let lastTick = 0;
  let warned = false;

  const own: Record<LevelKey, number> = { master: 1, music: 1, sfx: 1, ambience: 1 };
  const unit = (v: unknown, was: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n, 0, 1) : was;
  };

  function hearSettings(v: Partial<AudioLevels> | null | undefined): void {
    if (!v || typeof v !== 'object') return;
    for (const name of LEVEL_KEYS) own[name] = unit(v[name], own[name]);
    volume = own.master;
    if ('mute' in v) soundOn = !v.mute;
  }

  hearSettings(game.settings);

  function setMaster(seconds = 0.12): void {
    if (!kit) return;
    const hidden = typeof document !== 'undefined' && document.hidden;
    const target = soundOn && !hidden ? volume * LEVELS.master : 0;
    kit.master.gain.setTargetAtTime(target, kit.ctx.currentTime, seconds / 3);
  }

  function setLevels(seconds = 0.12): void {
    LEVELS.music = BASE_LEVELS.music * own.music;
    if (!kit) return;
    const now = kit.ctx.currentTime;
    const to = (bus: AudioBus, level: number): void => {
      bus.node.gain.setTargetAtTime(level, now, seconds / 3);
    };
    to(kit.buses.sfx, BASE_LEVELS.sfx * own.sfx);
    to(kit.buses.chime, BASE_LEVELS.sfx * own.sfx);
    to(kit.buses.amb, BASE_LEVELS.ambience * own.ambience);
    to(kit.buses.air, BASE_LEVELS.ambience * own.ambience);
    setMaster(seconds);
  }

  const nextFree = new Map<keyof GameEventMap, number>();

  function safely(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      if (!warned) console.warn('[audio]', err);
      warned = true;
    }
  }

  function wake(): void {
    const ctx = kit && kit.ctx;
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') {
      ctx.resume()?.catch?.(() => {});
    }
  }

  function boot(): void {
    if (!kit) {
      const AudioCtx: AudioContextCtor | undefined =
        globalThis.AudioContext ||
        (globalThis as typeof globalThis & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
      if (!AudioCtx) return;
      const fresh = createKit(new AudioCtx(), game, {
        pad: AREAS.town.pad,
        root: AREAS.town.root,
        scale: AREAS.town.five,
      });
      music = createMusic(fresh, game);
      ambience = createAmbience(fresh, game, music);
      kit = fresh;
      void loadSamples(fresh);
      for (const type of Object.keys(music.hears) as (keyof GameEventMap)[]) {
        const hear = music.hears[type] as ((payload: unknown) => void) | undefined;
        if (hear) bus.onDynamic(type, (payload) => safely(() => hear(payload ?? {})));
      }
      setLevels(0.4);
    }
    wake();
  }

  let early: { type: keyof GameEventMap; payload: unknown; at: number } | null = null;

  function trigger(type: keyof GameEventMap, payload: unknown): void {
    if ((!kit || kit.ctx.state !== 'running') && type === 'cine:open') {
      early = { type, payload, at: Date.now() };
    }
    if (!kit || !soundOn || kit.ctx.state !== 'running') return;
    const activeKit = kit;
    const now = activeKit.ctx.currentTime;
    const wait = Math.max(0, (nextFree.get(type) || 0) - now);
    if (wait > MAX_STAGGER) return;
    nextFree.set(type, now + wait + (REPEAT_GAPS[type] ?? REPEAT_GAP));
    activeKit.delay = wait;
    safely(() => {
      const sampler = SAMPLED[type] as ((p: unknown, g: GameContext) => SampleResult) | undefined;
      const picked = sampler && activeKit.samples.size ? sampler(payload ?? {}, game) : null;
      const list: readonly SampleCue[] = !picked ? [] : isCueList(picked) ? picked : [picked];
      let played = false;
      let keep = !picked;
      for (const o of list) {
        const level = o.where ? activeKit.nearness(o.where) : 1;
        if (level <= 0.02) {
          played = true;
          continue;
        }
        activeKit.level = level;
        played = activeKit.sample({ ...o, at: o.at || 0 }) || played;
        if (o.keep) keep = true;
      }
      activeKit.level = 1;
      if (picked && !played && list.length) keep = true;
      const synth = SOUNDS[type] as ((k: SynthKit, p: unknown) => void) | undefined;
      if (keep && synth) synth(activeKit, payload ?? {});
    });
    activeKit.delay = 0;
    activeKit.level = 1;
  }

  let hum: { src: AudioBufferSourceNode; amp: GainNode } | null = null;

  function humTick(now: number): void {
    if (!kit) return;
    const p = game.player;
    const buffer = kit.samples.get('saber-hum');
    const want = !!(buffer && p && !p.dead && p.family === 'blade' && game.missions && game.missions.active);
    if (want && !hum && buffer) {
      const src = kit.ctx.createBufferSource();
      const amp = kit.ctx.createGain();
      src.buffer = buffer;
      src.loop = true;
      amp.gain.value = 0;
      src.connect(amp).connect(kit.buses.sfx.node);
      src.start(now);
      hum = { src, amp };
    } else if (!want && hum) {
      const h = hum;
      hum = null;
      h.amp.gain.setTargetAtTime(0, now, 0.15);
      h.src.stop(now + 1);
      h.src.onended = () => {
        h.src.disconnect();
        h.amp.disconnect();
      };
    }
    if (hum && p) {
      const move = clamp(p.move || 0, 0, 1);
      const swing = p.action === 1 ? 1 : 0;
      hum.amp.gain.setTargetAtTime(0.06 + 0.05 * move + 0.09 * swing, now, swing ? 0.04 : 0.15);
      hum.src.playbackRate.setTargetAtTime(1 + 0.05 * move + 0.14 * swing, now, swing ? 0.05 : 0.2);
    }
  }

  function tick(): void {
    if (!kit || !music || !ambience || kit.ctx.state !== 'running') return;
    if (early) {
      const e = early;
      early = null;
      if (Date.now() - e.at < 2500) trigger(e.type, e.payload);
    }
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
  bus.on('sound', (on) => {
    soundOn = !!on;
    safely(setMaster);
  });
  bus.on('volume', (v) => {
    hearSettings(v);
    safely(setLevels);
  });
  bus.on('frame', () => safely(tick));

  const soundTypes = new Set<keyof GameEventMap>([
    ...(Object.keys(SOUNDS) as (keyof GameEventMap)[]),
    ...(Object.keys(SAMPLED) as (keyof GameEventMap)[]),
  ]);
  for (const type of soundTypes) {
    bus.onDynamic(type, (payload) => trigger(type, payload));
  }

  if (typeof addEventListener === 'function') {
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
      addEventListener(ev, wake, { passive: true });
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => safely(() => setMaster(0.3)));
  }
}
