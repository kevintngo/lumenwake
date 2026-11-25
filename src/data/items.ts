import type { ItemId, RgbTuple } from '../types/domain';

export interface ItemDef {
  readonly name: string;
  readonly kind: 'coin' | 'use' | 'mat';
  readonly drop: number;
  readonly color: RgbTuple;
  readonly effect?: 'heal' | 'focus';
  readonly power?: number;
  readonly value?: number;
  readonly price?: number;
  readonly desc?: string;
}

interface RecipeDef {
  readonly id: ItemId;
  readonly needs: Readonly<Partial<Record<ItemId, number>>>;
  readonly glint: number;
}

export const ITEMS: Readonly<Record<ItemId, ItemDef>> = {
  glint: { name: 'Glint', kind: 'coin', drop: 0, color: [244, 190, 62] },
  tonic: {
    name: 'Red Tonic',
    kind: 'use',
    effect: 'heal',
    power: 0.45,
    value: 12,
    price: 26,
    drop: 2,
    color: [198, 62, 58],
    desc: 'Restores 45% of your health.',
  },
  draught: {
    name: 'Blue Draught',
    kind: 'use',
    effect: 'focus',
    power: 0.6,
    value: 14,
    price: 32,
    drop: 2,
    color: [84, 108, 156],
    desc: 'Restores 60% of your focus.',
  },
  sprout_leaf: {
    name: 'Sprout Leaf',
    kind: 'mat',
    value: 4,
    drop: 1,
    color: [116, 168, 90],
    desc: 'Still a little wriggly.',
  },
  puff_spore: {
    name: 'Puff Spore',
    kind: 'mat',
    value: 6,
    drop: 1,
    color: [224, 92, 70],
    desc: 'Do not sneeze near it.',
  },
  hog_bristle: {
    name: 'Hog Bristle',
    kind: 'mat',
    value: 9,
    drop: 1,
    color: [176, 128, 84],
    desc: 'Stiff as a nail.',
  },
  wisp_ember: {
    name: 'Wisp Ember',
    kind: 'mat',
    value: 12,
    drop: 3,
    color: [136, 180, 216],
    desc: 'Cool to the touch.',
  },
  crag_shard: {
    name: 'Crag Shard',
    kind: 'mat',
    value: 18,
    drop: 3,
    color: [150, 142, 132],
    desc: 'Hums when struck.',
  },
  snap_claw: {
    name: 'Snap Claw',
    kind: 'mat',
    value: 8,
    drop: 1,
    color: [226, 176, 52],
    desc: 'Mind your fingers.',
  },
  core: {
    name: 'Survey Core',
    kind: 'mat',
    value: 30,
    drop: 3,
    color: [136, 180, 216],
    desc: 'What the survey came for. The ship pays for it.',
  },
};

export const SHOP_STOCK: readonly ItemId[] = ['tonic', 'draught'];

export const RECIPES: readonly RecipeDef[] = [
  { id: 'tonic', needs: { sprout_leaf: 3 }, glint: 4 },
  { id: 'draught', needs: { wisp_ember: 2 }, glint: 6 },
];
