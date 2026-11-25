import { CREATURES } from '../data/creatures';
import { PEOPLES } from '../data/peoples';
import type { CreatureId, NpcRole, PeopleId, RgbTuple } from '../types/domain';
import type { MonsterEntity, NpcEntity } from '../types/entity';
import type { GameContext, SpawnerLike } from '../types/game-context';
import { scaleMonster } from './character/stats';
import { makeEntity, pencils } from './entities';
import { rand } from './sim-rng';

const NPC_LOOKS: Readonly<Record<'shop' | 'bounty', readonly RgbTuple[]>> = {
  shop: [
    [150, 178, 120],
    [222, 178, 110],
    [122, 62, 44],
  ],
  bounty: [
    [84, 108, 156],
    [116, 156, 138],
    [150, 142, 132],
  ],
};

export class Spawner implements SpawnerLike {
  private readonly game: GameContext;

  constructor(game: GameContext) {
    this.game = game;
  }

  update(_dt: number): void {
    const g = this.game;
    if (g.monsters.some((m) => m.gone)) g.monsters = g.monsters.filter((m) => !m.gone);
  }

  spawnMonster(id: CreatureId, x: number, z: number, level: number, elite = false): MonsterEntity {
    const g = this.game;
    const def = CREATURES[id];
    const s = scaleMonster(def, level, elite);
    const variant = def.boss ? null : g.world.biome(x, z).variant;
    const hide: RgbTuple = variant ? variant.pencil : def.colors[0];
    const kindName = variant ? `${variant.prefix} ${def.name}` : def.name;
    const yaw = rand() * 6.283;
    const scale = def.scale * (elite ? 1.45 : 1) * (def.giant ? 1 : 0.94 + rand() * 0.12);
    const coat: RgbTuple = elite
      ? [hide[0] * 0.55 + 74 * 0.45, hide[1] * 0.55 + 77 * 0.45, hide[2] * 0.55 + 94 * 0.45]
      : hide;
    const timer = rand() * 3;
    const m = makeEntity<MonsterEntity>('monster', def.archetype, {
      x,
      z,
      y: g.world.surface(x, z),
      yaw,
      scale,
      grow: 0,
      hitY: def.hitY,
      radius: def.radius * (elite ? 1.4 : 1),
      height: def.height * (elite ? 1.45 : 1),
      colors: pencils([coat, def.colors[1], def.colors[2]]),
      name: (elite ? 'Elder ' : '') + kindName,
      level,
      hp: s.maxHp,
      maxHp: s.maxHp,
      atk: s.atk,
      xp: s.xp,
      speed: def.speed,
      aggro: def.aggro * (elite ? 1.3 : 1),
      def,
      defId: id,
      elite,
      boss: Boolean(def.boss),
      enraged: false,
      guard: false,
      slow: 1,
      slowT: 0,
      rot: 0,
      rotT: 0,
      deathT: 0,
      spilled: false,
      room: -1,
      quick: 1,
      glintMul: 1,
      luck: 0,
      rageAt: 0.5,
      burst: null,
      ai: {
        state: 'idle',
        timer,
        cd: 0,
        specCd: [],
        homeX: x,
        homeZ: z,
        wanderX: x,
        wanderZ: z,
        hitDone: false,
        sp: null,
        spIdx: -1,
      },
    });
    g.entities.add(m);
    g.monsters.push(m);
    return m;
  }

  spawnNpc(n: {
    readonly role: NpcRole;
    readonly name: string;
    readonly title: string;
    readonly people: PeopleId;
    readonly x?: number;
    readonly z?: number;
    readonly face?: readonly [number, number];
    readonly color: readonly [number, number, number];
    readonly trim?: readonly [number, number, number];
    readonly hair?: readonly [number, number, number];
    readonly seed?: number;
    readonly path?: readonly (readonly [number, number])[];
    readonly says?: readonly string[];
  }): NpcEntity {
    const g = this.game;
    const look = n.role === 'bounty' ? NPC_LOOKS.bounty : NPC_LOOKS.shop;
    const x = n.path ? n.path[0][0] : (n.x ?? 0);
    const z = n.path ? n.path[0][1] : (n.z ?? 0);
    const face = n.path ? n.path[1] : (n.face ?? ([x, z + 1] as const));
    const yaw = Math.atan2(x - face[0], -(z - face[1]));
    const people = PEOPLES[n.people] ?? PEOPLES.unit;
    const wear: RgbTuple = n.color ?? look[0];
    return g.entities.add(
      makeEntity<NpcEntity>('npc', 'humanoid', {
        x,
        z,
        y: g.world.surface(x, z),
        yaw,
        radius: 0.45,
        height: 1.6 * people.scale,
        scale: people.scale,
        extra: people.index,
        kit: 3,
        seed: n.seed ?? Math.random(),
        colors: pencils([wear, n.trim ?? wear, n.hair ?? people.hair[0]]),
        name: n.name,
        role: n.role,
        title: n.title || '',
        people: n.people,
        says: n.says ?? [],
        sayIdx: -1,
        path: n.path ?? null,
        pathIdx: 0,
        pauseT: 1 + Math.random() * 3,
      }),
    );
  }
}
