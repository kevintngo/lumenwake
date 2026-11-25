import type { ArchetypeId, CinematicId, ClipName, RgbTuple } from '../types/domain';
import type { MonsterEntity } from '../types/entity';
import type { GameEventMap } from '../types/events';
import type { GameContext } from '../types/game-context';

export const CLIPS: Readonly<Record<ClipName, number>> = {
  emerge: 4,
  roar: 5,
  fall: 6,
  strike: 1,
};

export type AnchorRef = string | readonly [number, number] | readonly [number, number, number];

interface CamPose {
  readonly yaw: number;
  readonly pitch: number;
  readonly dist: number;
  readonly up?: number;
  readonly aim?: number;
  readonly lens?: number;
}

export interface CamSpec {
  readonly on: AnchorRef;
  readonly look?: AnchorRef;
  readonly axis?: string;
  readonly by?: string;
  readonly from: CamPose;
  readonly to?: CamPose;
  readonly ease?: 'linear' | 'in' | 'out' | 'inOut';
}

export interface CastAct {
  readonly who: string;
  readonly at?: number;
  readonly for?: number;
  readonly hide?: boolean;
  readonly show?: boolean;
  readonly face?: AnchorRef;
  readonly clip?: ClipName;
  readonly walk?: { readonly from: readonly [number, number]; readonly to: readonly [number, number] };
  readonly fly?: readonly (readonly [number, number, number])[];
  readonly land?: boolean;
}

export interface ShotCue {
  readonly at: number;
  readonly emit?: keyof GameEventMap;
  readonly on?: AnchorRef;
  readonly shake?: number;
  readonly power?: number;
}

export interface ShotCard {
  readonly kind: 'place' | 'elder' | 'contract';
  readonly title: string;
  readonly sub?: string;
  readonly at?: number;
  readonly for?: number;
}

export interface ShotDef {
  readonly for: number;
  readonly dip?: number;
  readonly world?: number;
  readonly cam?: CamSpec;
  readonly act?: readonly CastAct[];
  readonly cues?: readonly ShotCue[];
  readonly card?: ShotCard;
  readonly caption?: string;
}

interface CastSpawnDef {
  readonly as: string;
  readonly archetype: ArchetypeId;
  readonly radius: number;
  readonly height: number;
  readonly colors: readonly RgbTuple[];
}

export interface CinematicDef {
  readonly world?: number;
  readonly out?: number;
  readonly fadeIn?: number;
  readonly bars?: boolean;
  readonly block?: boolean;
  readonly skip?: boolean;
  readonly again?: CinematicId;
  readonly exit?: { readonly behind?: string; readonly facing?: string; readonly pitch?: number };
  readonly cast?: readonly CastSpawnDef[];
  readonly shots: readonly ShotDef[];
}

