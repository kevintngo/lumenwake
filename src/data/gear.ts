import type {
  AffixId,
  EquipSlot,
  GearBaseId,
  ModifierOp,
  SlotKind,
  StatKey,
  StatModifier,
  WeaponFamilyId,
} from '../types/domain';

export interface RarityDef {
  readonly name: string;
  readonly color: string;
  readonly affixes: readonly [number, number];
  readonly weight: number;
  readonly worth: number;
  readonly power?: boolean;
}

export interface GearBaseDef {
  readonly id: GearBaseId;
  readonly look: number;
  readonly name: string;
  readonly slot: SlotKind;
  readonly family?: WeaponFamilyId;
  readonly implicit: readonly StatModifier[];
}

export interface AffixDef {
  readonly id: AffixId;
  readonly word: string;
  readonly of: string;
  readonly stat: StatKey;
  readonly op: ModifierOp;
  readonly min: number;
  readonly max: number;
  readonly grow: number;
  readonly slots?: readonly SlotKind[];
}

export const GEAR_SLOTS: readonly (readonly [EquipSlot, string])[] = [
  ['weapon', 'Weapon'],
  ['offhand', 'Off-hand'],
  ['unit', 'Unit'],
  ['mod1', 'Mod'],
  ['mod2', 'Mod'],
  ['visor', 'Visor'],
  ['frame', 'Frame'],
  ['grips', 'Grips'],
  ['greaves', 'Greaves'],
  ['boots', 'Boots'],
];

export const SLOT_KINDS: Readonly<Record<SlotKind, string>> = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  unit: 'Unit',
  mod: 'Mod',
  visor: 'Visor',
  frame: 'Frame',
  grips: 'Grips',
  greaves: 'Greaves',
  boots: 'Boots',
};

export const SLOTS_OF = (kind: SlotKind): readonly EquipSlot[] =>
  kind === 'mod' ? ['mod1', 'mod2'] : [kind as EquipSlot];

export const SLOT_DROP: Readonly<Record<SlotKind, number>> = {
  weapon: 3,
  offhand: 1.4,
  unit: 1.4,
  mod: 2,
  visor: 1.5,
  frame: 1.6,
  grips: 1.5,
  greaves: 1.3,
  boots: 1.5,
};

export const SLOT_WEIGHT: Readonly<Record<SlotKind, number>> = {
  weapon: 1,
  frame: 1,
  unit: 1,
  offhand: 0.45,
  visor: 0.35,
  grips: 0.3,
  greaves: 0.3,
  boots: 0.3,
  mod: 0.3,
};

export const RARITIES: readonly RarityDef[] = [
  { name: 'Standard', color: '#e9eef8', affixes: [0, 0], weight: 58, worth: 1 },
  { name: 'Tuned', color: '#a6dbff', affixes: [1, 2], weight: 29, worth: 2 },
  { name: 'Rare', color: '#ffd84f', affixes: [3, 4], weight: 11, worth: 4 },
  { name: 'Prime', color: '#ff9a4a', affixes: [4, 4], weight: 2, worth: 9, power: true },
  { name: 'Relic', color: '#e3b0ff', affixes: [4, 4], weight: 0, worth: 14 },
];

