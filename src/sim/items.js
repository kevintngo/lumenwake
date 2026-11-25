// Items as they exist in a pack: rolling one, reading what it gives, naming and
// pricing it. An item instance is plain data:
//
//   { uid, base, rarity (index), ilvl, affixes: [{ id, value }], power: { id, ranks } | null }
//
// What each of those means is in content/gear.js. Rolling uses the sim's dice,
// so the same contract drops the same gear.

import { rand, between, weighted } from './rng.js';
import { BASES, RARITIES, AFFIXES, STAT_TEXT } from '../content/gear.js';
import { TALENTS } from '../content/talents.js';
import { CLASSES, SLOT_UNLOCK } from '../content/classes.js';

let nextUid = 1;
const affixById = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

export const baseOf = (item) => BASES[item.base];
export const rarityOf = (item) => RARITIES[item.rarity];

/**
 * Rolls an item. o: { ilvl, slot?, family?, rarity? (index, at least), cls?, luck? }.
 * `cls` leans weapons and powers toward what that class can use; `luck` (0..1 and beyond) leans the rarity up.
 */
export function rollItem(o = {}) {
  const ilvl = Math.max(1, Math.round(o.ilvl || 1)), luck = o.luck || 0;
  const family = o.family || (o.cls && rand() < 0.75 ? CLASSES[o.cls].family : null);
  const pool = Object.keys(BASES).filter((id) => {
    const b = BASES[id];
    return (!o.slot || b.slot === o.slot) && (!family || !b.family || b.family === family);
  });
  // a third of drops are weapons unless a slot was asked for
  const slot = o.slot || weighted([['weapon', 4], ['frame', 3], ['unit', 3]]);
  const bases = pool.filter((id) => BASES[id].slot === slot);
  const base = bases[Math.floor(rand() * bases.length)] || pool[0];
  let rarity = weighted(RARITIES.map((r, i) => [i, r.weight * (i ? 1 + luck * i * 1.4 : 1)]));
  if (o.rarity !== undefined) rarity = Math.max(rarity, o.rarity);
  const R = RARITIES[rarity];
  const want = R.affixes[0] + Math.floor(rand() * (R.affixes[1] - R.affixes[0] + 1));
  const open = AFFIXES.filter((a) => !a.slots || a.slots.includes(BASES[base].slot));
  const affixes = [];
  while (affixes.length < want && open.length) {
    const a = open.splice(Math.floor(rand() * open.length), 1)[0];
    affixes.push({ id: a.id, value: round(a, between(a.min, a.max) + a.grow * (ilvl - 1) * between(0.7, 1)) });
  }
  let power = null;
  if (R.power) {
    // a prime piece carries ranks of a talent: one the class it dropped for can use
    const usable = Object.keys(TALENTS).filter((id) => {
      const t = TALENTS[id];
      return !t.skill || !o.cls || CLASSES[o.cls].abilities.includes(t.skill);
    });
    const id = usable[Math.floor(rand() * usable.length)];
    power = { id, ranks: TALENTS[id].max > 1 && rand() < 0.4 ? 2 : 1 };
  }
  return { uid: nextUid++, base, rarity, ilvl, affixes, power };
}

const round = (a, v) => (a.op === 'inc' || a.max < 1 ? Math.round(v * 1000) / 1000 : Math.round(v * 10) / 10 >= 3 ? Math.round(v) : Math.round(v * 10) / 10);

/** The modifiers an item gives while worn. */
export function itemMods(item) {
  const out = [];
  for (const m of BASES[item.base].implicit) out.push({ stat: m.stat, op: m.op, value: m.value + (m.grow || 0) * (item.ilvl - 1) });
  for (const a of item.affixes) { const d = affixById[a.id]; out.push({ stat: d.stat, op: d.op, value: a.value }); }
  return out;
}

/** "Keen Arc Saber of Might" */
export function itemName(item) {
  const b = BASES[item.base], a = item.affixes;
  if (!a.length) return b.name;
  return `${affixById[a[0].id].word} ${b.name}${a.length > 2 ? ` of ${affixById[a[1].id].of}` : ''}`;
}

const line = (m) => {
  const [name, pct] = STAT_TEXT[m.stat] || [m.stat];
  const share = m.op === 'inc' || pct === '%' && Math.abs(m.value) < 3;
  const v = share ? `${m.value > 0 ? '+' : ''}${Math.round(m.value * 100)}%` : `${m.value > 0 ? '+' : ''}${Math.round(m.value * 10) / 10}`;
  return `${v} ${name}`;
};

/** Everything a panel needs to show an item. */
export function describe(item) {
  const b = BASES[item.base], R = RARITIES[item.rarity];
  return {
    name: itemName(item), color: R.color, rarity: R.name, slot: b.slot, family: b.family || '', ilvl: item.ilvl,
    implicit: b.implicit.map((m) => line({ stat: m.stat, op: m.op, value: m.value + (m.grow || 0) * (item.ilvl - 1) })),
    affixes: item.affixes.map((a) => line({ stat: affixById[a.id].stat, op: affixById[a.id].op, value: a.value })),
    power: item.power ? `+${item.power.ranks} to ${TALENTS[item.power.id].name}: ${TALENTS[item.power.id].desc}` : '',
    value: itemValue(item),
  };
}

/** What a trader gives for it. */
export const itemValue = (item) => Math.round((6 + item.ilvl * 3) * RARITIES[item.rarity].worth);
/** What a trader asks for it. */
export const itemPrice = (item) => itemValue(item) * 4;

/** Can this class wield it? (Frames and units fit anyone; a weapon must be of the class's family.) */
export const canUse = (cls, item) => !BASES[item.base].family || BASES[item.base].family === CLASSES[cls].family;

/** The gear a new surveyor is issued: its class's plain weapon and a plain frame. */
export function issue(sheet) {
  const family = CLASSES[sheet.cls].family;
  const weapon = Object.keys(BASES).find((id) => BASES[id].family === family);
  sheet.equip.weapon = { uid: nextUid++, base: weapon, rarity: 0, ilvl: 1, affixes: [], power: null };
  sheet.equip.frame = { uid: nextUid++, base: 'scout', rarity: 0, ilvl: 1, affixes: [], power: null };
}

export { SLOT_UNLOCK };
