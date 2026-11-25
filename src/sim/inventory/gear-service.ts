import { CLASSES } from '../../data/classes';
import {
  AFFIXES,
  BASES,
  RARITIES,
  SLOTS_OF,
  SLOT_DROP,
  SLOT_WEIGHT,
  STAT_TEXT,
  type AffixDef,
  type GearBaseDef,
  type RarityDef,
} from '../../data/gear';
import { RELICS, RELIC_RARITY } from '../../data/relics';
import { TALENTS } from '../../data/talents';
import type {
  AffixId,
  ClassId,
  EquipSlot,
  GearBaseId,
  ModifierOp,
  RelicId,
  SlotKind,
  StatKey,
  StatModifier,
  TalentId,
  WeaponFamilyId,
} from '../../types/domain';
import type { AffixRoll, GearItem, ItemPower, PlayerSheet } from '../../types/sheet';
import { between, rand, weighted } from '../sim-rng';

interface RollItemOptions {
  ilvl?: number;
  slot?: SlotKind;
  family?: WeaponFamilyId | null;
  rarity?: number;
  cls?: ClassId;
  luck?: number;
  relic?: RelicId;
}

interface GearStatRow {
  stat: StatKey;
  v: string;
  bad: boolean;
}

interface GearLendsInfo {
  name: string;
  ranks: number;
  desc: string;
}

interface GearDescription {
  name: string;
  color: string;
  rarity: string;
  slot: SlotKind;
  family: WeaponFamilyId | '';
  ilvl: number;
  relic: string;
  base: string;
  rows: GearStatRow[];
  lends: GearLendsInfo | null;
  value: number;
}

interface HoneCost {
  parts: number;
  glint: number;
}

let nextUid = 1;
const BASE_IDS = Object.keys(BASES) as GearBaseId[];
const TALENT_IDS = Object.keys(TALENTS) as TalentId[];
const SLOT_DROP_ENTRIES = Object.entries(SLOT_DROP) as [SlotKind, number][];
const affixById = Object.fromEntries(AFFIXES.map((a) => [a.id, a])) as Record<AffixId, AffixDef>;

const PARTS: readonly number[] = [1, 2, 5, 12, 30];
const HONE: readonly number[] = [1, 1.2, 1.6, 2.2, 3];
const HONE_OVER = 2;

export const baseOf = (item: GearItem): GearBaseDef => BASES[item.base];

export function claimUids(sheet: PlayerSheet): void {
  const all: (GearItem | null)[] = [...sheet.gear, ...Object.values(sheet.equip)];
  for (const it of all) {
    if (it && it.uid >= nextUid) nextUid = it.uid + 1;
  }
}

export const rarityOf = (item: GearItem): RarityDef => RARITIES[item.rarity];

export const slotsOf = (item: GearItem): readonly EquipSlot[] => SLOTS_OF(BASES[item.base].slot);

export function targetSlot(sheet: PlayerSheet, item: GearItem): EquipSlot {
  const slots = slotsOf(item);
  if (slots.length === 1) return slots[0];
  const free = slots.find((k) => !sheet.equip[k]);
  if (free) return free;
  const worth = (it: GearItem | null): number => (it ? it.rarity * 100 + it.ilvl : -1);
  return slots.reduce((a, b) => (worth(sheet.equip[b]) < worth(sheet.equip[a]) ? b : a));
}

const roundRoll = (a: AffixDef, v: number): number =>
  a.op === 'inc' || a.max < 1
    ? Math.round(v * 1000) / 1000
    : Math.round(v * 10) / 10 >= 3
      ? Math.round(v)
      : Math.round(v * 10) / 10;

export function rollItem(options: RollItemOptions = {}): GearItem {
  let o = options;
  if (o.relic && RELICS[o.relic]) {
    o = {
      ...o,
      slot: RELICS[o.relic].slot,
      family: o.family || (o.cls ? CLASSES[o.cls].family : null),
      rarity: RELIC_RARITY,
    };
  }
  const ilvl = Math.max(1, Math.round(o.ilvl || 1));
  const luck = o.luck || 0;
  const family = o.family || (o.cls && rand() < 0.75 ? CLASSES[o.cls].family : null);
  const pool = BASE_IDS.filter((id) => {
    const b = BASES[id];
    return (!o.slot || b.slot === o.slot) && (!family || !b.family || b.family === family);
  });
  const slot = o.slot || weighted(SLOT_DROP_ENTRIES);
  const bases = pool.filter((id) => BASES[id].slot === slot);
  const base = bases[Math.floor(rand() * bases.length)] || pool[0];
  let rarity = weighted(
    RARITIES.map((r, i): readonly [number, number] => [i, r.weight * (i ? 1 + luck * i * 1.4 : 1)]),
  );
  if (o.rarity !== undefined) rarity = Math.max(rarity, o.rarity);
  const R = RARITIES[rarity];
  const slotWeight = SLOT_WEIGHT[BASES[base].slot] ?? 1;
  const small = slotWeight < 1;
  const want = Math.max(
    rarity ? 1 : 0,
    R.affixes[0] + Math.floor(rand() * (R.affixes[1] - R.affixes[0] + 1)) - (small ? 1 : 0),
  );
  const open = AFFIXES.filter((a) => !a.slots || a.slots.includes(BASES[base].slot));
  const affixes: AffixRoll[] = [];
  while (affixes.length < want && open.length) {
    const a = open.splice(Math.floor(rand() * open.length), 1)[0];
    affixes.push({
      id: a.id,
      value: roundRoll(a, (between(a.min, a.max) + a.grow * (ilvl - 1) * between(0.7, 1)) * slotWeight),
    });
  }
  let power: ItemPower | null = null;
  if (R.power) {
    const usable = TALENT_IDS.filter((id) => {
      const t = TALENTS[id];
      return !t.skill || !o.cls || CLASSES[o.cls].abilities.includes(t.skill);
    });
    const id = usable[Math.floor(rand() * usable.length)];
    power = { id, ranks: TALENTS[id].max > 1 && rand() < 0.4 ? 2 : 1 };
  }
  const item: GearItem = { uid: nextUid++, base, rarity, ilvl, affixes, power };
  if (o.relic && RELICS[o.relic]) item.relic = o.relic;
  return item;
}

