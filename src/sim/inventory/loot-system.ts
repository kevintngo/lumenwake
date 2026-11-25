import { RARITIES } from '../../data/gear';
import { ITEMS, RECIPES } from '../../data/items';
import type { EquipSlot, ItemId, RgbTuple } from '../../types/domain';
import type { DropEntity, MonsterEntity } from '../../types/entity';
import type { GameContext, LootLike } from '../../types/game-context';
import type { GearItem } from '../../types/sheet';
import { BAG_GEAR, compare, derive } from '../character/stats';
import { makeEntity, pencils } from '../entities';
import { rand } from '../sim-rng';
import {
  canUse,
  honeBar,
  honeCost,
  honeItem,
  itemName,
  itemPrice,
  itemValue,
  rollItem,
  salvageYield,
  slotsOf,
  targetSlot,
} from './gear-service';

const BAG_SLOTS = 24;

interface DropMeta {
  tx: number;
  tz: number;
  rare: boolean;
  warned: boolean;
}

export class Loot implements LootLike {
  private readonly game: GameContext;
  private readonly meta = new WeakMap<DropEntity, DropMeta>();
  drops: DropEntity[] = [];

  constructor(game: GameContext) {
    this.game = game;
  }

  dropFrom(m: MonsterEntity): void {
    const g = this.game;
    for (const [id, chance, range] of m.def.loot) {
      if (rand() > chance * (m.elite ? 2.5 : 1)) continue;
      let n = range[0] + Math.floor(rand() * (range[1] - range[0] + 1));
      if (id === 'glint') {
        n = Math.round(
          n *
            (1 + (m.level - 1) * 0.3) *
            (m.elite ? 4 : 1) *
            (g.player.find ?? 1) *
            (m.glintMul || 1),
        );
      }
      const a = rand() * 6.283;
      const r = 0.4 + rand() * 0.9;
      const item = ITEMS[id];
      const e = makeEntity<DropEntity>('drop', 'drop', {
        x: m.x,
        z: m.z,
        y: m.y,
        radius: 0.4,
        height: 0.7,
        extra: item.drop,
        colors: pencils([item.color, item.color, item.color]),
        name: n > 1 ? `${item.name} ×${n}` : item.name,
        item: id,
        gear: null,
        n,
        age: 0,
        grow: 0,
      });
      this.meta.set(e, {
        tx: m.x + Math.cos(a) * r,
        tz: m.z + Math.sin(a) * r,
        rare: false,
        warned: false,
      });
      g.entities.add(e);
      this.drops.push(e);
    }
    const times = m.boss ? 2 : rand() < (m.elite ? 0.55 : 0.07) ? 1 : 0;
    for (let k = 0; k < times; k++) {
      this.dropGear(
        m.x,
        m.y,
        m.z,
        rollItem({
          ilvl: m.level,
          cls: g.player.sheet.cls,
          luck: (m.boss ? 1.3 : m.elite ? 0.6 : 0) + (m.luck || 0),
          rarity: m.boss ? 1 : undefined,
        }),
      );
    }
    if (m.boss) g.relics.drop(m);
  }

  dropGear(x: number, y: number, z: number, item: GearItem): DropEntity {
    const g = this.game;
    const R = RARITIES[item.rarity];
    const c: RgbTuple = [
      parseInt(R.color.slice(1, 3), 16),
      parseInt(R.color.slice(3, 5), 16),
      parseInt(R.color.slice(5, 7), 16),
    ];
    const a = rand() * 6.283;
    const r = 0.8 + rand() * 0.9;
    const e = makeEntity<DropEntity>('drop', 'drop', {
      x,
      z,
      y,
      radius: 0.4,
      height: 0.7,
      extra: 3,
      colors: pencils([c, c, c]),
      name: itemName(item),
      gear: item,
      item: null,
      n: 1,
      age: 0,
      grow: 0,
    });
    this.meta.set(e, {
      tx: x + Math.cos(a) * r,
      tz: z + Math.sin(a) * r,
      rare: item.rarity >= 2,
      warned: false,
    });
    g.entities.add(e);
    this.drops.push(e);
    if (item.rarity >= 2) {
      g.bus.emit('drop:rare', { x, y, z, rarity: item.rarity });
    }
    return e;
  }

