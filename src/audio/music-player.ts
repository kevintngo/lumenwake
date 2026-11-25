import { clamp } from '../core/math';
import type { GameEventMap } from '../types/events';
import type { GameContext } from '../types/game-context';
import {
  ANSWERS,
  AREAS,
  BEDS,
  BOSSES,
  CHORDS,
  DECK_FADE,
  FELL_HUSH,
  FIGURES,
  HEAT_FALL,
  HEAT_RISE,
  HELD_PAD,
  MIX_TIME,
  PAD_CUT,
  SPARE,
  STANCES,
  STRING_FLOOR,
  VOICES,
  areaOf,
  type AnswerKind,
  type ChordDef,
  type ChordName,
  type FightStance,
  type PreparedPhrase,
  type PreparedPiece,
  type StanceName,
  type VoiceName,
} from './music-data';
import {
  LEVELS,
  fold,
  lookup,
  mtof,
  pick,
  pitchClass,
  rand,
  type AudioBus,
  type SynthKit,
} from './synth-kit';

const LOOKAHEAD = 0.5;
const DECK_LAYERS = ['lead', 'comp', 'call', 'fight', 'pad'] as const;
type DeckLayer = (typeof DECK_LAYERS)[number];
const MIX_KEYS = ['all', 'lead', 'comp', 'fight', 'pad'] as const;
type MixKey = (typeof MIX_KEYS)[number];
const PAD_INDEX: Readonly<Record<string, 0 | 1 | 2>> = { low: 0, mid: 1, top: 2 };

export interface MusicPlayer {
  update(now: number, dt: number): void;
  unrest(): number;
  readonly hears: {
    readonly [K in keyof GameEventMap]?: (payload: GameEventMap[K]) => void;
  };
}

interface MusicState {
  at: number;
  bar: number;
  beat: number;
  len: number;
  area: PreparedPiece | null;
  theme: PreparedPiece | null;
  piece: PreparedPiece;
  elder: boolean;
  fury: boolean;
  stance: StanceName;
  heat: number;
  thin: number;
  low: boolean;
  held: boolean;
  blocks: boolean;
  chordName: ChordName | '';
  chord: ChordDef;
  chordIn: number;
  fit: (midi: number) => boolean;
  clear: (midi: number) => boolean;
  phrase: number;
  pbar: number;
  skip: boolean;
  wait: number;
  rest: number;
  wide: number;
  mid: number;
  fought: boolean;
  busy: number;
  felled: number;
  mix: Partial<Record<MixKey, number>>;
}

