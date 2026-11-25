// Gear: what can be worn, how rare it can be, and what can be rolled onto it.
// An item in a bag is small data ({ base, rarity, ilvl, affixes, power }, see
// sim/items.js); everything it means is looked up here.
//
//   base    what the thing is: its slot, its family (weapons), and what it always gives ("implicit")
//   rarity  how many affixes it carries; the top one also carries a power
//   affix   one rolled line: a stat, how it is applied, and the range it rolls in at item level 1
//
// A modifier is { stat, op, value }: op 'flat' adds, 'inc' adds a share (0.1 = +10%), 'more' multiplies.
// `grow` is how much a number gains per item level.

export const GEAR_SLOTS = [['weapon', 'Weapon'], ['frame', 'Frame'], ['unit', 'Unit']];

export const RARITIES = [
  { id: 'standard', name: 'Standard', color: '#e9eef8', affixes: [0, 0], weight: 58, worth: 1 },
  { id: 'tuned', name: 'Tuned', color: '#a6dbff', affixes: [1, 2], weight: 29, worth: 2 },
  { id: 'rare', name: 'Rare', color: '#ffd84f', affixes: [3, 4], weight: 11, worth: 4 },
  { id: 'prime', name: 'Prime', color: '#ff9a4a', affixes: [4, 4], weight: 2, worth: 9, power: true },
];

export const BASES = {
  saber: { name: 'Arc Saber', slot: 'weapon', family: 'blade', implicit: [{ stat: 'attack', op: 'flat', value: 6, grow: 1.5 }] },
  glaive: { name: 'Split Glaive', slot: 'weapon', family: 'blade', implicit: [{ stat: 'attack', op: 'flat', value: 8, grow: 1.9 }, { stat: 'attackSpeed', op: 'inc', value: -0.1 }] },
  rifle: { name: 'Pulse Rifle', slot: 'weapon', family: 'rifle', implicit: [{ stat: 'attack', op: 'flat', value: 5, grow: 1.3 }] },
  carbine: { name: 'Needle Carbine', slot: 'weapon', family: 'rifle', implicit: [{ stat: 'attack', op: 'flat', value: 4, grow: 1.1 }, { stat: 'attackSpeed', op: 'inc', value: 0.12 }] },
  rod: { name: 'Focus Rod', slot: 'weapon', family: 'wand', implicit: [{ stat: 'attack', op: 'flat', value: 4, grow: 1.0 }, { stat: 'power', op: 'inc', value: 0.08, grow: 0.006 }] },
  prism: { name: 'Prism Staff', slot: 'weapon', family: 'wand', implicit: [{ stat: 'attack', op: 'flat', value: 3, grow: 0.8 }, { stat: 'power', op: 'inc', value: 0.14, grow: 0.008 }] },
  scout: { name: 'Scout Frame', slot: 'frame', implicit: [{ stat: 'defense', op: 'flat', value: 2, grow: 0.6 }, { stat: 'speed', op: 'inc', value: 0.04 }] },
  bulwark: { name: 'Bulwark Frame', slot: 'frame', implicit: [{ stat: 'defense', op: 'flat', value: 4, grow: 1.0 }, { stat: 'maxHp', op: 'inc', value: 0.05 }] },
  core: { name: 'Core Unit', slot: 'unit', implicit: [{ stat: 'maxFocus', op: 'flat', value: 8, grow: 1.4 }] },
  drive: { name: 'Drive Unit', slot: 'unit', implicit: [{ stat: 'hpRegen', op: 'flat', value: 0.5, grow: 0.12 }] },
};

// word: what the affix is called in an item's name (the first rolled names the item, the second follows "of")
export const AFFIXES = [
  { id: 'might', word: 'Heavy', of: 'Might', stat: 'might', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'grace', word: 'Deft', of: 'Grace', stat: 'grace', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'vigor', word: 'Stout', of: 'Vigor', stat: 'vigor', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'mind', word: 'Lucid', of: 'Mind', stat: 'mind', op: 'flat', min: 1, max: 3, grow: 0.12 },
  { id: 'attack', word: 'Honed', of: 'Ruin', stat: 'attack', op: 'inc', min: 0.05, max: 0.12, grow: 0.01, slots: ['weapon', 'unit'] },
  { id: 'haste', word: 'Swift', of: 'Haste', stat: 'attackSpeed', op: 'inc', min: 0.04, max: 0.1, grow: 0.004, slots: ['weapon', 'unit'] },
  { id: 'crit', word: 'Keen', of: 'the Mark', stat: 'crit', op: 'flat', min: 0.02, max: 0.05, grow: 0.002 },
  { id: 'critdmg', word: 'Cruel', of: 'Severing', stat: 'critDamage', op: 'flat', min: 0.1, max: 0.25, grow: 0.01, slots: ['weapon', 'unit'] },
  { id: 'power', word: 'Bright', of: 'Radiance', stat: 'power', op: 'inc', min: 0.05, max: 0.12, grow: 0.008, slots: ['weapon', 'unit'] },
  { id: 'health', word: 'Hale', of: 'the Bulwark', stat: 'maxHp', op: 'inc', min: 0.04, max: 0.1, grow: 0.004, slots: ['frame', 'unit'] },
  { id: 'armor', word: 'Plated', of: 'Warding', stat: 'defense', op: 'flat', min: 1, max: 3, grow: 0.5, slots: ['frame', 'unit'] },
  { id: 'focus', word: 'Deep', of: 'Reserve', stat: 'maxFocus', op: 'flat', min: 5, max: 12, grow: 1.0, slots: ['frame', 'unit'] },
  { id: 'regen', word: 'Mending', of: 'Renewal', stat: 'hpRegen', op: 'flat', min: 0.3, max: 0.8, grow: 0.08, slots: ['frame', 'unit'] },
  { id: 'flow', word: 'Flowing', of: 'Currents', stat: 'focusRegen', op: 'flat', min: 0.3, max: 0.8, grow: 0.06 },
  { id: 'speed', word: 'Fleet', of: 'the Wind', stat: 'speed', op: 'inc', min: 0.03, max: 0.06, grow: 0, slots: ['frame'] },
  { id: 'dodge', word: 'Slippery', of: 'Evasion', stat: 'dodge', op: 'flat', min: 0.02, max: 0.04, grow: 0.001, slots: ['frame', 'unit'] },
  { id: 'find', word: 'Lucky', of: 'Fortune', stat: 'find', op: 'inc', min: 0.08, max: 0.2, grow: 0.005, slots: ['unit', 'frame'] },
  { id: 'leech', word: 'Thirsting', of: 'the Leech', stat: 'lifeOnKill', op: 'flat', min: 2, max: 5, grow: 0.5, slots: ['weapon'] },
];

// How a stat reads on an item or the character sheet: its name, and whether it is shown as a share.
export const STAT_TEXT = {
  might: ['Might'], grace: ['Grace'], vigor: ['Vigor'], mind: ['Mind'],
  attack: ['Attack'], attackSpeed: ['Attack speed', '%'], crit: ['Critical chance', '%'], critDamage: ['Critical damage', '%'],
  power: ['Technique power', '%'], maxHp: ['Health', '%'], maxFocus: ['Focus'], defense: ['Armor'],
  hpRegen: ['Health a second'], focusRegen: ['Focus a second'], speed: ['Movement speed', '%'], dodge: ['Dodge', '%'],
  find: ['Glint found', '%'], lifeOnKill: ['Health on a kill'],
};