  drop(x: number, y: number, z: number, id: ItemId, n = 1): DropEntity {
    const g = this.game;
    const item = ITEMS[id];
    const a = rand() * 6.283;
    const r = 0.7 + rand() * 0.9;
    const e = makeEntity<DropEntity>('drop', 'drop', {
      x,
      z,
      y,
      radius: 0.4,
      height: 0.7,
      extra: item.drop,
      colors: pencils([item.color, item.color, item.color]),
      name: n > 1 ? `${item.name} ×${n}` : item.name,
      item: id,
      gear: null,
      n,
      age: 0,
      grow: 0,
    });
    this.meta.set(e, {
      tx: x + Math.cos(a) * r,
      tz: z + Math.sin(a) * r,
      rare: id === 'core',
      warned: false,
    });
    g.entities.add(e);
    this.drops.push(e);
    return e;
  }

  spill(x: number, y: number, z: number, tier: number, core = false): void {
    this.drop(x, y, z, 'glint', Math.round((6 + rand() * 8) * (1 + 0.25 * (tier - 1))));
    if (rand() < 0.6) this.drop(x, y, z, rand() < 0.6 ? 'tonic' : 'draught', 1);
    if (rand() < 0.3) {
      this.dropGear(x, y, z, rollItem({ ilvl: tier, cls: this.game.player.sheet.cls, luck: 0.2 }));
    }
    if (core) this.drop(x, y, z, 'core', 1);
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    let w = 0;
    for (const d of this.drops) {
      const m = this.meta.get(d);
      const tx = m ? m.tx : d.x;
      const tz = m ? m.tz : d.z;
      d.age += dt;
      d.grow = Math.min(1, d.grow + dt * 5);
      const k = Math.min(1, d.age / 0.4);
      d.x += (tx - d.x) * Math.min(1, dt * 8);
      d.z += (tz - d.z) * Math.min(1, dt * 8);
      d.lift = Math.sin(k * Math.PI) * 0.6;
      d.y = g.world.surface(d.x, d.z);
      const dist = Math.hypot(d.x - p.x, d.z - p.z);
      if (d.age > 0.45 && !p.dead && dist < 2.6) {
        if (m) {
          m.tx = p.x;
          m.tz = p.z;
        }
        if (dist < 0.75 && this.take(d)) {
          d.gone = true;
          continue;
        }
      }
      if (d.age > 120) {
        d.gone = true;
        continue;
      }
      this.drops[w++] = d;
    }
    this.drops.length = w;
  }

  gather(): void {
    for (const d of this.drops) {
      if (!d.gone && this.take(d)) d.gone = true;
    }
    this.drops = this.drops.filter((d) => !d.gone);
  }

  private take(d: DropEntity): boolean {
    const g = this.game;
    const s = g.player.sheet;
    const m = this.meta.get(d);
    const rare = m ? m.rare : false;
    if (d.gear) {
      const relic = d.gear.relic;
      if (s.gear.length >= BAG_GEAR && !relic) {
        if (m && !m.warned) {
          m.warned = true;
          g.bus.emit('log', { text: 'Your pack holds no more gear. Salvage some from the Gear tab.' });
        }
        return false;
      }
      if (relic) {
        d.gear.lock = true;
        s.relics = s.relics || {};
        s.relics[relic] = (s.relics[relic] || 0) + 1;
        g.bus.emit('relic:found', { id: relic, item: d.gear });
      }
      s.gear.push(d.gear);
      g.bus.emit('pickup', { x: d.x, y: d.y, z: d.z, gear: d.gear, rare });
      g.bus.emit('bag:changed');
      return true;
    }
    if (!d.item) return false;
    const item = ITEMS[d.item];
    if (item.kind === 'coin') {
      s.glint += d.n;
    } else if (!this.add(d.item, d.n)) {
      if (m && !m.warned) {
        m.warned = true;
        g.bus.emit('log', { text: 'Your bag is full.' });
      }
      return false;
    }
    g.bus.emit('pickup', { x: d.x, y: d.y, z: d.z, item: d.item, n: d.n, rare });
    return true;
  }

  add(id: ItemId, n: number): boolean {
    const bag = this.game.player.sheet.bag;
    const stack = bag.find((b) => b.id === id);
    if (stack) stack.n += n;
    else if (bag.length >= BAG_SLOTS) return false;
    else bag.push({ id, n });
    this.game.bus.emit('bag:changed');
    return true;
  }

  count(id: ItemId): number {
    return this.game.player.sheet.bag.find((b) => b.id === id)?.n || 0;
  }

