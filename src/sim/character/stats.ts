import { CLASSES } from '../../data/classes';
import { GEAR_SLOTS } from '../../data/gear';
import { BOONS } from '../../data/sites';
import type { AttrKey, ClassId, EquipSlot, ModifierOp, RelicId, StatKey } from '../../types/domain';
import type { CreatureDef, PlayerEntity } from '../../types/entity';
import type { AttrMap, GearItem, PlayerSheet, StatMap } from '../../types/sheet';
import { lumenMods, newLumen } from '../companion/lumen-math';
import { baseOf, itemMods, targetSlot } from '../inventory/gear-service';
import { rank } from './talents';

interface AttributeDef {
  readonly id: AttrKey;
  readonly name: string;
  readonly hint: string;
}

interface CompareLine {
  stat: StatKey;
  by: number;
  pct: boolean;
  up: boolean;
}

interface GearComparison {
  worn: GearItem | null;
  lines: CompareLine[];
  verdict: -1 | 0 | 1;
}

interface ScaledMonsterStats {
  maxHp: number;
  atk: number;
  xp: number;
}

type InternalStatKey = StatKey | 'ward' | 'thrift';

interface InternalModifier {
  readonly stat: InternalStatKey;
  readonly op: ModifierOp;
  readonly value: number;
}

export const ATTRIBUTES: readonly AttributeDef[] = [
  { id: 'might', name: 'Might', hint: 'Hits harder.' },
  { id: 'grace', name: 'Grace', hint: 'Faster attacks, more critical hits and dodges.' },
  { id: 'vigor', name: 'Vigor', hint: 'More health, quicker recovery, thicker plating.' },
  { id: 'mind', name: 'Mind', hint: 'More focus and stronger techniques.' },
];

export const xpToNext = (level: number): number => Math.round(36 * Math.pow(level, 1.55));
export const POINTS_PER_LEVEL = 3;
export const BAG_GEAR = 24;

export function newPlayerSheet(cls: ClassId = 'vanguard'): PlayerSheet {
  const equip = Object.fromEntries(
    GEAR_SLOTS.map(([slot]) => [slot, null]),
  ) as Record<EquipSlot, GearItem | null>;
  return {
    cls,
    people: 'unit',
    level: 1,
    xp: 0,
    points: 0,
    glint: 20,
    parts: 0,
    base: { ...CLASSES[cls].attrs },
    talents: {},
    bonus: {},
    picks: 0,
    offer: null,
    gear: [],
    equip,
    bag: [
      { id: 'tonic', n: 3 },
      { id: 'draught', n: 1 },
      { id: 'wisp_ember', n: 2 },
      { id: 'crag_shard', n: 2 },
      { id: 'puff_spore', n: 2 },
    ],
    lumen: newLumen(),
    board: 0,
    missions: 0,
    first: false,
    threat: {},
    relics: {},
    relicDry: 0,
    boon: null,
  };
}

function collectModifiers(sheet: PlayerSheet, writeBonus: boolean): InternalModifier[] {
  const mods: InternalModifier[] = [];
  const bonus: PlayerSheet['bonus'] = {};
  for (const [slot] of GEAR_SLOTS) {
    const it = sheet.equip[slot];
    if (!it) continue;
    for (const m of itemMods(it)) mods.push(m);
    if (it.power) bonus[it.power.id] = (bonus[it.power.id] || 0) + it.power.ranks;
  }
  const viewSheet = writeBonus ? ((sheet.bonus = bonus), sheet) : { ...sheet, bonus };
  if (sheet.lumen) mods.push(...lumenMods(sheet.lumen));
  if (sheet.boon && BOONS[sheet.boon]) mods.push(...BOONS[sheet.boon].mods);
  const tal = (id: Parameters<typeof rank>[1]): number => rank(viewSheet, id);
  if (tal('keen')) mods.push({ stat: 'crit', op: 'flat', value: 0.06 * tal('keen') });
  if (tal('hide')) mods.push({ stat: 'ward', op: 'flat', value: -0.08 * tal('hide') });
  if (tal('feet')) mods.push({ stat: 'speed', op: 'inc', value: 0.06 * tal('feet') });
  if (tal('thrift')) mods.push({ stat: 'thrift', op: 'flat', value: -0.12 * tal('thrift') });
  if (tal('forage')) mods.push({ stat: 'find', op: 'inc', value: 0.25 * tal('forage') });
  return mods;
}

