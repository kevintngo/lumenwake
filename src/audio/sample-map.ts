import type { AbilityId } from '../types/domain';
import type { Entity, MonsterEntity, PlayerEntity } from '../types/entity';
import type { GameEventMap } from '../types/events';
import type { GameContext } from '../types/game-context';
import { pick, rand, type AudioPosition } from './synth-kit';

export const SAMPLE_NAMES = [
  'step-grass-1',
  'step-grass-2',
  'step-grass-3',
  'step-grass-4',
  'step-stone-1',
  'step-stone-2',
  'step-stone-3',
  'step-stone-4',
  'step-snow-1',
  'step-snow-2',
  'step-snow-3',
  'land',
  'jump-1',
  'jump-2',
  'swing-1',
  'swing-2',
  'swing-3',
  'swing-heavy',
  'swing-4',
  'saber-hum',
  'saber-ignite',
  'saber-hit-1',
  'saber-hit-2',
  'saber-hit-3',
  'rifle-1',
  'rifle-2',
  'rifle-3',
  'rifle-heavy',
  'rod-1',
  'rod-2',
  'hit-1',
  'hit-2',
  'hit-3',
  'hit-4',
  'crit-1',
  'crit-2',
  'hurt-1',
  'hurt-2',
  'shot-hit-1',
  'shot-hit-2',
  'burst',
  'burst-2',
  'slam',
  'slam-2',
  'volley',
  'bolt',
  'nova',
  'mend',
  'dash',
  'die-1',
  'die-2',
  'die-3',
  'claw-1',
  'claw-2',
  'zap',
  'spores',
  'guard',
  'elder-step-1',
  'elder-step-2',
  'elder-roar',
  'elder-fall',
  'rumble',
  'shuttle-pass',
  'shuttle-land',
  'teleport',
  'gate',
  'lumen-zap',
  'lumen-burst',
  'drink',
  'coins-1',
  'coins-2',
  'pickup',
  'equip',
  'hone',
  'salvage',
  'click',
  'deny',
] as const;

type SampleName = (typeof SAMPLE_NAMES)[number];

export interface SampleCue {
  readonly name: SampleName;
  readonly gain: number;
  readonly rate?: number;
  readonly at?: number;
  readonly where?: AudioPosition;
  readonly keep?: boolean;
}

export type SampleResult = SampleCue | readonly SampleCue[] | null;

type SampleMap = {
  readonly [K in keyof GameEventMap]?: (payload: GameEventMap[K], game: GameContext) => SampleResult;
};

type SurfaceKind = 'grass' | 'stone' | 'snow';

const STEP_SAMPLES: Readonly<Record<SurfaceKind, readonly SampleName[]>> = {
  grass: ['step-grass-1', 'step-grass-2', 'step-grass-3', 'step-grass-4'],
  stone: ['step-stone-1', 'step-stone-2', 'step-stone-3', 'step-stone-4'],
  snow: ['step-snow-1', 'step-snow-2', 'step-snow-3'],
};

const any = (...names: SampleName[]): SampleName => names[Math.floor(Math.random() * names.length)];

const surface = (game: GameContext): SurfaceKind => {
  const id = game.biome && game.biome.id;
  return id === 'rime' ? 'snow' : id === 'town' || id === 'vault' || id === 'shatter' || id === 'saltglass' ? 'stone' : 'grass';
};

const isMonster = (e: Entity | null | undefined): e is MonsterEntity => !!e && e.kind === 'monster';
const isPlayer = (e: Entity | null | undefined): e is PlayerEntity => !!e && e.kind === 'player';

const SKILL_SAMPLES: Partial<Record<AbilityId, SampleCue>> = {
  cleave: { name: 'swing-heavy', gain: 0.5, rate: 0.88 },
  volley: { name: 'volley', gain: 0.22 },
  bolt: { name: 'bolt', gain: 0.42 },
  nova: { name: 'nova', gain: 0.5 },
  mend: { name: 'mend', gain: 0.36 },
  step: { name: 'dash', gain: 0.42 },
};