export const CINEMATICS: Readonly<Record<CinematicId, CinematicDef>> = {
  arrival: {
    world: 1,
    out: 1.3,
    exit: { behind: 'hero' },
    cast: [
      {
        as: 'shuttle',
        archetype: 'shuttle',
        radius: 2.4,
        height: 2.6,
        colors: [
          [232, 236, 244],
          [214, 70, 52],
          [84, 108, 156],
        ],
      },
    ],
    shots: [
      {
        for: 5.6,
        dip: 0.35,
        cam: {
          on: [0, 4],
          look: [-9, 0],
          from: { yaw: 0.5, pitch: 0.07, dist: 78, up: 3, aim: 16, lens: 42 },
          to: { yaw: 0.66, pitch: 0.09, dist: 62, up: 3, aim: 13.5, lens: 42 },
          ease: 'out',
        },
        act: [
          { who: 'hero', hide: true },
          { who: 'shuttle', hide: true },
        ],
        card: {
          kind: 'place',
          title: 'Meridian Landing',
          sub: 'Survey station above the cloud line',
          at: 0.9,
          for: 4.2,
        },
        cues: [{ at: 0, emit: 'cine:open' }],
      },
      {
        for: 5.0,
        dip: 0.3,
        cam: {
          on: [-51.5, -4.5],
          from: { yaw: 0.25, pitch: 0.02, dist: 13.5, up: 1.1, aim: 8.5, lens: 46 },
          to: { yaw: 0.6, pitch: 0.04, dist: 11.5, up: 1.1, aim: 1.6, lens: 46 },
          ease: 'inOut',
        },
        act: [
          { who: 'shuttle', show: true },
          {
            who: 'shuttle',
            fly: [
              [-112, 38, 42],
              [-86, 26, 24],
              [-67, 17, 8],
              [-56, 12.4, -1.5],
              [-51.5, 10.5, -4.5],
              [-51.5, 10, -4.5],
            ],
            land: true,
            for: 4.4,
          },
        ],
        cues: [
          { at: 0.1, emit: 'craft:pass', on: 'shuttle' },
          { at: 4.3, emit: 'craft:land', on: 'shuttle', shake: 0.3 },
        ],
      },
      {
        for: 5.4,
        cam: {
          on: 'hero',
          axis: 'facing',
          from: { yaw: -0.55, pitch: 0.02, dist: 5.2, up: 0.9, aim: 1.15, lens: 38 },
          to: { yaw: -2.75, pitch: 0.2, dist: 8.6, up: 1.0, aim: 1.7, lens: 36 },
          ease: 'inOut',
        },
        act: [
          { who: 'hero', show: true },
          { who: 'hero', walk: { from: [0, 24.5], to: [0, 16] }, for: 4.6 },
          {
            who: 'shuttle',
            at: 0.4,
            fly: [
              [-51.5, 10, -4.5],
              [-51.5, 15, -4.5],
              [-60, 26, -18],
              [-84, 44, -44],
            ],
            for: 5,
          },
        ],
        caption: 'Contracts are posted at the hall. The pad at the south gate takes you down.',
      },
    ],
  },
  descent: {
    world: 0,
    out: 1.0,
    exit: { facing: 'room:1' },
    shots: [
      {
        for: 4.4,
        cam: {
          on: 'hero',
          look: 'hero',
          axis: 'room:1',
          from: { yaw: 3.5, pitch: 0.95, dist: 54, up: 1, aim: 1, lens: 46 },
          to: { yaw: 3.14, pitch: 0.36, dist: 13, up: 1, aim: 2.4, lens: 36 },
          ease: 'inOut',
        },
        act: [{ who: 'hero', face: 'room:1' }],
        card: {
          kind: 'contract',
          title: '{offer.name}',
          sub: '{biome.name}  ·  {goal.name}',
          at: 0.5,
          for: 3.5,
        },
        cues: [{ at: 0.05, emit: 'arrive:beam', on: 'hero' }],
      },
    ],
  },
  elder: {
    world: 0,
    out: 1.1,
    exit: { facing: 'boss' },
    again: 'elderAgain',
    shots: [
      {
        for: 1.7,
        cam: {
          on: 'hero',
          axis: 'boss',
          from: { yaw: 0.5, pitch: 0.03, dist: 4.4, up: 1.0, aim: 1.25, lens: 32 },
          to: { yaw: 0.38, pitch: 0.03, dist: 3.7, up: 1.0, aim: 1.3, lens: 32 },
          ease: 'out',
        },
        act: [
          { who: 'hero', face: 'boss' },
          { who: 'boss', hide: true },
        ],
        cues: [
          { at: 0.25, emit: 'cine:rumble', on: 'boss', power: 0.5, shake: 0.4 },
          { at: 1.05, emit: 'cine:rumble', on: 'boss', power: 0.8, shake: 0.55 },
        ],
      },
      {
        for: 3.9,
        cam: {
          on: 'hero',
          look: 'boss',
          axis: 'boss',
          by: 'boss',
          from: { yaw: 3.42, pitch: 0.02, dist: 0.5, up: 0.085, aim: 0.1, lens: 54 },
          to: { yaw: 3.3, pitch: 0.0, dist: 0.62, up: 0.08, aim: 0.7, lens: 54 },
          ease: 'inOut',
        },
        act: [
          { who: 'boss', show: true },
          { who: 'boss', clip: 'emerge', for: 3.5 },
        ],
        cues: [
          { at: 0, emit: 'boss:rise', on: 'boss', shake: 0.7 },
          { at: 0.7, emit: 'cine:rumble', on: 'boss', power: 0.7, shake: 0.5 },
          { at: 1.4, emit: 'cine:rumble', on: 'boss', power: 0.8, shake: 0.55 },
          { at: 2.1, emit: 'cine:rumble', on: 'boss', power: 0.9, shake: 0.6 },
          { at: 3.4, emit: 'boss:stand', on: 'boss', shake: 0.9 },
        ],
      },
      {
        for: 3.1,
        cam: {
          on: 'boss',
          axis: 'hero',
          by: 'boss',
          from: { yaw: 0.62, pitch: 0.0, dist: 1.2, up: 0.2, aim: 0.62, lens: 52 },
          to: { yaw: 0.36, pitch: 0.0, dist: 1.42, up: 0.24, aim: 0.66, lens: 52 },
          ease: 'out',
        },
        act: [{ who: 'boss', at: 0.25, clip: 'roar', for: 2.3 }],
        cues: [{ at: 0.75, emit: 'boss:roar', on: 'boss', shake: 1 }],
        card: {
          kind: 'elder',
          title: '{boss.name}',
          sub: '{boss.def.epithet}',
          at: 0.9,
          for: 2.2,
        },
      },
    ],
  },
  elderAgain: {
    world: 0,
    out: 0.9,
    exit: { facing: 'boss' },
    shots: [
      {
        for: 3.6,
        cam: {
          on: 'hero',
          look: 'boss',
          axis: 'boss',
          by: 'boss',
          from: { yaw: 3.4, pitch: 0.02, dist: 0.55, up: 0.085, aim: 0.15, lens: 54 },
          to: { yaw: 3.3, pitch: 0.0, dist: 0.65, up: 0.08, aim: 0.68, lens: 54 },
          ease: 'inOut',
        },
        act: [
          { who: 'hero', face: 'boss' },
          { who: 'boss', show: true },
          { who: 'boss', clip: 'emerge', for: 2.2 },
          { who: 'boss', at: 2.2, clip: 'roar', for: 1.4 },
        ],
        cues: [
          { at: 0, emit: 'boss:rise', on: 'boss', shake: 0.7 },
          { at: 1.1, emit: 'cine:rumble', on: 'boss', power: 0.8, shake: 0.5 },
          { at: 2.5, emit: 'boss:roar', on: 'boss', shake: 0.9 },
        ],
        card: {
          kind: 'elder',
          title: '{boss.name}',
          sub: '{boss.def.epithet}',
          at: 1.6,
          for: 1.9,
        },
      },
    ],
  },
  felled: {
    world: 1,
    out: 1.2,
    exit: { facing: 'boss' },
    shots: [
      {
        for: 1.5,
        world: 0.14,
        cam: {
          on: 'hero',
          look: 'boss',
          axis: 'boss',
          by: 'boss',
          from: { yaw: 3.75, pitch: 0.04, dist: 0.5, up: 0.1, aim: 0.42, lens: 40 },
          to: { yaw: 3.65, pitch: 0.04, dist: 0.46, up: 0.1, aim: 0.46, lens: 40 },
          ease: 'out',
        },
      },
      {
        for: 4.3,
        cam: {
          on: 'boss',
          axis: 'hero',
          by: 'boss',
          from: { yaw: 1.05, pitch: 0.1, dist: 1.75, up: 0.16, aim: 0.5, lens: 46 },
          to: { yaw: 0.5, pitch: 0.14, dist: 2.05, up: 0.16, aim: 0.22, lens: 46 },
          ease: 'out',
        },
        card: {
          kind: 'elder',
          title: '{boss.name}',
          sub: 'Brought down',
          at: 2.3,
          for: 1.9,
        },
      },
    ],
  },
  enraged: {
    bars: false,
    block: false,
    skip: false,
    out: 0,
    shots: [{ for: 0.9, world: 0.3 }],
  },
};

interface CinematicTrigger {
  readonly on: keyof GameEventMap;
  readonly play: CinematicId;
  readonly when?: (payload: unknown, game: GameContext) => boolean;
  readonly cast?: (payload: unknown, game: GameContext) => Record<string, unknown>;
  readonly key?: (payload: unknown) => string;
}

export const TRIGGERS: readonly CinematicTrigger[] = [
  {
    on: 'begin',
    play: 'arrival',
    when: (_payload, g) => !g.cinema.quiet,
  },
  {
    on: 'mission:begin',
    play: 'descent',
    cast: (d) => {
      const e = d as GameEventMap['mission:begin'];
      return { offer: e.offer, biome: e.biome, goal: e.goal };
    },
  },
  {
    on: 'boss:arrive',
    play: 'elder',
    cast: (m) => ({ boss: m as MonsterEntity }),
    key: (m) => (m as MonsterEntity).defId,
  },
  {
    on: 'boss:fell',
    play: 'felled',
    cast: (m) => ({ boss: m as MonsterEntity }),
  },
  {
    on: 'boss:enrage',
    play: 'enraged',
    cast: (m) => ({ boss: m as MonsterEntity }),
  },
];
