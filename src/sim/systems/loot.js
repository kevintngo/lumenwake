// Loot and the bag: what monsters drop, picking it up by walking over it,
// using, selling, buying and wearing items.

import { ITEMS, RECIPES } from '../../content/items.js';
import { makeEntity, pencils } from '../entities.js';
import { derive } from '../stats.js';
import { rollItem, itemName, itemValue, itemPrice, canUse, baseOf, salvageYield, honeCost, honeBar, honeItem, targetSlot, slotsOf } from '../items.js';
import { compare } from '../stats.js';
import { RARITIES } from '../../content/gear.js';
import { BAG_GEAR } from '../stats.js';
import { rand } from '../rng.js';

const BAG_SLOTS = 24;

export class Loot {
  constructor(game) {
    this.game = game;
    this.drops = [];
  }

  dropFrom(m) {
    const g = this.game;
    for (const [id, chance, range] of m.def.loot) {
      if (rand() > chance * (m.elite ? 2.5 : 1)) continue;
      let n = range[0] + Math.floor(rand() * (range[1] - range[0] + 1));
      if (id === 'glint') n = Math.round(n * (1 + (m.level - 1) * 0.3) * (m.elite ? 4 : 1) * (g.player.forage ?? 1) * (m.glintMul || 1));
      const a = rand() * 6.283, r = 0.4 + rand() * 0.9;
      const item = ITEMS[id];
      const e = makeEntity('drop', 'drop', {
        x: m.x, z: m.z, y: m.y, tx: m.x + Math.cos(a) * r, tz: m.z + Math.sin(a) * r,
        radius: 0.4, height: 0.7, extra: item.drop, colors: pencils([item.color, item.color, item.color]),
        name: n > 1 ? `${item.name} ×${n}` : item.name, item: id, n, age: 0, grow: 0,
        rare: false,
      });
      g.entities.add(e);
      this.drops.push(e);
    }
    // gear: now and then from anything, often from an elder, always (twice) from a boss
    const times = m.boss ? 2 : rand() < (m.elite ? 0.55 : 0.07) ? 1 : 0;
    for (let k = 0; k < times; k++) {
      this.dropGear(m.x, m.y, m.z, rollItem({ ilvl: m.level, cls: g.player.sheet.cls, luck: (m.boss ? 1.3 : m.elite ? 0.6 : 0) + (m.luck || 0), rarity: m.boss ? 1 : undefined }));
    }
    if (m.boss) g.relics.drop(m);          // and, now and then, one of its own (sim/systems/relics.js)
  }

  /** A piece of gear on the ground, in its rarity's colour. */
  dropGear(x, y, z, item) {
    const g = this.game, R = RARITIES[item.rarity];
    const c = [1, 3, 5].map((i) => parseInt(R.color.slice(i, i + 2), 16));
    const a = rand() * 6.283, r = 0.8 + rand() * 0.9;
    const e = makeEntity('drop', 'drop', {
      x, z, y, tx: x + Math.cos(a) * r, tz: z + Math.sin(a) * r,
      radius: 0.4, height: 0.7, extra: 3, colors: pencils([c, c, c]),
      name: itemName(item), gear: item, item: null, n: 1, age: 0, grow: 0, rare: item.rarity >= 2, rarity: item.rarity,
    });
    g.entities.add(e);
    this.drops.push(e);
    if (item.rarity >= 2) g.bus.emit('drop:rare', { x, y, z, rarity: item.rarity, name: e.name });
    return e;
  }

  /** One thing on the ground at a point, tossed a little way from it. */
  drop(x, y, z, id, n = 1) {
    const g = this.game, item = ITEMS[id];
    const a = rand() * 6.283, r = 0.7 + rand() * 0.9;
    const e = makeEntity('drop', 'drop', {
      x, z, y, tx: x + Math.cos(a) * r, tz: z + Math.sin(a) * r,
      radius: 0.4, height: 0.7, extra: item.drop, colors: pencils([item.color, item.color, item.color]),
      name: n > 1 ? `${item.name} ×${n}` : item.name, item: id, n, age: 0, grow: 0,
      rare: id === 'core',
    });
    g.entities.add(e);
    this.drops.push(e);
    return e;
  }

