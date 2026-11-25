import type { NpcRole, PeopleId, PropId, RgbTuple } from '../types/domain';
import type { FixtureSpec, PavingItem } from '../types/world';

interface CrewDef {
  readonly role: NpcRole;
  readonly name: string;
  readonly title: string;
  readonly people: PeopleId;
  readonly x?: number;
  readonly z?: number;
  readonly face?: readonly [number, number];
  readonly color: RgbTuple;
  readonly trim?: RgbTuple;
  readonly hair?: RgbTuple;
  readonly seed?: number;
  readonly path?: readonly (readonly [number, number])[];
  readonly says?: readonly string[];
}

export interface TownDef {
  readonly id: 'town';
  readonly biome: 'town';
  readonly seed: number;
  readonly rooms: readonly (readonly [number, number, number, number, number])[];
  readonly links: readonly (readonly [number, number, number])[];
  readonly start: { readonly x: number; readonly z: number; readonly yaw: number };
  readonly paving: readonly PavingItem[];
  readonly fixtures: readonly FixtureSpec[];
  readonly crew: readonly CrewDef[];
}

const ring = (
  id: PropId,
  n: number,
  r: number,
  more: Partial<FixtureSpec> = {},
  turn = 0,
): FixtureSpec[] =>
  Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2;
    return {
      id,
      x: Math.round(Math.sin(a) * r * 10) / 10,
      z: Math.round(Math.cos(a) * r * 10) / 10,
      ...more,
    };
  });

