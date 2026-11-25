import type { PeopleId, RgbTuple } from '../types/domain';

interface PeopleDef {
  readonly index: number;
  readonly name: string;
  readonly scale: number;
  readonly blurb: string;
  readonly hair: readonly RgbTuple[];
  readonly look?: number;
}

export const PEOPLES: Readonly<Record<PeopleId, PeopleDef>> = {
  human: {
    index: 1,
    name: 'Human',
    scale: 1.0,
    blurb: 'Most of the corps.',
    hair: [
      [122, 62, 44],
      [74, 77, 94],
      [226, 188, 130],
      [176, 128, 84],
      [188, 84, 60],
    ],
  },
  unit: {
    index: 0,
    name: 'Scout unit',
    scale: 1.0,
    blurb: 'A machine of the corps.',
    hair: [[122, 62, 44]],
  },
  veiled: {
    index: 2,
    name: 'Veiled',
    scale: 1.13,
    blurb: 'Tall, quiet, always masked.',
    hair: [[74, 77, 94]],
  },
  karn: {
    index: 3,
    name: 'Karn',
    scale: 1.1,
    blurb: 'Broad, horned and tusked.',
    hair: [
      [150, 178, 120],
      [136, 160, 196],
      [209, 163, 150],
      [150, 142, 132],
    ],
  },
  lynd: {
    index: 4,
    name: 'Lynd',
    scale: 0.92,
    blurb: 'Slight and quick, with tall ears.',
    hair: [
      [226, 176, 110],
      [232, 164, 48],
      [150, 142, 132],
      [236, 228, 210],
      [122, 62, 44],
    ],
  },
};

export const PEOPLE_ORDER: readonly PeopleId[] = ['unit', 'human', 'veiled', 'karn', 'lynd'];
