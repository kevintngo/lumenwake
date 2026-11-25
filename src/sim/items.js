// Items as they exist in a pack: rolling one, reading what it gives, naming and
// pricing it. An item instance is plain data:
//
//   { uid, base, rarity (index), ilvl, affixes: [{ id, value }], power: { id, ranks } | null }
//   and, on some: relic (an id in content/relics.js: the piece is an elder's, with that power), lock (true: kept out of salvage)
//
// What each of those means is in content/gear.js. Rolling uses the sim's dice,
// so the same contract drops the same gear.

import { rand, between, weighted } from './rng.js';
import { BASES, RARITIES, AFFIXES, STAT_TEXT, SLOT_DROP, SLOT_WEIGHT, SLOTS_OF } from '../content/gear.js';
import { TALENTS } from '../content/talents.js';
import { CLASSES, SLOT_UNLOCK } from '../content/classes.js';
import { RELICS, RELIC_RARITY } from '../content/relics.js';

let nextUid = 1;
const affixById = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

export const baseOf = (item) => BASES[item.base];
/** A sheet read back from a save carries pieces numbered on an earlier visit: new ones are numbered on from them. */
export function claimUids(sheet) {
  for (const it of [...sheet.gear, ...Object.values(sheet.equip)]) if (it && it.uid >= nextUid) nextUid = it.uid + 1;
}
export const rarityOf = (item) => RARITIES[item.rarity];
/** The slots a piece can be worn in (two for a mod). */
export const slotsOf = (item) => SLOTS_OF(BASES[item.base].slot);
/**
 * Where putting a piece on would put it: its own slot, or for a mod the empty one of the two, else the one holding the
 * lesser mod (the rarer, then the higher level, is kept).
 */
export function targetSlot(sheet, item) {
  const slots = slotsOf(item);
  if (slots.length === 1) return slots[0];
  const free = slots.find((k) => !sheet.equip[k]);
  if (free) return free;
  const worth = (it) => it.rarity * 100 + it.ilvl;
  return slots.reduce((a, b) => (worth(sheet.equip[b]) < worth(sheet.equip[a]) ? b : a));
}

/**
 * Rolls an item. o: { ilvl, slot?, family?, rarity? (index, at least), cls?, luck?, relic? }.
 * `cls` leans weapons and powers toward what that class can use; `luck` (0..1 and beyond) leans the rarity up.
 * `relic` (an id in content/relics.js) makes that relic: its slot, a weapon of the class's own family, a relic's four lines.
 */