  remove(id: ItemId, n = 1): boolean {
    const bag = this.game.player.sheet.bag;
    const i = bag.findIndex((b) => b.id === id);
    if (i < 0 || bag[i].n < n) return false;
    bag[i].n -= n;
    if (bag[i].n <= 0) bag.splice(i, 1);
    this.game.bus.emit('bag:changed');
    return true;
  }

  use(id: ItemId): boolean {
    const g = this.game;
    const p = g.player;
    const item = ITEMS[id];
    if (p.dead || !item || item.kind !== 'use') return false;
    if (p.potionCd > 0) return false;
    const full = item.effect === 'heal' ? p.hp >= p.maxHp : p.focus >= p.maxFocus;
    if (full || !this.remove(id)) return false;
    const power = item.power ?? 0;
    let amount = 0;
    if (item.effect === 'heal') {
      const next = Math.min(p.maxHp, p.hp + p.maxHp * power);
      amount = Math.round(next - p.hp);
      p.hp = next;
    } else {
      const next = Math.min(p.maxFocus, p.focus + p.maxFocus * power);
      amount = Math.round(next - p.focus);
      p.focus = next;
    }
    p.potionCd = 1.2;
    g.bus.emit('heal', { entity: p, amount, focus: item.effect !== 'heal' });
    g.bus.emit('drink', { id });
    return true;
  }

  equip(uid: number, slot: EquipSlot | null = null): boolean {
    const g = this.game;
    const p = g.player;
    const s = p.sheet;
    const i = s.gear.findIndex((it) => it.uid === uid);
    if (i < 0) return false;
    const item = s.gear[i];
    if (!canUse(s.cls, item)) {
      g.bus.emit('log', { text: 'Your class cannot wield that.' });
      g.bus.emit('deny', {});
      return false;
    }
    const target: EquipSlot =
      slot && slotsOf(item).includes(slot) ? slot : targetSlot(s, item);
    const was = s.equip[target];
    s.gear.splice(i, 1);
    if (was) s.gear.push(was);
    s.equip[target] = item;
    derive(p);
    g.bus.emit('equip', { item, slot: target });
    g.bus.emit('bag:changed');
    return true;
  }

  unequip(slot: EquipSlot): boolean {
    const g = this.game;
    const p = g.player;
    const s = p.sheet;
    const it = s.equip[slot];
    if (!it || slot === 'weapon') return false;
    if (s.gear.length >= BAG_GEAR) {
      g.bus.emit('log', { text: 'Your pack holds no more gear.' });
      g.bus.emit('deny', {});
      return false;
    }
    s.equip[slot] = null;
    s.gear.push(it);
    derive(p);
    g.bus.emit('equip', { item: null, slot });
    g.bus.emit('bag:changed');
    return true;
  }

  salvage(uid: number): boolean {
    const g = this.game;
    const s = g.player.sheet;
    const i = s.gear.findIndex((it) => it.uid === uid);
    if (i < 0 || s.gear[i].lock) {
      g.bus.emit('deny', {});
      return false;
    }
    const n = salvageYield(s.gear[i]);
    s.parts = (s.parts || 0) + n;
    s.gear.splice(i, 1);
    g.bus.emit('salvage', { parts: n, count: 1 });
    g.bus.emit('bag:changed');
    return true;
  }

  spare(): GearItem[] {
    const s = this.game.player.sheet;
    return s.gear.filter(
      (it) => it.rarity <= 1 && !it.lock && !(canUse(s.cls, it) && compare(s, it).verdict > 0),
    );
  }

  salvageSpare(): number {
    const g = this.game;
    const s = g.player.sheet;
    const spare = this.spare();
    if (!spare.length) return 0;
    let n = 0;
    for (const it of spare) n += salvageYield(it);
    s.gear = s.gear.filter((it) => !spare.includes(it));
    s.parts = (s.parts || 0) + n;
    g.bus.emit('salvage', { parts: n, count: spare.length });
    g.bus.emit('log', {
      text: `Salvaged <b class="c-num">${spare.length}</b> ${spare.length === 1 ? 'piece' : 'pieces'}: <b class="c-parts">+${n} parts</b>.`,
    });
    g.bus.emit('bag:changed');
    return n;
  }

  lock(uid: number): boolean {
    const g = this.game;
    const it = g.player.sheet.gear.find((x) => x.uid === uid);
    if (!it) return false;
    if (it.lock) delete it.lock;
    else it.lock = true;
    g.bus.emit('ui:click');
    g.bus.emit('bag:changed');
    return true;
  }