export const BASES: Readonly<Record<GearBaseId, GearBaseDef>> = {
  saber: {
    id: 'saber',
    look: 0,
    name: 'Arc Saber',
    slot: 'weapon',
    family: 'blade',
    implicit: [{ stat: 'attack', op: 'flat', value: 6, grow: 1.5 }],
  },
  glaive: {
    id: 'glaive',
    look: 1,
    name: 'Split Glaive',
    slot: 'weapon',
    family: 'blade',
    implicit: [
      { stat: 'attack', op: 'flat', value: 8, grow: 1.9 },
      { stat: 'attackSpeed', op: 'inc', value: -0.1 },
    ],
  },
  rifle: {
    id: 'rifle',
    look: 0,
    name: 'Pulse Rifle',
    slot: 'weapon',
    family: 'rifle',
    implicit: [{ stat: 'attack', op: 'flat', value: 5, grow: 1.3 }],
  },
  carbine: {
    id: 'carbine',
    look: 1,
    name: 'Needle Carbine',
    slot: 'weapon',
    family: 'rifle',
    implicit: [
      { stat: 'attack', op: 'flat', value: 4, grow: 1.1 },
      { stat: 'attackSpeed', op: 'inc', value: 0.12 },
    ],
  },
  rod: {
    id: 'rod',
    look: 0,
    name: 'Focus Rod',
    slot: 'weapon',
    family: 'wand',
    implicit: [
      { stat: 'attack', op: 'flat', value: 4, grow: 1.0 },
      { stat: 'power', op: 'inc', value: 0.08, grow: 0.006 },
    ],
  },
  prism: {
    id: 'prism',
    look: 1,
    name: 'Prism Staff',
    slot: 'weapon',
    family: 'wand',
    implicit: [
      { stat: 'attack', op: 'flat', value: 3, grow: 0.8 },
      { stat: 'power', op: 'inc', value: 0.14, grow: 0.008 },
    ],
  },
  scout: {
    id: 'scout',
    look: 0,
    name: 'Scout Frame',
    slot: 'frame',
    implicit: [
      { stat: 'defense', op: 'flat', value: 2, grow: 0.6 },
      { stat: 'speed', op: 'inc', value: 0.04 },
    ],
  },
  bulwark: {
    id: 'bulwark',
    look: 1,
    name: 'Bulwark Frame',
    slot: 'frame',
    implicit: [
      { stat: 'defense', op: 'flat', value: 4, grow: 1.0 },
      { stat: 'maxHp', op: 'inc', value: 0.05 },
    ],
  },
  core: {
    id: 'core',
    look: 1,
    name: 'Core Unit',
    slot: 'unit',
    implicit: [{ stat: 'maxFocus', op: 'flat', value: 8, grow: 1.4 }],
  },
  drive: {
    id: 'drive',
    look: 2,
    name: 'Drive Unit',
    slot: 'unit',
    implicit: [{ stat: 'hpRegen', op: 'flat', value: 0.5, grow: 0.12 }],
  },
  ward: {
    id: 'ward',
    look: 0,
    name: 'Arc Ward',
    slot: 'offhand',
    family: 'blade',
    implicit: [
      { stat: 'defense', op: 'flat', value: 1.2, grow: 0.3 },
      { stat: 'maxHp', op: 'inc', value: 0.03 },
    ],
  },
  cell: {
    id: 'cell',
    look: 1,
    name: 'Charge Cell',
    slot: 'offhand',
    family: 'rifle',
    implicit: [
      { stat: 'attackSpeed', op: 'inc', value: 0.04 },
      { stat: 'crit', op: 'flat', value: 0.01 },
    ],
  },
  lens: {
    id: 'lens',
    look: 2,
    name: 'Focus Lens',
    slot: 'offhand',
    family: 'wand',
    implicit: [
      { stat: 'power', op: 'inc', value: 0.035, grow: 0.002 },
      { stat: 'focusRegen', op: 'flat', value: 0.2, grow: 0.03 },
    ],
  },
  visor: {
    id: 'visor',
    look: 0,
    name: 'Scout Visor',
    slot: 'visor',
    implicit: [
      { stat: 'crit', op: 'flat', value: 0.01 },
      { stat: 'defense', op: 'flat', value: 0.3, grow: 0.1 },
    ],
  },
  crest: {
    id: 'crest',
    look: 1,
    name: 'Crest Helm',
    slot: 'visor',
    implicit: [{ stat: 'defense', op: 'flat', value: 0.9, grow: 0.22 }],
  },
  grip: {
    id: 'grip',
    look: 0,
    name: 'Grip Gloves',
    slot: 'grips',
    implicit: [{ stat: 'attackSpeed', op: 'inc', value: 0.025 }],
  },
  gauntlet: {
    id: 'gauntlet',
    look: 1,
    name: 'Power Gauntlets',
    slot: 'grips',
    implicit: [
      { stat: 'attack', op: 'flat', value: 0.8, grow: 0.18 },
      { stat: 'defense', op: 'flat', value: 0.3, grow: 0.1 },
    ],
  },
  greave: {
    id: 'greave',
    look: 0,
    name: 'Shin Plates',
    slot: 'greaves',
    implicit: [{ stat: 'defense', op: 'flat', value: 0.9, grow: 0.22 }],
  },
  trail: {
    id: 'trail',
    look: 0,
    name: 'Trail Boots',
    slot: 'boots',
    implicit: [{ stat: 'speed', op: 'inc', value: 0.03 }],
  },
  mag: {
    id: 'mag',
    look: 1,
    name: 'Mag Boots',
    slot: 'boots',
    implicit: [
      { stat: 'defense', op: 'flat', value: 0.6, grow: 0.15 },
      { stat: 'speed', op: 'inc', value: 0.015 },
    ],
  },
  chip: {
    id: 'chip',
    look: 0,
    name: 'Signal Chip',
    slot: 'mod',
    implicit: [{ stat: 'crit', op: 'flat', value: 0.008 }],
  },
  coil: {
    id: 'coil',
    look: 1,
    name: 'Coil Ring',
    slot: 'mod',
    implicit: [{ stat: 'maxFocus', op: 'flat', value: 3, grow: 0.4 }],
  },
};