  /** What a supply pod gives up: glint, a flask more often than not, sometimes a piece of gear; and its survey core, if it held one. */
  spill(x, y, z, tier, core) {
    this.drop(x, y, z, 'glint', Math.round((6 + rand() * 8) * (1 + 0.25 * (tier - 1))));
    if (rand() < 0.6) this.drop(x, y, z, rand() < 0.6 ? 'tonic' : 'draught', 1);
    if (rand() < 0.3) this.dropGear(x, y, z, rollItem({ ilvl: tier, cls: this.game.player.sheet.cls, luck: 0.2 }));
    if (core) this.drop(x, y, z, 'core', 1);
  }

  update(dt) {
    const g = this.game, p = g.player;
    let w = 0;
    for (const d of this.drops) {
      d.age += dt;
      d.grow = Math.min(1, d.grow + dt * 5);
      // toss outward in a little arc, then rest
      const k = Math.min(1, d.age / 0.4);
      d.x += (d.tx - d.x) * Math.min(1, dt * 8); d.z += (d.tz - d.z) * Math.min(1, dt * 8);
      d.lift = Math.sin(k * Math.PI) * 0.6;
      d.y = g.world.surface(d.x, d.z);
      const dist = Math.hypot(d.x - p.x, d.z - p.z);
      if (d.age > 0.45 && !p.dead && dist < 2.6) { // drawn toward the player
        d.tx = p.x; d.tz = p.z;
        if (dist < 0.75 && this.take(d)) { d.gone = true; continue; }
      }
      if (d.age > 120 && !d.keep) { d.gone = true; continue; }
      this.drops[w++] = d;
    }
    this.drops.length = w;
  }

  /** Picks up everything still on the ground that there is room for (the hero is being lifted out). */
  gather() {
    for (const d of this.drops) if (!d.gone && this.take(d)) d.gone = true;
    this.drops = this.drops.filter((d) => !d.gone);
  }

  take(d) {
    const g = this.game, s = g.player.sheet;
    if (d.gear) {
      const relic = d.gear.relic;
      if (s.gear.length >= BAG_GEAR && !relic) { if (!d.warned) { d.warned = true; g.bus.emit('log', { text: 'Your pack holds no more gear. Salvage some from the Gear tab.' }); } return false; }
      if (relic) {
        // an elder's own: there is always room for it, it is kept out of salvage, and it is written down as found
        d.gear.lock = true;
        s.relics = s.relics || {};
        s.relics[relic] = (s.relics[relic] || 0) + 1;
        g.bus.emit('relic:found', { item: d.gear, first: s.relics[relic] === 1 });
      }
      s.gear.push(d.gear);
      g.bus.emit('pickup', { x: d.x, y: d.y, z: d.z, gear: d.gear, name: d.name, rare: d.rare });
      g.bus.emit('bag:changed');
      return true;
    }
    const item = ITEMS[d.item];
    if (item.kind === 'coin') s.glint += d.n;
    else if (!this.add(d.item, d.n)) { if (!d.warned) { d.warned = true; g.bus.emit('log', { text: 'Your bag is full.' }); } return false; }
    g.bus.emit('pickup', { x: d.x, y: d.y, z: d.z, item: d.item, n: d.n, rare: d.rare });
    return true;
  }

  add(id, n) {
    const bag = this.game.player.sheet.bag;
    const stack = bag.find((b) => b.id === id);
    if (stack) stack.n += n;
    else if (bag.length >= BAG_SLOTS) return false;
    else bag.push({ id, n });
    this.game.bus.emit('bag:changed');
    return true;
  }

  count(id) { return this.game.player.sheet.bag.find((b) => b.id === id)?.n || 0; }

  remove(id, n = 1) {
    const bag = this.game.player.sheet.bag;
    const i = bag.findIndex((b) => b.id === id);
    if (i < 0 || bag[i].n < n) return false;
    bag[i].n -= n;
    if (bag[i].n <= 0) bag.splice(i, 1);
    this.game.bus.emit('bag:changed');
    return true;
  }

