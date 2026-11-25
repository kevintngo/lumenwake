import { propById } from '../../data/props';
import { BOONS, SITES, type SiteDef } from '../../data/sites';
import type { BoonId, SiteId } from '../../types/domain';
import type { MonsterEntity, SiteEntity } from '../../types/entity';
import type { GameContext, SimSystem } from '../../types/game-context';
import type { StructureInstance } from '../../types/world';
import { derive } from '../character/stats';
import { provokeMonster } from '../combat/monster-specials';
import { makeEntity, pencils } from '../entities';
import { rollItem } from '../inventory/gear-service';
import { pick, rand } from '../sim-rng';

const BOON_IDS = Object.keys(BOONS) as BoonId[];

interface SiteRecord {
  st: StructureInstance;
  site: SiteId;
  S: SiteDef;
  e: SiteEntity;
  room: number;
  used: boolean;
  guard: MonsterEntity | null;
}

export class Sites implements SimSystem {
  private readonly game: GameContext;
  private list: SiteRecord[] = [];

  constructor(game: GameContext) {
    this.game = game;
    game.bus.on('zone', () => this.arrive());
  }

  arrive(): void {
    const g = this.game;
    const w = g.world;
    this.list = [];
    for (const st of w.structures) {
      if (st.role !== 'site' || !st.site) continue;
      const site = st.site;
      const S = SITES[site];
      const def = propById(st.id);
      const y = w.surface(st.x, st.z) + (def ? def.height : 1) * st.scale + 0.25;
      const e = g.entities.add(
        makeEntity<SiteEntity>('site', 'drop', {
          x: st.x,
          z: st.z,
          y,
          radius: 0.55,
          height: 0.8,
          extra: 3,
          scale: 1.5,
          colors: pencils([S.color, S.color, S.color]),
          name: S.name,
          site,
        }),
      );
      this.list.push({ st, site, S, e, room: st.room, used: false, guard: null });
    }
  }

  update(_dt: number): void {
    const g = this.game;
    const p = g.player;
    const a = g.missions.active;
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

  private wake(s: SiteRecord): void {
    const g = this.game;
    const a = g.missions.active;
    if (!a) return;
    const table = g.world.biome().monsters;
    const id = table[Math.floor(rand() * Math.min(3, table.length))][0];
    const ang = rand() * 6.283;
    let x = s.st.x + Math.sin(ang) * 2.6;
    let z = s.st.z + Math.cos(ang) * 2.6;
    if (!g.world.walkable(x, z)) {
      x = g.world.rooms[s.room].x;
      z = g.world.rooms[s.room].z;
    }
    const m = g.missions.temper(g.spawner.spawnMonster(id, x, z, a.offer.tier, true));
    m.room = s.room;
    provokeMonster(m);
    s.guard = m;
    const guardPayload = { site: s.site, name: s.S.name, guard: m };
    g.bus.emit('site:guard', guardPayload);
  }

  private use(s: SiteRecord): void {
    const g = this.game;
    const p = g.player;
    const a = g.missions.active;
    if (!a) return;
    const sheet = p.sheet;
    const tier = a.offer.tier;
    const x = s.st.x;
    const z = s.st.z;
    const y = g.world.surface(x, z);
    let text = '';
    if (s.site === 'mark') {
      a.marks++;
      g.loot.drop(x, y, z, 'glint', Math.round(8 * (1 + 0.25 * (tier - 1))));
      text =
        a.marks >= a.markNeed
          ? 'Every survey mark logged: the contract pays its best.'
          : `Survey mark logged: ${a.marks} of ${a.markNeed}.`;
    } else if (s.site === 'beacon') {
      a.revealed = true;
      g.combat.grantXp(Math.round(14 * (1 + 0.3 * (tier - 1))));
      text = 'Beacon lit: everything left to find is on the map.';
    } else if (s.site === 'crystal') {
      const boon = pick(BOON_IDS.filter((id) => id !== sheet.boon));
      sheet.boon = boon;
      derive(p);
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.35);
      text = `${BOONS[boon].name}: ${BOONS[boon].desc} It lasts until you are lifted out.`;
      g.bus.emit('boon', { entity: p, id: boon });
    } else if (s.site === 'cargo') {
      g.loot.dropGear(x, y, z, rollItem({ ilvl: tier, cls: sheet.cls, rarity: 2, luck: 0.8 }));
      g.loot.drop(x, y, z, 'glint', Math.round(20 * (1 + 0.25 * (tier - 1))));
      g.loot.drop(x, y, z, rand() < 0.5 ? 'tonic' : 'draught', 1);
      text = 'The cargo is yours.';
    }
    s.used = true;
    s.e.gone = true;
    const c = s.e.colors[0];
    const color: readonly [number, number, number] = [c[0], c[1], c[2]];
    const usedPayload = { site: s.site, name: s.S.name, text, x, y, z, color };
    g.bus.emit('site:used', usedPayload);
    g.bus.emit('mission:progress', {
      cores: a.cores,
      need: a.need,
      marks: a.marks,
      markNeed: a.markNeed,
    });
  }
}
