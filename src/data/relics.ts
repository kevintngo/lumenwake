import type { BossId, RelicId, SlotKind } from '../types/domain';

export interface RelicDef {
  readonly id: RelicId;
  readonly name: string;
  readonly slot: SlotKind;
  readonly from: BossId;
  readonly text: string;
  readonly mult?: number;
  readonly radius?: number;
  readonly reach?: number;
  readonly every?: number;
  readonly shove?: number;
  readonly each?: number;
  readonly stacks?: number;
  readonly seconds?: number;
  readonly slow?: number;
  readonly more?: number;
  readonly cooldown?: number;
  readonly health?: number;
  readonly pace?: number;
  readonly leaps?: number;
  readonly speed?: number;
}

export const RELICS: Readonly<Record<RelicId, RelicDef>> = {
  quake: {
    id: 'quake',
    name: 'Warden’s Weight',
    slot: 'weapon',
    from: 'warden',
    mult: 0.7,
    radius: 3,
    text: 'The third blow of your chain shakes the ground: 70% of your attack to everything within 3 m of it.',
  },
  thorn: {
    id: 'thorn',
    name: 'Stoneback',
    slot: 'frame',
    from: 'warden',
    mult: 0.8,
    reach: 5,
    every: 1.2,
    shove: 6,
    text: 'A creature that strikes you from close by is struck back for 80% of your attack and thrown off.',
  },
  rot: {
    id: 'rot',
    name: 'Mother’s Bite',
    slot: 'weapon',
    from: 'matron',
    each: 0.18,
    stacks: 3,
    seconds: 4,
    text: 'Your blows leave rot: 18% of your attack a second for 4 seconds, up to three deep.',
  },
  spore: {
    id: 'spore',
    name: 'Sporecase',
    slot: 'unit',
    from: 'matron',
    mult: 0.9,
    radius: 2.6,
    text: 'A creature you fell bursts: 90% of your attack to the others within 2.6 m.',
  },
  chill: {
    id: 'chill',
    name: 'Brinebite',
    slot: 'weapon',
    from: 'sentinel',
    slow: 0.65,
    seconds: 2.5,
    more: 0.2,
    text: 'Your blows slow what they strike by a third, and a slowed creature takes 20% more from you.',
  },
  tide: {
    id: 'tide',
    name: 'Tidestep',
    slot: 'greaves',
    from: 'sentinel',
    cooldown: 0.5,
    text: 'Gale Step costs no focus and is ready in half the time.',
  },
  vigil: {
    id: 'vigil',
    name: 'Last Light',
    slot: 'frame',
    from: 'keeper',
    health: 0.3,
    seconds: 3,
    text: 'Once a contract, a blow that would fell you leaves you standing at 30% health, untouchable for 3 seconds.',
  },
  wick: {
    id: 'wick',
    name: 'Wick',
    slot: 'mod',
    from: 'keeper',
    pace: 0.5,
    leaps: 2,
    reach: 6,
    text: 'Your lumen strikes twice as often, and each of its bolts leaps to two more creatures.',
  },
  meteor: {
    id: 'meteor',
    name: 'Meteor Heel',
    slot: 'boots',
    from: 'drifter',
    mult: 1.6,
    radius: 3.2,
    every: 4,
    text: 'Landing from a jump strikes the ground: 160% of your attack within 3.2 m. Ready every 4 seconds.',
  },
  rush: {
    id: 'rush',
    name: 'Slipstream',
    slot: 'unit',
    from: 'drifter',
    speed: 0.2,
    seconds: 3,
    text: 'Felling a creature makes you a fifth faster, on your feet and with your weapon, for 3 seconds.',
  },
};

export const RELIC_RARITY = 4;