export function itemMods(item: GearItem): StatModifier[] {
  const out: StatModifier[] = [];
  for (const m of BASES[item.base].implicit) {
    out.push({ stat: m.stat, op: m.op, value: m.value + (m.grow || 0) * (item.ilvl - 1) });
  }
  for (const a of item.affixes) {
    const d = affixById[a.id];
    out.push({ stat: d.stat, op: d.op, value: a.value });
  }
  return out;
}

export function itemName(item: GearItem): string {
  const b = BASES[item.base];
  const a = item.affixes;
  if (item.relic && RELICS[item.relic]) return RELICS[item.relic].name;
  if (!a.length) return b.name;
  return `${affixById[a[0].id].word} ${b.name}${a.length > 2 ? ` of ${affixById[a[1].id].of}` : ''}`;
}

function statValue(m: { stat: StatKey; op: ModifierOp; value: number }): { v: string; bad: boolean } {
  const pct = STAT_TEXT[m.stat]?.[1];
  const share = m.op === 'inc' || (pct === '%' && Math.abs(m.value) < 3);
  const n = share
    ? `${Math.round(Math.abs(m.value) * 100)}%`
    : `${Math.round(Math.abs(m.value) * 10) / 10}`;
  return { v: `${m.value < 0 ? '−' : '+'}${n}`, bad: m.value < 0 };
}

function statRows(item: GearItem): GearStatRow[] {
  const rows: { stat: StatKey; op: ModifierOp; value: number }[] = [];
  for (const m of itemMods(item)) {
    const r = rows.find((x) => x.stat === m.stat && x.op === m.op);
    if (r) r.value += m.value;
    else rows.push({ stat: m.stat, op: m.op, value: m.value });
  }
  return rows.map((r) => ({ stat: r.stat, ...statValue(r) }));
}

export function describe(item: GearItem): GearDescription {
  const b = BASES[item.base];
  const R = RARITIES[item.rarity];
  return {
    name: itemName(item),
    color: R.color,
    rarity: R.name,
    slot: b.slot,
    family: b.family || '',
    ilvl: item.ilvl,
    relic: item.relic && RELICS[item.relic] ? RELICS[item.relic].text : '',
    base: b.name,
    rows: statRows(item),
    lends: item.power
      ? {
          name: TALENTS[item.power.id].name,
          ranks: item.power.ranks,
          desc: TALENTS[item.power.id].desc,
        }
      : null,
    value: itemValue(item),
  };
}

export const itemValue = (item: GearItem): number =>
  Math.round((6 + item.ilvl * 3) * RARITIES[item.rarity].worth);

export const itemPrice = (item: GearItem): number => itemValue(item) * 4;

export const salvageYield = (item: GearItem): number =>
  PARTS[item.rarity] + Math.floor(item.ilvl / 3);

export const honeCost = (item: GearItem): HoneCost => ({
  parts: Math.round(3 + (item.ilvl + 1) * HONE[item.rarity]),
  glint: 8 * (item.ilvl + 1),
});

export function honeBar(sheet: PlayerSheet, item: GearItem): string {
  const c = honeCost(item);
  if (item.ilvl >= sheet.level + HONE_OVER) {
    return `Honed as far as a level ${sheet.level} surveyor can take it.`;
  }
  if ((sheet.parts || 0) < c.parts) {
    return `Level ${item.ilvl + 1} takes ${c.parts} parts. You have ${sheet.parts || 0}.`;
  }
  if (sheet.glint < c.glint) {
    return `Level ${item.ilvl + 1} takes ${c.glint} glint.`;
  }
  return '';
}

export function honeItem(item: GearItem): GearItem {
  item.ilvl++;
  for (const a of item.affixes) {
    a.value = Math.round((a.value + affixById[a.id].grow * 0.85) * 1000) / 1000;
  }
  return item;
}

export const canUse = (cls: ClassId, item: GearItem): boolean =>
  !BASES[item.base].family || BASES[item.base].family === CLASSES[cls].family;

export function issue(sheet: PlayerSheet): void {
  const family = CLASSES[sheet.cls].family;
  const weapon = BASE_IDS.find((id) => BASES[id].family === family) ?? 'saber';
  sheet.equip.weapon = { uid: nextUid++, base: weapon, rarity: 0, ilvl: 1, affixes: [], power: null };
  sheet.equip.frame = { uid: nextUid++, base: 'scout', rarity: 0, ilvl: 1, affixes: [], power: null };
}
