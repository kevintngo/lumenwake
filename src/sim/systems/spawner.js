// Brings creatures and crew into the zone and lets the dead go. What appears,
// where and when is the mission's business (systems/missions.js); this only
// knows how to make one.

import { CREATURES } from '../../content/creatures.js';
import { makeEntity, pencils } from '../entities.js';
import { scaleMonster } from '../stats.js';
import { rand } from '../rng.js';
import { PEOPLES } from '../../content/peoples.js';

// the crew wear their own pencils (coat, hat or hood, hair); vermilion stays the hero's
const NPC_LOOKS = {
  shop: { extra: 1, colors: [[150, 178, 120], [222, 178, 110], [122, 62, 44]] },
  bounty: { extra: 2, colors: [[84, 108, 156], [116, 156, 138], [150, 142, 132]] },
};

export class Spawner {
  constructor(game) { this.game = game; }

  update() {
    const g = this.game;
    if (g.monsters.some((m) => m.gone)) g.monsters = g.monsters.filter((m) => !m.gone);
  }

  spawnMonster(id, x, z, level, elite = false) {
    const g = this.game, def = CREATURES[id];
    const s = scaleMonster(def, level, elite);
    // the place's own coat and name
    const variant = def.boss ? null : g.world.biome(x, z).variant;      // a boss wears its own coat and name
    const hide = variant ? variant.pencil : def.colors[0];
    const kindName = variant ? `${variant.prefix} ${def.name}` : def.name;
    const m = makeEntity('monster', def.archetype, {
      x, z, y: g.world.surface(x, z), yaw: rand() * 6.283,
      scale: def.scale * (elite ? 1.45 : 1) * (def.giant ? 1 : 0.94 + rand() * 0.12), grow: 0, hitY: def.hitY,
      radius: def.radius * (elite ? 1.4 : 1), height: def.height * (elite ? 1.45 : 1),
      // an elder is drawn with a deeper pencil for its hide
      colors: pencils([elite ? hide.map((c, i) => c * 0.55 + [74, 77, 94][i] * 0.45) : hide, def.colors[1], def.colors[2]]),
      name: (elite ? 'Elder ' : '') + kindName, level, hp: s.maxHp, maxHp: s.maxHp, atk: s.atk, xp: s.xp,
      def, defId: id, elite, boss: !!def.boss, deathT: 0,
      ai: { state: 'idle', hx: x, hz: z, gx: x, gz: z, going: false, timer: rand() * 3, cd: 0, target: null, provoked: false, pushX: 0, pushZ: 0, struck: false },
    });
    g.entities.add(m);
    g.monsters.push(m);
    return m;
  }

  /** n: a row of content/town.js `crew`: { role, name, title, color, x, z, face } or one that walks a `path` */
  spawnNpc(n) {
    const g = this.game, look = NPC_LOOKS[n.role] || NPC_LOOKS.shop;
    if (n.path) n = { ...n, x: n.path[0][0], z: n.path[0][1], face: n.path[1] };
    // the crew are of every people, unarmed (kit 3), each in its own colours
    const people = PEOPLES[n.people] || PEOPLES.unit, wear = n.color || look.colors[0];
    return g.entities.add(makeEntity('npc', 'humanoid', {
      x: n.x, z: n.z, y: g.world.surface(n.x, n.z), yaw: Math.atan2(n.x - n.face[0], -(n.z - n.face[1])),
      radius: 0.45, height: 1.6 * people.scale, scale: people.scale, extra: people.index, kit: 3, seed: n.seed ?? Math.random(),
      colors: pencils([wear, n.trim || wear, n.hair || people.hair[0]]),
      name: n.name, role: n.role, title: n.title || '', path: n.path || null, says: n.says || null, at: 0, wait: 1 + Math.random() * 3,
    }));
  }
}