export function rollItem(o = {}) {
  if (o.relic && RELICS[o.relic]) o = { ...o, slot: RELICS[o.relic].slot, family: o.family || (o.cls ? CLASSES[o.cls].family : null), rarity: RELIC_RARITY };
  const ilvl = Math.max(1, Math.round(o.ilvl || 1)), luck = o.luck || 0;
  const family = o.family || (o.cls && rand() < 0.75 ? CLASSES[o.cls].family : null);
  const pool = Object.keys(BASES).filter((id) => {
    const b = BASES[id];
    return (!o.slot || b.slot === o.slot) && (!family || !b.family || b.family === family);
  });
  // a slot of its own unless one was asked for: a weapon about one drop in six, the rest spread over the other kinds (content/gear.js)
  const slot = o.slot || weighted(Object.entries(SLOT_DROP));
  const bases = pool.filter((id) => BASES[id].slot === slot);
  const base = bases[Math.floor(rand() * bases.length)] || pool[0];
  let rarity = weighted(RARITIES.map((r, i) => [i, r.weight * (i ? 1 + luck * i * 1.4 : 1)]));
  if (o.rarity !== undefined) rarity = Math.max(rarity, o.rarity);
  const R = RARITIES[rarity];
  const small = (SLOT_WEIGHT[BASES[base].slot] ?? 1) < 1;          // (a piece of a newer, smaller kind carries one line fewer)
  const want = Math.max(rarity ? 1 : 0, R.affixes[0] + Math.floor(rand() * (R.affixes[1] - R.affixes[0] + 1)) - (small ? 1 : 0));
  const open = AFFIXES.filter((a) => !a.slots || a.slots.includes(BASES[base].slot));
  const affixes = [];
  while (affixes.length < want && open.length) {
    const a = open.splice(Math.floor(rand() * open.length), 1)[0];
    affixes.push({ id: a.id, value: round(a, (between(a.min, a.max) + a.grow * (ilvl - 1) * between(0.7, 1)) * (SLOT_WEIGHT[BASES[base].slot] ?? 1)) });
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
  const item = { uid: nextUid++, base, rarity, ilvl, affixes, power };
  if (o.relic && RELICS[o.relic]) item.relic = o.relic;
  return item;
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
  if (item.relic && RELICS[item.relic]) return RELICS[item.relic].name;
  if (!a.length) return b.name;
  return `${affixById[a[0].id].word} ${b.name}${a.length > 2 ? ` of ${affixById[a[1].id].of}` : ''}`;
}

const line = (m) => {
  const [name, pct] = STAT_TEXT[m.stat] || [m.stat];
  const share = m.op === 'inc' || pct === '%' && Math.abs(m.value) < 3;
  const v = share ? `${m.value > 0 ? '+' : ''}${Math.round(m.value * 100)}%` : `${m.value > 0 ? '+' : ''}${Math.round(m.value * 10) / 10}`;
  return `${v} ${name}`;
};

/** How one modifier reads: { v: '+15%', bad } (a share for anything that multiplies, a number otherwise). */
export function statValue(m) {
  const pct = (STAT_TEXT[m.stat] || [])[1];
  const share = m.op === 'inc' || pct === '%' && Math.abs(m.value) < 3;
  const n = share ? `${Math.round(Math.abs(m.value) * 100)}%` : `${Math.round(Math.abs(m.value) * 10) / 10}`;
  return { v: `${m.value < 0 ? '−' : '+'}${n}`, bad: m.value < 0 };
}
/** What a piece gives, a row a stat: its own line and its rolled lines, the same stat run together. [{ stat, v, bad }] */
export function statRows(item) {
  const rows = [];
  for (const m of itemMods(item)) {
    const r = rows.find((x) => x.stat === m.stat && x.op === m.op);
    if (r) r.value += m.value; else rows.push({ stat: m.stat, op: m.op, value: m.value });
  }
  return rows.map((r) => ({ stat: r.stat, ...statValue(r) }));
}

/** Everything a panel needs to show an item. */
export function describe(item) {
  const b = BASES[item.base], R = RARITIES[item.rarity];
  return {
    name: itemName(item), color: R.color, rarity: R.name, slot: b.slot, family: b.family || '', ilvl: item.ilvl,
    implicit: b.implicit.map((m) => line({ stat: m.stat, op: m.op, value: m.value + (m.grow || 0) * (item.ilvl - 1) })),
    affixes: item.affixes.map((a) => line({ stat: affixById[a.id].stat, op: affixById[a.id].op, value: a.value })),
    power: item.power ? `+${item.power.ranks} to ${TALENTS[item.power.id].name}: ${TALENTS[item.power.id].desc}` : '',
    relic: item.relic && RELICS[item.relic] ? RELICS[item.relic].text : '', base: b.name, lock: !!item.lock,
    rows: statRows(item), lends: item.power ? { name: TALENTS[item.power.id].name, ranks: item.power.ranks, desc: TALENTS[item.power.id].desc } : null,
    value: itemValue(item),
  };
}

/** What a trader gives for it. */
export const itemValue = (item) => Math.round((6 + item.ilvl * 3) * RARITIES[item.rarity].worth);
/** What a trader asks for it. */
export const itemPrice = (item) => itemValue(item) * 4;

// ---- salvage and honing: a piece nobody wants is taken apart for parts, and parts (with a fee) raise a piece that is
// wanted by a level, as if it had dropped one level higher. A piece can be honed to two levels over its wearer, which is
// as high as the most dangerous place drops them, so a relic can be kept level with what the ground gives, at a price.
const PARTS = [1, 2, 5, 12, 30], HONE = [1, 1.2, 1.6, 2.2, 3];
export const HONE_OVER = 2;
/** The parts a piece comes apart into. */
export const salvageYield = (item) => PARTS[item.rarity] + Math.floor(item.ilvl / 3);
/** What its next level costs. */
export const honeCost = (item) => ({ parts: Math.round(3 + (item.ilvl + 1) * HONE[item.rarity]), glint: 8 * (item.ilvl + 1) });
/** Why it cannot be honed by this surveyor now, or '' if it can. */
export function honeBar(sheet, item) {
  const c = honeCost(item);
  if (item.ilvl >= sheet.level + HONE_OVER) return `Honed as far as a level ${sheet.level} surveyor can take it.`;
  if ((sheet.parts || 0) < c.parts) return `Level ${item.ilvl + 1} takes ${c.parts} parts. You have ${sheet.parts || 0}.`;
  if (sheet.glint < c.glint) return `Level ${item.ilvl + 1} takes ${c.glint} glint.`;
  return '';
}
/** Raises a piece by a level: its own line grows with the level, and each rolled line by what a level is worth to it. */
export function honeItem(item) {
  item.ilvl++;
  for (const a of item.affixes) a.value = Math.round((a.value + affixById[a.id].grow * 0.85) * 1000) / 1000;
  return item;
}

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