  hone(key: string): boolean {
    const g = this.game;
    const p = g.player;
    const s = p.sheet;
    const [kind, id] = String(key).split(':');
    const it =
      kind === 'worn'
        ? s.equip[id as EquipSlot]
        : s.gear.find((x) => String(x.uid) === id) ?? null;
    if (!it) return false;
    const bar = honeBar(s, it);
    if (bar) {
      g.bus.emit('log', { text: bar });
      g.bus.emit('deny', {});
      return false;
    }
    const c = honeCost(it);
    s.parts -= c.parts;
    s.glint -= c.glint;
    honeItem(it);
    derive(p);
    g.bus.emit('hone', { item: it });
    g.bus.emit('bag:changed');
    return true;
  }

  sellGear(uid: number): boolean {
    const g = this.game;
    const s = g.player.sheet;
    const i = s.gear.findIndex((it) => it.uid === uid);
    if (i < 0 || s.gear[i].lock) return false;
    const item = s.gear[i];
    const glint = itemValue(item);
    s.glint += glint;
    s.gear.splice(i, 1);
    g.bus.emit('trade', { kind: 'sell', name: itemName(item), glint });
    g.bus.emit('bag:changed');
    return true;
  }

  buyGear(i: number): boolean {
    const g = this.game;
    const s = g.player.sheet;
    const stock = g.missions.stock;
    const item = stock[i];
    if (!item) return false;
    const price = itemPrice(item);
    if (s.glint < price) {
      g.bus.emit('deny', {});
      g.bus.emit('log', { text: 'Not enough glint.' });
      return false;
    }
    if (s.gear.length >= BAG_GEAR) {
      g.bus.emit('log', { text: 'Your pack holds no more gear.' });
      return false;
    }
    s.glint -= price;
    s.gear.push(item);
    stock.splice(i, 1);
    g.bus.emit('trade', { kind: 'buy', name: itemName(item), glint: price });
    g.bus.emit('bag:changed');
    return true;
  }

  sell(id: ItemId, n = 1): boolean {
    const item = ITEMS[id];
    if (!item.value || !this.remove(id, n)) return false;
    const glint = item.value * n;
    this.game.player.sheet.glint += glint;
    this.game.bus.emit('trade', { kind: 'sell', name: item.name, glint });
    return true;
  }

  sellMaterials(): number {
    const s = this.game.player.sheet;
    let total = 0;
    for (const b of [...s.bag]) {
      const def = ITEMS[b.id];
      if (def.kind === 'mat' && def.value) {
        total += def.value * b.n;
        this.remove(b.id, b.n);
      }
    }
    s.glint += total;
    if (total) this.game.bus.emit('trade', { kind: 'sell', glint: total });
    return total;
  }

  craft(i: number): boolean {
    const g = this.game;
    const s = g.player.sheet;
    const r = RECIPES[i];
    if (!r) return false;
    const needIds = Object.keys(r.needs) as ItemId[];
    for (const id of needIds) {
      const req = r.needs[id] ?? 0;
      if (this.count(id) < req) {
        g.bus.emit('log', { text: 'You do not carry enough for that.' });
        g.bus.emit('deny', {});
        return false;
      }
    }
    if (s.glint < r.glint) {
      g.bus.emit('log', { text: 'Not enough glint.' });
      g.bus.emit('deny', {});
      return false;
    }
    const frees = needIds.some((id) => this.count(id) === (r.needs[id] ?? 0));
    if (!this.count(r.id) && s.bag.length >= BAG_SLOTS && !frees) {
      g.bus.emit('log', { text: 'Your bag is full.' });
      return false;
    }
    for (const id of needIds) {
      const req = r.needs[id] ?? 0;
      if (req > 0) this.remove(id, req);
    }
    s.glint -= r.glint;
    this.add(r.id, 1);
    g.bus.emit('trade', { kind: 'craft', name: ITEMS[r.id].name, glint: r.glint });
    g.bus.emit('log', { text: `Made: <em>${ITEMS[r.id].name}</em>.` });
    return true;
  }

  buy(id: ItemId): boolean {
    const s = this.game.player.sheet;
    const item = ITEMS[id];
    if (!item.price) return false;
    if (s.glint < item.price) {
      this.game.bus.emit('log', { text: 'Not enough glint.' });
      return false;
    }
    if (!this.add(id, 1)) {
      this.game.bus.emit('log', { text: 'Your bag is full.' });
      return false;
    }
    s.glint -= item.price;
    this.game.bus.emit('trade', { kind: 'buy', name: item.name, glint: item.price });
    return true;
  }
}