  /** Drink a flask. */
  use(id) {
    const g = this.game, p = g.player, item = ITEMS[id];
    if (p.dead || !item) return false;
    if (item.kind === 'use') {
      if (p.potionCd > 0) return false;
      const full = item.effect === 'heal' ? p.hp >= p.maxHp : p.focus >= p.maxFocus;
      if (full || !this.remove(id)) return false;
      if (item.effect === 'heal') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * item.power);
      else p.focus = Math.min(p.maxFocus, p.focus + p.maxFocus * item.power);
      p.potionCd = 1.2;
      g.bus.emit('heal', { entity: p, focus: item.effect !== 'heal' });
      g.bus.emit('drink', { item: id });
      return true;
    }
    return false;
  }

  /**
   * Puts on a carried piece (what was worn in that slot goes back in the pack). `slot` picks which of two it goes in
   * (a mod); without it, the empty one or the one holding the lesser piece. Returns the slot it went in, or false.
   */
  equip(uid, slot = null) {
    const g = this.game, p = g.player, s = p.sheet;
    const i = s.gear.findIndex((it) => it.uid === uid);
    if (i < 0) return false;
    const item = s.gear[i];
    if (!canUse(s.cls, item)) { g.bus.emit('log', { text: 'Your class cannot wield that.' }); g.bus.emit('deny'); return false; }
    if (!slot || !slotsOf(item).includes(slot)) slot = targetSlot(s, item);
    const was = s.equip[slot];
    s.gear.splice(i, 1);
    if (was) s.gear.push(was);
    s.equip[slot] = item;
    derive(p);
    g.bus.emit('equip', { item, slot });
    g.bus.emit('bag:changed');
    return slot;
  }

  /** Takes off what is worn in a slot, into the pack (not the weapon: a surveyor always carries one). */
  unequip(slot) {
    const g = this.game, p = g.player, s = p.sheet, it = s.equip[slot];
    if (!it || slot === 'weapon') return false;
    if (s.gear.length >= BAG_GEAR) { g.bus.emit('log', { text: 'Your pack holds no more gear.' }); g.bus.emit('deny'); return false; }
    s.equip[slot] = null;
    s.gear.push(it);
    derive(p);
    g.bus.emit('equip', { item: null, slot });
    g.bus.emit('bag:changed');
    return true;
  }

  // ---- salvage, honing and locks (the numbers are in sim/items.js)
  /** Takes a carried piece apart for parts. A locked piece is left alone. */
  salvage(uid) {
    const g = this.game, s = g.player.sheet;
    const i = s.gear.findIndex((it) => it.uid === uid);
    if (i < 0 || s.gear[i].lock) { g.bus.emit('deny'); return 0; }
    const n = salvageYield(s.gear[i]);
    s.parts = (s.parts || 0) + n;
    s.gear.splice(i, 1);
    g.bus.emit('salvage', { parts: n, pieces: 1 });
    g.bus.emit('bag:changed');
    return n;
  }

  /** The carried pieces a surveyor has no reason to keep: standard and tuned, not locked, and no better than what is worn. */
  spare() {
    const s = this.game.player.sheet;
    return s.gear.filter((it) => it.rarity <= 1 && !it.lock && !(canUse(s.cls, it) && compare(s, it).verdict > 0));
  }

  /** Takes every spare piece apart at once. Returns the parts it made. */
  salvageSpare() {
    const g = this.game, s = g.player.sheet, spare = this.spare();
    if (!spare.length) return 0;
    let n = 0;
    for (const it of spare) n += salvageYield(it);
    s.gear = s.gear.filter((it) => !spare.includes(it));
    s.parts = (s.parts || 0) + n;
    g.bus.emit('salvage', { parts: n, pieces: spare.length });
    g.bus.emit('log', { text: `Salvaged <b class="c-num">${spare.length}</b> ${spare.length === 1 ? 'piece' : 'pieces'}: <b class="c-parts">+${n} parts</b>.` });
    g.bus.emit('bag:changed');
    return n;
  }

  /** Locks a carried piece against salvage and sale, or lets it go again. */
  lock(uid) {
    const g = this.game, it = g.player.sheet.gear.find((x) => x.uid === uid);
    if (!it) return false;
    if (it.lock) delete it.lock; else it.lock = true;
    g.bus.emit('ui:click');
    g.bus.emit('bag:changed');
    return true;
  }

  /** Raises a piece by a level for parts and a fee. key: 'worn:<slot>' or 'gear:<uid>'. */
  hone(key) {
    const g = this.game, p = g.player, s = p.sheet, [kind, id] = String(key).split(':');
    const it = kind === 'worn' ? s.equip[id] : s.gear.find((x) => String(x.uid) === id);
    if (!it) return false;
    const bar = honeBar(s, it);
    if (bar) { g.bus.emit('log', { text: bar }); g.bus.emit('deny'); return false; }
    const c = honeCost(it);
    s.parts -= c.parts; s.glint -= c.glint;
    honeItem(it);
    derive(p);
    g.bus.emit('hone', { item: it, level: it.ilvl });
    g.bus.emit('bag:changed');
    return true;
  }

  /** Sells a carried piece to a trader. */
  sellGear(uid) {
    const g = this.game, s = g.player.sheet;
    const i = s.gear.findIndex((it) => it.uid === uid);
    if (i < 0 || s.gear[i].lock) return false;
    s.glint += itemValue(s.gear[i]);
    s.gear.splice(i, 1);
    g.bus.emit('trade', { sold: 'gear' });
    g.bus.emit('bag:changed');
    return true;
  }

  /** Buys piece i of the outfitter's stock (g.missions.stock). */
  buyGear(i) {
    const g = this.game, s = g.player.sheet, stock = g.missions.stock, item = stock[i];
    if (!item) return false;
    if (s.glint < itemPrice(item)) { g.bus.emit('deny'); g.bus.emit('log', { text: 'Not enough glint.' }); return false; }
    if (s.gear.length >= BAG_GEAR) { g.bus.emit('log', { text: 'Your pack holds no more gear.' }); return false; }
    s.glint -= itemPrice(item);
    s.gear.push(item);
    stock.splice(i, 1);
    g.bus.emit('trade', { bought: 'gear' });
    g.bus.emit('bag:changed');
    return true;
  }

  sell(id, n = 1) {
    const item = ITEMS[id];
    if (!item.value || !this.remove(id, n)) return false;
    this.game.player.sheet.glint += item.value * n;
    this.game.bus.emit('trade', { sold: id, n });
    return true;
  }

  sellMaterials() {
    const s = this.game.player.sheet;
    let total = 0;
    for (const b of [...s.bag]) if (ITEMS[b.id].kind === 'mat') { total += ITEMS[b.id].value * b.n; this.remove(b.id, b.n); }
    s.glint += total;
    if (total) this.game.bus.emit('trade', { total });
    return total;
  }

  /** Makes the i-th recipe from what is carried. */
  craft(i) {
    const g = this.game, s = g.player.sheet, r = RECIPES[i];
    if (!r) return false;
    for (const id in r.needs) if (this.count(id) < r.needs[id]) { g.bus.emit('log', { text: 'You do not carry enough for that.' }); g.bus.emit('deny'); return false; }
    if (s.glint < r.glint) { g.bus.emit('log', { text: 'Not enough glint.' }); g.bus.emit('deny'); return false; }
    // room for the thing made: its stack exists, or a slot is free, or making it empties one
    const frees = Object.keys(r.needs).some((id) => this.count(id) === r.needs[id]);
    if (!this.count(r.id) && s.bag.length >= BAG_SLOTS && !frees) { g.bus.emit('log', { text: 'Your bag is full.' }); return false; }
    for (const id in r.needs) this.remove(id, r.needs[id]);
    s.glint -= r.glint;
    this.add(r.id, 1);
    g.bus.emit('trade', { made: r.id });
    g.bus.emit('log', { text: `Made: <em>${ITEMS[r.id].name}</em>.` });
    return true;
  }

  buy(id) {
    const s = this.game.player.sheet, item = ITEMS[id];
    if (s.glint < item.price) { this.game.bus.emit('log', { text: 'Not enough glint.' }); return false; }
    if (!this.add(id, 1)) { this.game.bus.emit('log', { text: 'Your bag is full.' }); return false; }
    s.glint -= item.price;
    this.game.bus.emit('trade', { bought: id });
    return true;
  }
}