export const AFFIXES: readonly AffixDef[] = [
  { id: 'might', word: 'Heavy', of: 'Might', stat: 'might', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'grace', word: 'Deft', of: 'Grace', stat: 'grace', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'vigor', word: 'Stout', of: 'Vigor', stat: 'vigor', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'mind', word: 'Lucid', of: 'Mind', stat: 'mind', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'attack', word: 'Honed', of: 'Ruin', stat: 'attack', op: 'inc', min: 0.05, max: 0.12, grow: 0.01, slots: ['weapon', 'unit', 'grips', 'mod'] },
  { id: 'haste', word: 'Swift', of: 'Haste', stat: 'attackSpeed', op: 'inc', min: 0.04, max: 0.1, grow: 0.004, slots: ['weapon', 'unit', 'grips', 'offhand', 'mod'] },
  { id: 'crit', word: 'Keen', of: 'the Mark', stat: 'crit', op: 'flat', min: 0.02, max: 0.05, grow: 0.002 },
  { id: 'critdmg', word: 'Cruel', of: 'Severing', stat: 'critDamage', op: 'flat', min: 0.1, max: 0.25, grow: 0.01, slots: ['weapon', 'unit', 'grips', 'visor', 'mod'] },
  { id: 'power', word: 'Bright', of: 'Radiance', stat: 'power', op: 'inc', min: 0.05, max: 0.12, grow: 0.008, slots: ['weapon', 'unit', 'offhand', 'visor', 'mod'] },
  { id: 'health', word: 'Hale', of: 'the Bulwark', stat: 'maxHp', op: 'inc', min: 0.04, max: 0.1, grow: 0.004, slots: ['frame', 'unit', 'offhand', 'visor', 'greaves'] },
  { id: 'armor', word: 'Plated', of: 'Warding', stat: 'defense', op: 'flat', min: 1, max: 3, grow: 0.5, slots: ['frame', 'unit', 'offhand', 'visor', 'grips', 'greaves', 'boots'] },
  { id: 'focus', word: 'Deep', of: 'Reserve', stat: 'maxFocus', op: 'flat', min: 5, max: 12, grow: 1.0, slots: ['frame', 'unit', 'offhand', 'visor', 'mod'] },
  { id: 'regen', word: 'Mending', of: 'Renewal', stat: 'hpRegen', op: 'flat', min: 0.3, max: 0.8, grow: 0.08, slots: ['frame', 'unit', 'greaves', 'mod'] },
  { id: 'flow', word: 'Flowing', of: 'Currents', stat: 'focusRegen', op: 'flat', min: 0.3, max: 0.8, grow: 0.06 },
  { id: 'speed', word: 'Fleet', of: 'the Wind', stat: 'speed', op: 'inc', min: 0.03, max: 0.06, grow: 0, slots: ['frame', 'boots', 'greaves'] },
  { id: 'dodge', word: 'Slippery', of: 'Evasion', stat: 'dodge', op: 'flat', min: 0.02, max: 0.04, grow: 0.001, slots: ['frame', 'unit', 'boots', 'greaves'] },
  { id: 'find', word: 'Lucky', of: 'Fortune', stat: 'find', op: 'inc', min: 0.08, max: 0.2, grow: 0.005, slots: ['unit', 'frame', 'visor', 'mod'] },
  { id: 'leech', word: 'Thirsting', of: 'the Leech', stat: 'lifeOnKill', op: 'flat', min: 2, max: 5, grow: 0.5, slots: ['weapon', 'grips', 'mod'] },
];

export const STAT_TEXT: Readonly<Record<StatKey, readonly [string, string?]>> = {
  might: ['Might'],
  grace: ['Grace'],
  vigor: ['Vigor'],
  mind: ['Mind'],
  attack: ['Attack'],
  attackSpeed: ['Attack speed', '%'],
  crit: ['Critical chance', '%'],
  critDamage: ['Critical damage', '%'],
  power: ['Technique power', '%'],
  maxHp: ['Health', '%'],
  maxFocus: ['Focus'],
  defense: ['Armor'],
  hpRegen: ['Health a second'],
  focusRegen: ['Focus a second'],
  speed: ['Movement speed', '%'],
  dodge: ['Dodge', '%'],
  find: ['Glint found', '%'],
  lifeOnKill: ['Health on a kill'],
};