export const SAMPLED: SampleMap = {
  step({ entity }, game) {
    if (entity && entity.kind !== 'player') return null;
    const kind = surface(game);
    return {
      name: pick(STEP_SAMPLES[kind]),
      gain: kind === 'stone' ? 0.24 : 0.3,
      rate: rand(0.92, 1.08),
    };
  },
  swing: ({ heavy }) => ({
    name: heavy ? 'swing-heavy' : any('swing-1', 'swing-2', 'swing-3', 'swing-4'),
    gain: heavy ? 0.46 : 0.38,
    rate: rand(0.94, 1.08),
  }),
  shoot: ({ family, heavy }) =>
    family === 'rifle'
      ? {
          name: heavy ? 'rifle-heavy' : any('rifle-1', 'rifle-2', 'rifle-3'),
          gain: heavy ? 0.36 : 0.3,
          rate: rand(0.95, 1.06),
        }
      : {
          name: any('rod-1', 'rod-2'),
          gain: heavy ? 0.4 : 0.32,
          rate: rand(0.94, 1.08),
        },
  damage({ target, crit, soft, source, indirect }) {
    if (soft) return [];
    if (isPlayer(target)) return { name: any('hurt-1', 'hurt-2'), gain: 0.4, rate: rand(0.9, 1.05) };
    if (isMonster(target) && target.guard) return { name: 'guard', gain: 0.26, rate: rand(1.15, 1.3), where: target };
    const big = !!(crit || (target && target.hp <= 0));
    const giant = isMonster(target) && target.def && target.def.giant;
    const blow: SampleCue = {
      name: big ? any('crit-1', 'crit-2') : any('hit-1', 'hit-2', 'hit-3', 'hit-4'),
      gain: big ? 0.36 : 0.28,
      rate: rand(0.92, 1.08) * (giant ? 0.8 : 1),
      where: target,
    };
    if (isPlayer(source) && source.family === 'blade' && !indirect) {
      return [
        blow,
        {
          name: any('saber-hit-1', 'saber-hit-2', 'saber-hit-3'),
          gain: big ? 0.3 : 0.24,
          rate: rand(0.94, 1.08),
          where: target,
        },
      ];
    }
    return blow;
  },
  'monster:died': (m) =>
    m.def && m.def.fall
      ? null
      : {
          name: any('die-1', 'die-2', 'die-3'),
          gain: 0.24,
          rate: rand(0.9, 1.15) * (m.elite ? 0.8 : 1),
          at: 0.03,
          where: m,
        },
  'monster:strike': (m) =>
    m.def && m.def.giant ? null : { name: any('claw-1', 'claw-2'), gain: 0.22, rate: rand(0.9, 1.12), where: m },
  slam: (d) => ({ name: d.heavy ? 'slam' : 'slam-2', gain: d.heavy ? 0.42 : 0.3, rate: rand(0.94, 1.04), where: d }),
  'monster:shot': (m) => ({ name: 'zap', gain: 0.16, rate: rand(0.9, 1.1), where: m }),
  'shot:hit': (d) => ({ name: any('shot-hit-1', 'shot-hit-2'), gain: 0.2, rate: rand(0.9, 1.1), where: d }),
  'bolt:hit': (d) => ({ name: any('burst', 'burst-2'), gain: 0.28, rate: rand(0.95, 1.08), where: d }),
  'hazard:cloud': (d) => ({ name: 'spores', gain: 0.2, rate: rand(0.9, 1.05), where: d }),
  guard: (d) => ({ name: 'guard', gain: 0.24, where: d.entity }),
  'charge:dust': (d) => ({ name: any('step-stone-1', 'step-stone-2'), gain: 0.3, rate: 0.6, where: d }),
  'boss:step': (d) => ({
    name: any('elder-step-1', 'elder-step-2'),
    gain: 0.5,
    rate: rand(0.92, 1.05),
    where: d.entity || d,
  }),
  'boss:rise': () => ({ name: 'rumble', gain: 0.45 }),
  'cine:rumble': ({ power = 0.5 }) => ({ name: 'rumble', gain: 0.2 + 0.3 * power, rate: rand(0.9, 1.05) }),
  'boss:roar': ({ entity }) => ({ name: 'elder-roar', gain: 0.55, where: entity }),
  'boss:down': () => ({ name: 'elder-fall', gain: 0.6 }),
  'gate:shut': (d) => ({ name: 'gate', gain: 0.28, where: d }),
  'craft:pass': () => ({ name: 'shuttle-pass', gain: 0.5 }),
  'craft:land': () => ({ name: 'shuttle-land', gain: 0.5 }),
  'arrive:beam': () => ({ name: 'teleport', gain: 0.34, keep: true }),
  'run:deeper': () => ({ name: 'shuttle-pass', gain: 0.36, rate: 0.8, keep: true }),
  'player:respawn': () => ({ name: 'teleport', gain: 0.32, keep: true }),
  'player:died': () => ({ name: 'hurt-2', gain: 0.5, rate: 0.7, keep: true }),
  equip: () => ({ name: 'equip', gain: 0.34 }),
  'lumen:bolt': () => ({ name: 'lumen-zap', gain: 0.22, rate: rand(0.95, 1.1) }),
  'lumen:burst': () => ({ name: 'lumen-burst', gain: 0.42 }),
  drink: () => ({ name: 'drink', gain: 0.4 }),
  skill: ({ id }) => {
    const s = SKILL_SAMPLES[id];
    return s ? { ...s, rate: (s.rate || 1) * rand(0.96, 1.04) } : null;
  },
  'relic:ring': (d) =>
    d.heavy ? { name: 'slam-2', gain: 0.28, where: d } : { name: 'burst-2', gain: 0.16, rate: 1.2, where: d },
  pickup: (d) =>
    d.rare
      ? null
      : d.item === 'glint'
        ? { name: any('coins-1', 'coins-2'), gain: 0.18, rate: rand(0.95, 1.1) }
        : { name: 'pickup', gain: 0.24, rate: rand(0.95, 1.1) },
  trade: () => ({ name: any('coins-1', 'coins-2'), gain: 0.3 }),
  salvage: () => ({ name: 'salvage', gain: 0.28 }),
  hone: () => ({ name: 'hone', gain: 0.38, keep: true }),
  'ui:click': () => ({ name: 'click', gain: 0.32 }),
  deny: () => ({ name: 'deny', gain: 0.3 }),
  jump: ({ entity }) =>
    entity && entity.kind !== 'player' ? null : { name: any('jump-1', 'jump-2'), gain: 0.28, rate: rand(1.0, 1.2) },
  landed: (d) => ({ name: 'land', gain: 0.4, rate: 0.82, where: d }),
  'mission:begin': (_d, game) =>
    game.player && game.player.family === 'blade' ? { name: 'saber-ignite', gain: 0.4, at: 0.5 } : [],
};