export function createMusic(kit: SynthKit, game: GameContext): MusicPlayer {
  const ctx = kit.ctx;
  const out = kit.buses.music;

  const st: MusicState = {
    at: -Infinity,
    bar: 0,
    beat: 0,
    len: 1,
    area: null,
    theme: null,
    piece: AREAS.town,
    elder: false,
    fury: false,
    stance: 'calm',
    heat: 0,
    thin: 0,
    low: false,
    held: false,
    blocks: true,
    chordName: '',
    chord: CHORDS.I,
    chordIn: 0,
    fit: () => false,
    clear: () => true,
    phrase: 0,
    pbar: 0,
    skip: false,
    wait: 0,
    rest: 1,
    wide: 1,
    mid: -1,
    fought: false,
    busy: 0,
    felled: -Infinity,
    mix: { all: -1 },
  };

  let deck: Record<DeckLayer, AudioBus> | null = null;
  const spent: { node: GainNode; until: number }[] = [];

  const levels = (): Record<Exclude<MixKey, 'all'>, number> => ({
    lead: st.held ? 0 : 1,
    comp: st.held ? 0 : 1,
    fight: st.held ? 0 : st.elder ? 1 : clamp((st.heat - 0.15) / 0.6, 0, 1),
    pad: st.held ? HELD_PAD : 1,
  });

  function layer(name: DeckLayer, level = 1): AudioBus {
    const node = ctx.createGain();
    node.gain.value = level;
    node.connect(name === 'pad' ? kit.padFilter : out.node);
    const bus: AudioBus = { node, pool: out.pool, live: new Map() };
    kit.buses[name] = bus;
    if (deck) deck[name] = bus;
    return bus;
  }

  function retire(bus: AudioBus, at: number, fade: number): void {
    const gone = at + fade * 8;
    bus.node.gain.setTargetAtTime(0, at, fade);
    if (bus.live) {
      for (const [source, voice] of bus.live) {
        if (voice.t0 >= at || voice.end <= gone) continue;
        try {
          source.stop(gone);
        } catch {}
      }
    }
    spent.push({ node: bus.node, until: gone + 0.5 });
  }

  function newDeck(now: number): void {
    if (deck) {
      for (const name of DECK_LAYERS) retire(deck[name], now, DECK_FADE);
    }
    const level = levels();
    const fresh = {} as Record<DeckLayer, AudioBus>;
    deck = fresh;
    for (const name of DECK_LAYERS) {
      fresh[name] = layer(name, name === 'call' ? 1 : level[name]);
    }
    Object.assign(st.mix, level);
  }

  function cutPad(t0: number): void {
    if (!deck) return;
    retire(deck.pad, t0, PAD_CUT);
    layer('pad', st.mix.pad ?? 1);
  }

  function mix(now: number): void {
    if (!deck) return;
    const p = game.player;
    const base = levels();
    const target: Record<MixKey, number> = {
      ...base,
      all: LEVELS.music * (game.paused ? 0.7 : p && p.dead ? 0.5 : 1),
    };
    for (const name of MIX_KEYS) {
      const prev = st.mix[name];
      if (prev !== undefined && Math.abs(target[name] - prev) < 0.02) continue;
      st.mix[name] = target[name];
      const bus = name === 'all' ? out : deck[name];
      bus.node.gain.setTargetAtTime(target[name], now, MIX_TIME[name]);
    }
  }

  const generic = (): boolean => st.elder && !st.theme;
  const harmony = () => (generic() && st.area && st.area.elder) || st.piece;
  const wanderers = (): readonly ChordName[] => {
    const area = st.area || AREAS.town;
    return generic() && area.elder ? area.elder.chords : area.tense;
  };
  const pieceNow = (): PreparedPiece =>
    st.theme ? (st.fury && st.theme.fury) || st.theme : st.area || AREAS.town;
  const stanceNow = (): StanceName =>
    st.theme
      ? 'calm'
      : st.elder
        ? st.fury
          ? 'rage'
          : 'elder'
        : st.heat > (st.stance === 'tense' ? 0.25 : 0.5)
          ? 'tense'
          : 'calm';
  const fightStance = (): FightStance => STANCES[st.elder ? (st.fury ? 'rage' : 'elder') : 'tense'];
  const barsFor = (seconds: number): number => Math.max(1, Math.round(seconds / (st.piece.meter * st.len)));

  function place(now: number): void {
    const area = areaOf(game);
    const boss = (game.monsters || []).find((m) => m && m.boss && !m.dead);
    const elder = !!boss;
    const theme = boss ? lookup<PreparedPiece | null>(BOSSES, boss.defId, null) : null;
    if (area === st.area && elder === st.elder && theme === st.theme) return;
    const moved = area !== st.area;
    const fallen = st.elder && !elder;
    st.area = area;
    st.elder = elder;
    st.theme = theme;
    st.piece = theme || area;
    st.stance = 'calm';
    st.heat = 0;
    kit.root = st.piece.root;
    kit.scale = harmony().five;
    newDeck(now);
    st.at = now + (fallen ? FELL_HUSH : moved ? 0.6 : 0.3);
    st.bar = 0;
    st.beat = 0;
    st.chordName = '';
    st.chordIn = 0;
    st.phrase = 0;
    st.pbar = 0;
    st.wait = 0;
    st.rest = 1;
    st.skip = false;
  }

  function sense(now: number, dt: number): void {
    place(now);
    let awake = 0;
    let fury = false;
    for (const m of game.monsters || []) {
      if (!m || m.dead) continue;
      if (m.boss && m.enraged) fury = true;
      const doing = m.ai && m.ai.state;
      if (doing === 'chase' || doing === 'attack' || doing === 'special') awake++;
    }
    st.fury = fury;
    const p = game.player;
    const down = !p || p.dead;
    const want = down || !awake ? 0 : Math.min(1, 0.6 + 0.2 * awake);
    st.heat += (want - st.heat) * (1 - Math.exp(-dt / (want > st.heat ? HEAT_RISE : HEAT_FALL)));
    st.low = !down && p.maxHp > 0 && p.hp < p.maxHp * (st.low ? 0.38 : 0.3);
    st.thin += ((st.low ? 1 : 0) - st.thin) * (1 - Math.exp(-dt / 1.5));
    const held = !!(game.cinema && game.cinema.active) && st.blocks;
    if (st.held && !held) {
      if (now - st.felled < 15) {
        st.pbar = 0;
        st.wait = barsFor(8);
      } else {
        cutPad(now + 0.4);
        st.at = now + 0.4;
        st.beat = 0;
        st.bar = 0;
        st.chordName = '';
        st.chordIn = 0;
        st.phrase = 0;
        st.pbar = 0;
        st.wait = 0;
        st.rest = 0;
      }
    }
    st.held = held;
  }

  function over(
    chord: ChordDef,
    sounding: readonly number[] = chord.pad.map((offset) => kit.root + offset),
  ): { clear: (midi: number) => boolean; fit: (midi: number) => boolean } {
    const root = kit.root;
    const notes = harmony().notes;
    const held = new Set(sounding);
    const tones = new Set([chord.bass, ...chord.pad, ...sounding.map((midi) => midi - root)].map(pitchClass));
    const clear = (midi: number): boolean => !tones.has(pitchClass(midi - root - 1)) && !held.has(midi + 1);
    return { clear, fit: (midi: number): boolean => notes.includes(pitchClass(midi - root)) && clear(midi) };
  }

  const snap = (midi: number, fit: (m: number) => boolean): number =>
    [0, 1, -1, 2, -2, 3, -3].map((d) => midi + d).find(fit) ?? midi;

  function pitch(base: number, degree: number, sharp = 0): number {
    const notes = harmony().notes;
    const octave = Math.floor(degree / 7);
    return base + 12 * octave + notes[degree - 7 * octave] + sharp;
  }

  function sound(name: ChordName, t0: number, bars: number): void {
    const piece = st.piece;
    const chord = lookup(CHORDS, name, CHORDS.Isus);
    const span = bars * piece.meter * st.len;
    if (st.chordIn > 0) cutPad(t0);
    const bed = {
      root: kit.root,
      chord,
      bass: fold(kit.root + chord.bass, piece.bassFloor),
      t0,
      span,
      sounding: [] as number[],
      swell: Math.min(3, span * 0.4),
      tail: Math.min(5, span * 0.58),
      thin: st.thin > 0.5,
    };
    lookup(BEDS, piece.bed, BEDS.strings)(kit, bed);
    const checks = over(chord, bed.sounding);
    st.chordName = name;
    st.chord = chord;
    st.chordIn = bars;
    st.clear = checks.clear;
    st.fit = checks.fit;
    kit.padFilter.frequency.setTargetAtTime((piece.pad || 800) * (generic() ? 0.75 : 1), t0, 2);
  }

  function sing(
    voice: VoiceName,
    midi: number,
    when: number,
    seconds: number,
    gain: number,
    more?: { readonly light?: boolean },
  ): void {
    lookup(VOICES, voice, VOICES.piano).play(kit, {
      bus: 'lead',
      midi,
      when,
      len: seconds,
      gain: gain * rand(0.92, 1.08),
      ...more,
    });
  }

  function tuneBar(t0: number, phrase: PreparedPhrase, bar: number): void {
    const piece = st.piece;
    const by = (phrase.who === 2 && piece.second) || piece.lead;
    const twin = piece.double;
    const also = lookup(VOICES, by.voice, VOICES.piano).also ?? 0;
    const across = twin ? twin.at - by.at : 0;
    for (const n of phrase.bars[bar] || []) {
      let midi = pitch(by.at, n.degree, n.sharp);
      if (!(st.clear(midi) && st.clear(midi + also))) midi = snap(midi, (m) => st.fit(m) && st.clear(m + also));
      const when = t0 + n.at * st.len;
      const seconds = n.len * st.len;
      const gain = piece.strong.includes(n.at) ? 1 : 0.88;
      sing(by.voice, midi, when, seconds, gain);
      if (piece.echo) sing(by.voice, midi, when + piece.echo[0], seconds, gain * piece.echo[1]);
      if (twin && twin.voice !== by.voice && st.thin < 0.5 && st.clear(midi + across)) {
        sing(twin.voice, midi + across, when + 0.012, seconds, gain * 0.6);
      }
    }
  }

  function fragment(t0: number, stance: FightStance): void {
    const piece = st.piece;
    const phrases = piece.phrases;
    if (!phrases.length) return;
    const phrase = phrases[st.phrase % phrases.length];
    const by = piece.lead;
    const drop = stance.drop;
    st.phrase = (st.phrase + 1) % phrases.length;
    const head = (phrase.bars[0] || []).slice(0, 3);
    const notes = head.map((n) => pitch(by.at, n.degree - drop, n.sharp));
    if (!notes.length) return;
    const lift = 12 * Math.max(0, Math.ceil((lookup(VOICES, by.voice, VOICES.piano).low - Math.min(...notes)) / 12));
    head.forEach((n, i) =>
      sing(by.voice, snap(notes[i] + lift, st.fit), t0 + n.at * st.len, n.len * st.len, 0.9, { light: true }),
    );
  }

  function chordNote(part: string): number {
    const [name, up = '0'] = String(part).split('+');
    const chord = st.chord;
    const base =
      name === 'bass'
        ? fold(kit.root + chord.bass, st.piece.bassFloor)
        : kit.root + chord.pad[PAD_INDEX[name] ?? 0];
    return base + Number(up);
  }

  function figureBar(t0: number, fresh: boolean, opening: boolean): void {
    const figures = st.piece.figure
      ? Array.isArray(st.piece.figure)
        ? st.piece.figure
        : [st.piece.figure]
      : [];
    for (const name of figures) {
      const figure = lookup(FIGURES, name, null);
      if (!figure || (figure.on === 'chord' && !fresh) || (figure.on === 'phrase' && !opening)) continue;
      const voice = lookup(VOICES, figure.voice, VOICES.piano);
      figure.bars[figure.on === 'bar' ? st.bar % figure.bars.length : 0].forEach(
        ([beat, part, held = 1, level = 1], i) => {
          if (beat < st.piece.meter) {
            voice.play(kit, {
              bus: 'comp',
              midi: chordNote(part),
              when: t0 + beat * st.len + 0.004 * i,
              len: held * st.len,
              gain: level,
              light: figure.light,
            });
          }
        },
      );
    }
  }

  function leftHand(t0: number, stance: FightStance): void {
    const midi = fold(kit.root + st.chord.bass, st.piece.bassFloor);
    const when = t0 + rand(0, 0.03);
    kit.piano(mtof(midi), { bus: 'comp', when, gain: stance.left, ring: 0.6 });
    if (stance.octave && st.thin < 0.5) {
      kit.piano(mtof(midi + 12), { bus: 'comp', strings: 1, ring: 0.6, when: when + 0.03, gain: stance.left * 0.5 });
    }
  }

  function drum(when: number, gain: number, deep?: boolean): void {
    const freq = deep ? 60 : 76;
    kit.tone({ bus: 'fight', freq, to: freq * 0.6, glide: 0.2, when, attack: 0.008, decay: deep ? 0.75 : 0.45, gain });
    kit.tone({
      bus: 'fight',
      type: 'triangle',
      cutoff: 260,
      freq: freq * 1.9,
      to: freq * 1.1,
      glide: 0.1,
      when,
      attack: 0.006,
      decay: 0.18,
      gain: gain * 0.35,
    });
  }

  function lowString(midi: number, when: number, seconds: number, gain: number): void {
    VOICES.lowstring.play(kit, { bus: 'fight', midi, when, len: seconds, gain: gain / 0.04 });
  }

  function toll(when: number, gain: number): void {
    const freq = mtof(fold(kit.root, 55));
    kit.tone({ bus: 'fight', freq, when, attack: 0.012, decay: 5.5, gain });
    kit.tone({ bus: 'fight', freq: freq * 2.76, when, attack: 0.012, decay: 2.2, gain: gain * 0.18 });
  }

  function wash(when: number, seconds: number, gain: number): void {
    kit.noise({
      bus: 'fight',
      filter: 'lowpass',
      freq: 240,
      to: 700,
      glide: seconds * 0.45,
      when,
      attack: seconds * 0.45,
      hold: 0.2,
      decay: seconds * 0.5,
      gain,
    });
  }

  function fightBeat(t0: number): void {
    const on = !st.held && (st.elder || st.heat > (st.fought ? 0.2 : 0.3));
    const first = on && !st.fought;
    const thin = st.thin > 0.5;
    const piece = st.piece;
    st.fought = on;
    if (!on) return;
    if (st.theme) {
      const hit = piece.drum && piece.drum[st.beat];
      if (hit) drum(t0, hit * (thin ? 0.8 : 1), piece.deep);
      if (!thin && piece.wash && st.beat === 0 && st.bar % 2 === 0) wash(t0, 2 * piece.meter * st.len, piece.wash);
      return;
    }
    const stance = fightStance();
    const beats = st.wide * piece.meter;
    const here = (st.bar % st.wide) * piece.meter + st.beat;
    const at = first ? 0 : here;
    const hit = at === 0 ? stance.drum[0] : at === st.mid ? stance.drum[1] : 0;
    if (hit) drum(t0, hit * (thin ? 0.8 : 1), stance.deep);
    if (thin) return;
    const bass = fold(kit.root + st.chord.bass, STRING_FLOOR);
    const half = Math.min(1.4, (beats * st.len) / 2);
    if (stance.drone) {
      if (at === 0) lowString(bass, t0, (beats - here) * st.len, 0.04);
    } else if (at === 0) {
      lowString(bass, t0, half, 0.034);
    } else if (at === st.mid) {
      lowString(bass + 7, t0, half, 0.034);
    }
    if (stance.toll && at === 0 && (first || Math.floor(st.bar / st.wide) % 2 === 0)) toll(t0, stance.toll);
  }

  function answer(kind: AnswerKind): void {
    if (st.held || !st.area) return;
    const a = ANSWERS[kind];
    const piece = st.piece;
    const half = piece.step;
    const t0 = Math.max(ctx.currentTime + 0.12, st.busy);
    st.heat = Math.min(st.heat, 0.2);
    const home = generic() && st.area.elder ? st.area.elder.chords[0] : piece.home;
    const chord = lookup(CHORDS, home, CHORDS.Isus);
    if (!(st.chordName === home && st.stance === 'calm')) {
      cutPad(t0);
      st.stance = 'calm';
      st.at = t0;
      st.beat = 0;
      st.bar = 0;
      st.chordName = '';
      st.chordIn = 0;
    }
    const fit = over(chord).fit;
    const base = fold(kit.root, a.floor);
    const last = a.steps.length - 1;
    a.steps.forEach((step, i) => {
      const octave = Math.floor(step / 5);
      const midi = snap(base + 12 * octave + kit.scale[step - 5 * octave], fit);
      kit.piano(mtof(midi), { bus: 'call', when: t0 + i * half, gain: a.gain * (i === last ? 1.1 : 1) });
    });
    if (a.roll) {
      const when = t0 + (last + 1) * half;
      kit.piano(mtof(fold(kit.root + chord.bass, piece.bassFloor)), { bus: 'call', when, gain: a.gain });
      chord.pad.forEach((offset, i) =>
        kit.piano(mtof(kit.root + offset + 12), {
          bus: 'call',
          strings: 1,
          when: when + 0.05 + i * 0.07,
          gain: a.gain * 0.6,
        }),
      );
    }
    st.pbar = 0;
    st.wait = Math.max(st.wait, barsFor(8));
    st.rest = Math.max(st.rest, 2);
    st.busy = t0 + (last + 3) * half;
  }

  function writtenBar(t0: number): void {
    const piece = st.piece;
    const phrases = piece.phrases;
    if (st.held || st.wait > 0 || !phrases.length) {
      if (st.chordIn <= 0 || st.chordName !== piece.home) sound(piece.home, t0, barsFor(9));
      if (st.wait > 0 && !st.held) st.wait--;
      st.pbar = 0;
      return;
    }
    const phrase = phrases[st.phrase % phrases.length];
    const opening = st.pbar === 0;
    const hurt = st.thin > 0.5;
    if (opening) st.skip = (st.phrase > 0 || hurt) && rand() > SPARE * (hurt ? 0.5 : 1);
    const fresh = phrase.spans[st.pbar] > 0;
    if (fresh) sound(phrase.chords[st.pbar], t0, phrase.spans[st.pbar]);
    else if (st.chordIn <= 0) sound(phrase.chords[st.pbar] || piece.home, t0, 1);
    if (!hurt) figureBar(t0, fresh, opening);
    if (!st.skip) tuneBar(t0, phrase, st.pbar);
    if (++st.pbar >= phrase.chords.length) {
      st.pbar = 0;
      st.phrase = (st.phrase + 1) % phrases.length;
    }
  }

  function wanderBar(t0: number, stance: FightStance): void {
    const hurt = st.thin > 0.5;
    if (st.bar % st.wide) return;
    if (st.chordIn <= 0) {
      const list = wanderers();
      const home = list[0];
      const was = st.chordName;
      const others = list.filter((name) => name !== was);
      const next =
        !was || !list.includes(was)
          ? home
          : was !== home && rand() < 0.4
            ? home
            : others.length
              ? pick(others)
              : home;
      sound(next, t0, stance.bars * st.wide);
    }
    if (st.held) return;
    leftHand(t0, stance);
    if (st.rest > 0) {
      st.rest--;
      return;
    }
    fragment(t0, stance);
    st.rest = Math.max(
      1,
      Math.round((stance.space * (hurt ? 2 : 1) * clamp(st.piece.breath, 10, 24)) / (st.wide * st.piece.meter * st.len)) -
        1,
    );
  }

  function startBar(t0: number): void {
    const name = stanceNow();
    const piece = pieceNow();
    if (name !== st.stance || piece !== st.piece) {
      if (st.chordIn > 0) cutPad(t0);
      st.stance = name;
      st.phrase = piece === st.piece ? st.phrase : 0;
      st.piece = piece;
      st.chordIn = 0;
      st.chordName = '';
      st.pbar = 0;
      st.bar = 0;
      st.rest = 1;
    }
    const stance = STANCES[name];
    const beats = piece.meter;
    st.len = piece.beat * stance.pace;
    st.wide = stance.written ? 1 : Math.max(1, Math.round(4 / (beats * st.len)));
    const strong: number[] = [];
    const middle = (st.wide * beats) / 2;
    for (let b = 0; b < st.wide; b++) {
      for (const s of piece.strong) {
        if (b * beats + s > 0) strong.push(b * beats + s);
      }
    }
    st.mid = strong.length
      ? strong.reduce((best, at) => (Math.abs(at - middle) < Math.abs(best - middle) ? at : best))
      : -1;
    if (stance.written) writtenBar(t0);
    else wanderBar(t0, stance);
    st.chordIn--;
  }

  function scheduleBeat(): void {
    const t0 = st.at;
    if (st.beat === 0) startBar(t0);
    fightBeat(t0);
    st.at = t0 + st.len;
    if (++st.beat >= st.piece.meter) {
      st.beat = 0;
      st.bar++;
    }
  }

  place(ctx.currentTime);

  return {
    update(now: number, dt: number): void {
      sense(now, dt);
      if (st.at < now - 1) {
        cutPad(now + 0.4);
        st.at = now + 0.4;
        st.beat = 0;
        st.bar = 0;
        st.chordIn = 0;
        st.pbar = 0;
      }
      while (st.at < now + LOOKAHEAD) scheduleBeat();
      mix(now);
      for (let i = spent.length - 1; i >= 0; i--) {
        if (spent[i].until < now) spent.splice(i, 1)[0].node.disconnect();
      }
    },

    unrest: (): number => (st.elder ? 1 : st.heat),

    hears: {
      zone() {
        place(ctx.currentTime);
      },
      'boss:arrive'() {
        place(ctx.currentTime);
      },
      'boss:fell'() {
        st.felled = ctx.currentTime;
        place(ctx.currentTime);
      },
      'cine:begin'({ blocking }) {
        st.blocks = blocking !== false;
      },
      levelup() {
        st.busy = Math.max(st.busy, ctx.currentTime + 1.8);
      },
      'boss:down'() {
        st.busy = Math.max(st.busy, ctx.currentTime + 2.8);
      },
      'room:clear'({ kind }) {
        if (kind !== 'boss') answer('clear');
      },
      'mission:done'() {
        if (ctx.currentTime - st.felled > 20) answer('done');
      },
      'mission:report'({ won }) {
        if (won) answer('home');
      },
    },
  };
}
