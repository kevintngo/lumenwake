// Character maths in one place. Every number the hero has is a base (from
// class, level and attributes) run through one pipeline of modifiers:
//
//   final = (base + all 'flat') x (1 + all 'inc') x each (1 + 'more')
//
// A modifier is { stat, op, value }. Gear contributes them (sim/items.js), so do
// talents; a buff or a class passive would too. Nothing else in the game adds
// to a stat by hand, which is what lets an item roll any line in content/gear.js.

import { BOONS } from '../content/sites.js';
import { newLumen, lumenMods } from './lumen.js';
import { CLASSES } from '../content/classes.js';
import { rank } from '../content/talents.js';
import { itemMods, baseOf } from './items.js';

export const ATTRIBUTES = [
  { id: 'might', name: 'Might', hint: 'Hits harder.' },
  { id: 'grace', name: 'Grace', hint: 'Faster attacks, more critical hits and dodges.' },
  { id: 'vigor', name: 'Vigor', hint: 'More health, quicker recovery, thicker plating.' },
  { id: 'mind', name: 'Mind', hint: 'More focus and stronger techniques.' },
];

export const xpToNext = (level) => Math.round(36 * Math.pow(level, 1.55));
export const POINTS_PER_LEVEL = 3;
export const BAG_GEAR = 20;       // pieces of gear the hero can carry besides what is worn

/** A new surveyor of a class: its attributes, an empty pack, the weapon it is issued (see sim/items.js). */
export function newPlayerSheet(cls = 'vanguard') {
  return {
    cls, level: 1, xp: 0, points: 0, glint: 20,
    talents: {}, picks: 0, offer: null,
    bonus: {},            // talent ranks lent by gear (filled by derive)
    base: { ...CLASSES[cls].attrs },
    gear: [],             // carried gear (item instances)
    equip: { weapon: null, frame: null, unit: null },
    bag: [{ id: 'tonic', n: 3 }, { id: 'draught', n: 1 }, { id: 'wisp_ember', n: 2 }, { id: 'crag_shard', n: 2 }, { id: 'puff_spore', n: 2 }],       // (a first few things to feed the lumen)
    lumen: newLumen(),    // the light at the shoulder (content/companions.js)
    board: 0, missions: 0,
  };
}

/** Every modifier in force on a sheet right now. */
export function modifiers(sheet) {
  const mods = [];
  sheet.bonus = {};
  for (const slot in sheet.equip) {
    const it = sheet.equip[slot];
    if (!it) continue;
    for (const m of itemMods(it)) mods.push(m);
    if (it.power) sheet.bonus[it.power.id] = (sheet.bonus[it.power.id] || 0) + it.power.ranks;
  }
  if (sheet.lumen) mods.push(...lumenMods(sheet.lumen));
  if (sheet.boon && BOONS[sheet.boon]) mods.push(...BOONS[sheet.boon].mods);        // lent by a lit crystal, for one contract
  const tal = (id) => rank(sheet, id);
  if (tal('keen')) mods.push({ stat: 'crit', op: 'flat', value: 0.06 * tal('keen') });
  if (tal('hide')) mods.push({ stat: 'ward', op: 'flat', value: -0.08 * tal('hide') });
  if (tal('feet')) mods.push({ stat: 'speed', op: 'inc', value: 0.06 * tal('feet') });
  if (tal('thrift')) mods.push({ stat: 'thrift', op: 'flat', value: -0.12 * tal('thrift') });
  if (tal('forage')) mods.push({ stat: 'find', op: 'inc', value: 0.25 * tal('forage') });
  return mods;
}

/** Recomputes everything derived from class, level, attributes, gear and talents onto the player entity. */
export function derive(player) {
  const s = player.sheet, L = s.level;
  const mods = modifiers(s);
  const total = (stat, base) => {
    let flat = 0, inc = 0, more = 1;
    for (const m of mods) {
      if (m.stat !== stat) continue;
      if (m.op === 'flat') flat += m.value; else if (m.op === 'inc') inc += m.value; else more *= 1 + m.value;
    }
    return (base + flat) * (1 + inc) * more;
  };
  const a = {};
  for (const at of ATTRIBUTES) a[at.id] = Math.round(total(at.id, s.base[at.id]));
  const st = {
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
    ward: Math.max(0.3, total('ward', 1)),            // the share of a blow that gets through
    thrift: Math.max(0.4, total('thrift', 1)),        // the share of an ability's cost that is paid
    find: total('find', 1),
    lifeOnKill: total('lifeOnKill', 0),
  };
  player.attr = a;
  player.stats = st;
  player.level = L;
  // the names the rest of the rules read
  Object.assign(player, {
    maxHp: st.maxHp, maxFocus: st.maxFocus, attack: st.attack, attackSpeed: st.attackSpeed, crit: st.crit, critDamage: st.critDamage,
    dodge: st.dodge, defense: st.defense, power: st.power, hpRegen: st.hpRegen, focusRegen: st.focusRegen,
    speedMul: st.speed, ward: st.ward, thrift: st.thrift, forage: st.find, lifeOnKill: st.lifeOnKill,
  });
  player.family = s.equip.weapon ? baseOf(s.equip.weapon).family : CLASSES[s.cls].family;
  player.hp = Math.min(player.hp ?? st.maxHp, st.maxHp);
  player.focus = Math.min(player.focus ?? st.maxFocus, st.maxFocus);
}

export function scaleMonster(def, level, elite) {
  const k = level - 1;
  return {
    maxHp: Math.round(def.hp * (1 + 0.3 * k) * (elite ? 3 : 1)),
    atk: def.atk * (1 + 0.2 * k) * (elite ? 1.5 : 1),
    xp: Math.round(def.xp * (1 + 0.38 * k) * (elite ? 4 : 1)),
  };
}

/** Less experience from prey far below your level. */
export const xpFactor = (playerLevel, monsterLevel) => Math.max(0.1, Math.min(1.2, 1 - (playerLevel - monsterLevel - 2) * 0.2));
