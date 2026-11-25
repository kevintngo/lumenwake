// Sites: the landmarks a contract's islands hold (content/sites.js) and what
// happens at each. A survey mark is logged (the contract pays more for every
// one, and better gear for all of them); a beacon shows on the map everything
// still to be found; a lit crystal lends a boon until the hero is lifted out;
// lost cargo is rare gear, with an elder creature that has to be put down first.
//
// A site answers to the hero walking up to it, once its island is quiet. Each
// has a marker turning over it (an entity, so it has a name slip and can be
// clicked on) which goes when the site is used.

import { SITES, BOONS } from '../../content/sites.js';
import { makeEntity, pencils } from '../entities.js';
import { derive } from '../stats.js';
import { rollItem } from '../items.js';
import { pick, rand } from '../rng.js';

export class Sites {
  constructor(game) {
    this.game = game;
    this.list = [];
    game.bus.on('zone', () => this.arrive());
  }

  /** A new place: a marker over every site it was built with. */
  arrive() {
    const g = this.game, w = g.world;
    this.list = [];
    for (const st of w.structures) {
      if (st.role !== 'site') continue;
      const S = SITES[st.site], y = w.surface(st.x, st.z) + st.def.height * st.scale + 0.25;
      const e = g.entities.add(makeEntity('site', 'drop', {
        x: st.x, z: st.z, y, radius: 0.55, height: 0.8, extra: 3, scale: 1.5, colors: pencils([S.color, S.color, S.color]),
        name: S.name, site: st.site, reach: S.reach, age: 1,
      }));
      this.list.push({ st, S, e, room: st.room, used: false, guard: null });
    }
  }

  update() {
    const g = this.game, p = g.player, a = g.missions.active;
    if (!a || p.dead || a.done) return;
    for (const s of this.list) {
      if (s.used) continue;
      const d = Math.hypot(p.x - s.st.x, p.z - s.st.z);
      const quiet = !a.rooms[s.room] || a.rooms[s.room].state !== 'awake';
      if (s.S.guard && !s.guard && quiet && d < 8.5) this.wake(s);
      if (d > s.S.reach || !quiet || (s.guard && !s.guard.dead)) continue;
      this.use(s);
    }
  }

  /** Something was sitting on it. */
  wake(s) {
    const g = this.game, a = g.missions.active, table = g.world.biome().monsters;
    const id = table[Math.floor(rand() * Math.min(3, table.length))][0];
    const ang = rand() * 6.283;
    let x = s.st.x + Math.sin(ang) * 2.6, z = s.st.z + Math.cos(ang) * 2.6;
    if (!g.world.walkable(x, z)) { x = g.world.rooms[s.room].x; z = g.world.rooms[s.room].z; }
    const m = g.spawner.spawnMonster(id, x, z, a.offer.tier, true);
    m.room = s.room; m.ai.provoked = true;
    s.guard = m;
    g.bus.emit('spawn:in', { x, y: g.world.surface(x, z), z, r: m.radius });
    g.bus.emit('site:guard', { site: s.st.site, name: s.S.name, guard: m });
  }

  use(s) {
    const g = this.game, p = g.player, a = g.missions.active, sheet = p.sheet, tier = a.offer.tier;
    const x = s.st.x, z = s.st.z, y = g.world.surface(x, z);
    let text = '';
    if (s.st.site === 'mark') {
      a.marks++;
      g.loot.drop(x, y, z, 'glint', Math.round(8 * (1 + 0.25 * (tier - 1))));
      text = a.marks >= a.markNeed ? 'Every survey mark logged: the contract pays its best.' : `Survey mark logged: ${a.marks} of ${a.markNeed}.`;
    } else if (s.st.site === 'beacon') {
      a.revealed = true;
      g.combat.grantXp(Math.round(14 * (1 + 0.3 * (tier - 1))));
      text = 'Beacon lit: everything left to find is on the map.';
    } else if (s.st.site === 'crystal') {
      sheet.boon = pick(Object.keys(BOONS).filter((id) => id !== sheet.boon));
      derive(p);
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35);
      text = `${BOONS[sheet.boon].name}: ${BOONS[sheet.boon].desc} It lasts until you are lifted out.`;
      g.bus.emit('boon', { entity: p, id: sheet.boon });
    } else if (s.st.site === 'cargo') {
      g.loot.dropGear(x, y, z, rollItem({ ilvl: tier, cls: sheet.cls, rarity: 2, luck: 0.8 }));
      g.loot.drop(x, y, z, 'glint', Math.round(20 * (1 + 0.25 * (tier - 1))));
      g.loot.drop(x, y, z, rand() < 0.5 ? 'tonic' : 'draught', 1);
      text = 'The cargo is yours.';
    }
    s.used = true; s.e.gone = true;
    g.bus.emit('site:used', { site: s.st.site, name: s.S.name, text, x, y, z, color: s.e.colors[0] });
    g.bus.emit('mission:progress', g.missions.track());
  }
}