function evaluateSheet(
  sheet: PlayerSheet,
  writeBonus: boolean,
): { attr: AttrMap; stats: StatMap; ward: number } {
  const L = sheet.level;
  const mods = collectModifiers(sheet, writeBonus);
  const total = (stat: InternalStatKey, base: number): number => {
    let flat = 0;
    let inc = 0;
    let more = 1;
    for (const m of mods) {
      if (m.stat !== stat) continue;
      if (m.op === 'flat') flat += m.value;
      else if (m.op === 'inc') inc += m.value;
      else more *= 1 + m.value;
    }
    return (base + flat) * (1 + inc) * more;
  };
  const a: AttrMap = {
    might: Math.round(total('might', sheet.base.might)),
    grace: Math.round(total('grace', sheet.base.grace)),
    vigor: Math.round(total('vigor', sheet.base.vigor)),
    mind: Math.round(total('mind', sheet.base.mind)),
  };
  const stats: StatMap = {
    might: a.might,
    grace: a.grace,
    vigor: a.vigor,
    mind: a.mind,
    maxHp: Math.round(total('maxHp', 70 + a.vigor * 11 + L * 9)),
    maxFocus: Math.round(total('maxFocus', 30 + a.mind * 6 + L * 2)),
    attack: total('attack', 7 + a.might * 1.7 + L * 1.3),
    attackSpeed: Math.min(2.6, total('attackSpeed', 1.2 + a.grace * 0.022)),
    crit: Math.min(0.6, total('crit', 0.04 + a.grace * 0.006)),
    critDamage: total('critDamage', 1.65),
    dodge: Math.min(0.35, total('dodge', a.grace * 0.005)),
    defense: total('defense', a.vigor * 0.5 + L * 0.4),
    power: total('power', 1 + a.mind * 0.045),
    hpRegen: total('hpRegen', 0.5 + a.vigor * 0.09),
    focusRegen: total('focusRegen', 1.6 + a.mind * 0.13),
    speed: total('speed', 1),
    find: total('find', 1),
    lifeOnKill: total('lifeOnKill', 0),
  };
  const ward = Math.max(0.3, total('ward', 1));
  return { attr: a, stats, ward };
}

export function derive(player: PlayerEntity): void {
  const s = player.sheet;
  const { attr, stats, ward } = evaluateSheet(s, true);
  player.attr = attr;
  const relic: Partial<Record<RelicId, boolean>> = {};
  for (const [slot] of GEAR_SLOTS) {
    const it = s.equip[slot];
    if (it && it.relic) relic[it.relic] = true;
  }
  player.relic = relic;
  player.level = s.level;
  player.maxHp = stats.maxHp;
  player.maxFocus = stats.maxFocus;
  player.attack = stats.attack;
  player.attackSpeed = stats.attackSpeed;
  player.crit = stats.crit;
  player.critDamage = stats.critDamage;
  player.dodge = stats.dodge;
  player.defense = stats.defense;
  player.power = stats.power;
  player.hpRegen = stats.hpRegen;
  player.focusRegen = stats.focusRegen;
  player.speedMul = stats.speed;
  player.ward = ward;
  player.find = stats.find;
  player.lifeOnKill = stats.lifeOnKill;
  player.family = s.equip.weapon ? baseOf(s.equip.weapon).family ?? CLASSES[s.cls].family : CLASSES[s.cls].family;
  player.hp = Math.min(player.hp ?? stats.maxHp, stats.maxHp);
  player.focus = Math.min(player.focus ?? stats.maxFocus, stats.maxFocus);
}

const SHOWN: readonly (readonly [StatKey, number, number])[] = [
  ['attack', 1, 0.1],
  ['attackSpeed', 1, 0.01],
  ['crit', 100, 0.5],
  ['critDamage', 100, 0.5],
  ['power', 100, 0.5],
  ['maxHp', 1, 1],
  ['defense', 1, 0.1],
  ['maxFocus', 1, 1],
  ['hpRegen', 1, 0.05],
  ['focusRegen', 1, 0.05],
  ['speed', 100, 0.5],
  ['dodge', 100, 0.5],
  ['find', 100, 0.5],
  ['lifeOnKill', 1, 0.1],
];

export function compare(sheet: PlayerSheet, item: GearItem): GearComparison {
  const slot = targetSlot(sheet, item);
  const worn = sheet.equip[slot];
  const now = evaluateSheet(sheet, false);
  const then = evaluateSheet({ ...sheet, equip: { ...sheet.equip, [slot]: item } }, false);
  const lines: CompareLine[] = [];
  for (const [key, times, least] of SHOWN) {
    const by = (then.stats[key] - now.stats[key]) * times;
    if (Math.abs(by) >= least) {
      lines.push({ stat: key, by, pct: times === 100, up: by > 0 });
    }
  }
  const adept = sheet.cls === 'adept';
  const hits = (s: StatMap): number =>
    s.attack * s.attackSpeed * (1 + s.crit * (s.critDamage - 1)) * (adept ? s.power : Math.pow(s.power, 0.35));
  const lasts = (s: StatMap, w: number): number =>
    (s.maxHp * (1 + s.defense / 30)) / w / (1 - s.dodge);
  const a = hits(then.stats) / hits(now.stats);
  const b = lasts(then.stats, then.ward) / lasts(now.stats, now.ward);
  const verdict: -1 | 0 | 1 =
    a >= 0.995 && b >= 0.995 && (a > 1.01 || b > 1.01)
      ? 1
      : a <= 1.005 && b <= 1.005 && (a < 0.99 || b < 0.99)
        ? -1
        : 0;
  return { worn, lines, verdict };
}

export function scaleMonster(def: CreatureDef, level: number, elite = false): ScaledMonsterStats {
  const k = level - 1;
  return {
    maxHp: Math.round(def.hp * (1 + 0.3 * k) * (elite ? 3 : 1)),
    atk: def.atk * (1 + 0.2 * k) * (elite ? 1.5 : 1),
    xp: Math.round(def.xp * (1 + 0.38 * k) * (elite ? 4 : 1)),
  };
}

export const xpFactor = (playerLevel: number, monsterLevel: number): number =>
  Math.max(0.1, Math.min(1.2, 1 - (playerLevel - monsterLevel - 2) * 0.2));