export const TOWN: TownDef = {
  id: 'town',
  biome: 'town',
  seed: 4107,
  rooms: [
    [0, 0, 27, 0.05, 15.5],
    [0, 47, 9, 0.03, 9],
    [-46, -10, 13, 0.04, 13],
    [40, -24, 10, 0.07, 3.5],
  ],
  links: [
    [0, 1, 5.2],
    [0, 2, 5.2],
    [0, 3, 4.4],
  ],
  start: { x: 0, z: 16, yaw: Math.PI },
  paving: [
    { x: 0, z: 0, r: 11.5 },
    { x: 0, z: -19, r: 5.2 },
    { x: -17.5, z: 1, r: 4.6 },
    { x: 0, z: 47, r: 6.2 },
    { x: -46, z: -10, r: 10.5 },
    { x: 40, z: -24, r: 3.2 },
    { ax: 0, az: 0, bx: 0, bz: 47, w: 4.2 },
    { ax: 0, az: 0, bx: -46, bz: -10, w: 4.2 },
    { ax: 0, az: 0, bx: 40, bz: -24, w: 3.4 },
    { ax: 0, az: 0, bx: 0, bz: -19, w: 4.2 },
    { ax: 0, az: 0, bx: -17.5, bz: 1, w: 3.6 },
  ],
  fixtures: [
    { id: 'spire', x: 0, z: 0 },
    { id: 'hall', x: 0, z: -22.3, rot: 0 },
    { id: 'console', x: 6.2, z: -14.0, rot: 2.75 },
    { id: 'banner', x: -5.6, z: -17.4, pal: 0 },
    { id: 'banner', x: 6.4, z: -18.2, pal: 0 },
    { id: 'kiosk', x: -19.4, z: -3.2, rot: 1.25, pal: 0 },
    { id: 'kiosk', x: -20.6, z: 5.4, rot: 1.75, pal: 1 },
    { id: 'crate', x: -14.4, z: 6.6, seed: 0.8 },
    { id: 'crate', x: -25.4, z: -1.2, seed: 0.2 },
    { id: 'banner', x: -13.4, z: -5.2, pal: 2 },
    { id: 'hab', x: 17.6, z: -9.4, rot: -1.2, pal: 0 },
    { id: 'hab', x: 20.2, z: 2.6, rot: -1.6, pal: 1 },
    { id: 'hab', x: 15.4, z: 13.4, rot: -2.2, pal: 2 },
    { id: 'hab', x: -11.8, z: -18.6, rot: 0.5, pal: 1 },
    { id: 'hab', x: 12.4, z: -19.4, rot: -0.5, pal: 3 },
    { id: 'hab', x: -14.2, z: 15.6, rot: 2.3, pal: 0 },
    ...ring('lamp', 6, 12.6, {}, 0.52),
    { id: 'bench', x: 6.6, z: 6.4, rot: 0.8 },
    { id: 'bench', x: -6.6, z: 6.4, rot: -0.8 },
    { id: 'bench', x: 6.8, z: -6.2, rot: 2.3 },
    { id: 'bench', x: -6.8, z: -6.2, rot: -2.3 },
    { id: 'planter', x: 9.4, z: 0.6, pal: 7 },
    { id: 'planter', x: -9.4, z: 0.6, pal: 2 },
    { id: 'planter', x: 2.6, z: 9.6, pal: 3 },
    { id: 'planter', x: -2.6, z: 9.6, pal: 11 },
    { id: 'pad', x: 0, z: 47, role: 'deploy' },
    { id: 'lamp', x: -5.4, z: 43.4 },
    { id: 'lamp', x: 5.4, z: 43.4 },
    { id: 'banner', x: -6.2, z: 50.4, pal: 1 },
    { id: 'banner', x: 6.2, z: 50.4, pal: 1 },
    { id: 'shuttle', x: -49.5, z: -14.5, rot: 0.9 },
    { id: 'shuttle', x: -44, z: -3.2, rot: 2.4 },
    { id: 'crate', x: -38.6, z: -17.4, seed: 0.9 },
    { id: 'lamp', x: -37.4, z: -5.2 },
    { id: 'lamp', x: -54.6, z: -5.6 },
    { id: 'bench', x: 43.2, z: -26.6, rot: -2.2 },
    { id: 'lamp', x: 36.6, z: -28.6 },
    { id: 'crystal', x: 44.6, z: -20.4, scale: 1.2 },
  ],
  crew: [
    {
      role: 'bounty',
      name: 'Ilse',
      title: 'Dispatcher',
      people: 'veiled',
      x: 3.6,
      z: -13.2,
      face: [0, 0],
      color: [84, 108, 156],
      trim: [66, 76, 128],
      seed: 0.31,
    },
    {
      role: 'shop',
      name: 'Bram',
      title: 'Quartermaster',
      people: 'karn',
      x: -16.6,
      z: -2.2,
      face: [0, 0],
      color: [176, 118, 62],
      trim: [232, 164, 48],
      hair: [150, 178, 120],
      seed: 0.12,
    },
    {
      role: 'crew',
      name: 'Oda',
      title: 'Outfitter',
      people: 'unit',
      x: -17.8,
      z: 5.6,
      face: [0, 0],
      color: [70, 150, 150],
      says: ['Bram sells what I mend. Ask him.', 'That rim on the far side: do not lean on it.'],
    },
    {
      role: 'crew',
      name: 'Tam',
      title: 'Pilot',
      people: 'human',
      color: [150, 178, 120],
      trim: [214, 70, 52],
      hair: [74, 77, 94],
      seed: 0.34,
      path: [
        [-40, -9],
        [-12, -3],
        [-3, 6],
        [-12, -3],
      ],
      says: ['Fair winds down there.', 'She flies better than she looks.'],
    },
    {
      role: 'crew',
      name: 'Wren',
      title: 'Surveyor',
      people: 'lynd',
      color: [224, 112, 128],
      trim: [84, 108, 156],
      hair: [236, 228, 210],
      seed: 0.52,
      path: [
        [5, 8],
        [1, 38],
        [5, 8],
        [8, -8],
      ],
      says: ['The pad is quick. The walk back is not.', 'Glasswood is lovely this time of year. Mind the caps.'],
    },
    {
      role: 'crew',
      name: 'Juno',
      title: 'Fitter',
      people: 'human',
      color: [136, 180, 216],
      trim: [226, 176, 52],
      hair: [188, 84, 60],
      seed: 0.83,
      path: [
        [10, 3],
        [14, -2],
        [34, -21],
        [14, -2],
      ],
      says: ['You can see three countries from the overlook.', 'Lamps are mine. If one is out, I know.'],
    },
    {
      role: 'crew',
      name: 'Pell',
      title: 'Runner',
      people: 'lynd',
      color: [226, 176, 52],
      trim: [70, 150, 150],
      hair: [232, 164, 48],
      seed: 0.07,
      path: [
        [-7, -9],
        [7, -9],
        [8, 6],
        [-8, 6],
      ],
      says: ['Ilse has the board. Hall end of the square.', 'Three contracts a day, never the same place twice.'],
    },
    {
      role: 'crew',
      name: 'Dorn',
      title: 'Loader',
      people: 'karn',
      color: [84, 108, 156],
      trim: [150, 142, 132],
      hair: [136, 160, 196],
      seed: 0.66,
      path: [
        [-41, -14],
        [-36, -7],
        [-22, -5],
        [-36, -7],
      ],
      says: ['Crates do not carry themselves. Well. Oda says soon.', 'Mind the skids when one comes in.'],
    },
    {
      role: 'crew',
      name: 'Sable',
      title: 'Cartographer',
      people: 'veiled',
      x: 41.5,
      z: -22.5,
      face: [60, -40],
      color: [126, 92, 150],
      trim: [84, 66, 120],
      seed: 0.9,
      says: [
        'Every island drifts a little. The maps are always a day old.',
        'The ringed one rises again tonight.',
      ],
    },
    {
      role: 'crew',
      name: 'Mako',
      title: 'Sentry',
      people: 'unit',
      x: 3.4,
      z: 41.6,
      face: [0, 30],
      color: [214, 70, 52],
      says: ['Pad is clear.', 'One at a time on the pad, please.'],
    },
  ],
};
