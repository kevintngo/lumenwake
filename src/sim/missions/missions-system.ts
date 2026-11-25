import { mulberry32 } from '../../core/rng';
import { MISSION_BIOMES, biomeById } from '../../data/biomes';
import { CLASSES } from '../../data/classes';
import { CREATURES } from '../../data/creatures';
import { THREATS, THREAT_MAX } from '../../data/threat';
import { TOWN } from '../../data/town';
import type { CreatureId, GoalId, SlotKind } from '../../types/domain';
import type { MonsterEntity } from '../../types/entity';
import type { GameContext, MissionsLike } from '../../types/game-context';
import type {
  ActiveMission,
  ContractOffer,
  GoalDef,
  MissionReport,
  RoomRuntimeState,
  ThreatProfile,
} from '../../types/mission';
import type { GearItem } from '../../types/sheet';
import type { WorldLike } from '../../types/world';
import { firstSpec, hubSpec, missionSpec, rimAt } from '../../world/layout';
import { derive } from '../character/stats';
import { provokeMonster } from '../combat/monster-specials';
import { rollItem } from '../inventory/gear-service';
import { rand, seedSim } from '../sim-rng';
import { planEncounters } from './encounters';
import { rollConditions, threatOf } from './threat';

export const GOALS: Readonly<Record<GoalId, GoalDef>> = {
  sweep: { name: 'Clear the way', brief: 'Clear every island on the way to the far pad.' },
  recover: {
    name: 'Recover the cores',
    brief: 'Survey cores went down in supply pods. Find them and bring them out.',
  },
  hunt: { name: 'Bring down the elder', brief: 'Something old holds the last island. Put it down.' },
};

const FIRST: ContractOffer = {
  seed: 4099,
  biome: 'glasswood',
  goal: 'hunt',
  tier: 1,
  rooms: 2,
  name: 'First Light',
  xp: 90,
  glint: 60,
  first: true,
};

const NAMES_A: readonly string[] = [
  'Quiet',
  'Long',
  'Broken',
  'High',
  'Pale',
  'Far',
  'Hollow',
  'Bright',
  'Last',
  'Low',
  'Wide',
  'Thin',
];

const NAMES_B: readonly string[] = [
  'Stair',
  'Reach',
  'Chain',
  'Crossing',
  'Ledge',
  'Span',
  'Garden',
  'Shelf',
  'Rise',
  'Hollow',
  'Walk',
  'Crown',
];

const GOAL_ORDER: readonly GoalId[] = ['sweep', 'recover', 'hunt'];
const SHOP_SLOTS: readonly (SlotKind | undefined)[] = ['weapon', 'offhand', undefined, undefined, undefined];

interface MissionRoomState extends RoomRuntimeState {
  wait?: number;
}

export class Missions implements MissionsLike {
  private readonly game: GameContext;
  offers: ContractOffer[] = [];
  pending: ContractOffer | null = null;
  active: ActiveMission | null = null;
  report: MissionReport | null = null;
  threat: ThreatProfile | null = null;
  stock: GearItem[] = [];
  private padT = 0;

  constructor(game: GameContext) {
    this.game = game;
    game.bus.on('relic:found', (d) => {
      if (this.active) this.active.relic = d.item;
    });
    game.bus.on('player:respawn', () => {
      if (this.active) this.home(false);
    });
  }

  arrive(): void {
    const g = this.game;
    for (const n of TOWN.crew) g.spawner.spawnNpc(n);
    for (const gate of g.world.gates) gate.shut = false;
    this.refresh();
  }

  refresh(): void {
    const s = this.game.player.sheet;
    const rnd = mulberry32(((s.board || 0) * 7919 + 1013) >>> 0);
    seedSim(((s.board || 0) + 1) * 2654435761);
    this.stock = [0, 1, 2, 3, 4].map((k) =>
      rollItem({
        ilvl: Math.max(1, s.level),
        cls: s.cls,
        family: k < 2 ? CLASSES[s.cls].family : undefined,
        rarity: k === 4 ? 2 : 1,
        slot: SHOP_SLOTS[k],
      }),
    );
    const first = Math.floor(rnd() * MISSION_BIOMES.length);
    this.offers = [0, 1, 2].map((k) => {
      const biome = MISSION_BIOMES[(first + k) % MISSION_BIOMES.length];
      const goal = GOAL_ORDER[(k + (s.board || 0)) % 3];
      const tier = Math.max(1, s.level + k - 1 + (goal === 'hunt' ? 1 : 0));
      const rooms = Math.min(6, 3 + Math.floor(rnd() * 2) + Math.floor(tier / 4));
      const seed = Math.floor(rnd() * 2 ** 31);
      const threat = Math.min(THREAT_MAX, (s.threat[biome] ?? 0) | 0);
      const pay = THREATS[threat].pay;
      return {
        seed,
        biome,
        goal,
        tier,
        rooms,
        threat,
        conditions: rollConditions(threat, { biome, goal }, mulberry32((seed ^ 0x51ed270b) >>> 0)),
        name: `${NAMES_A[Math.floor(rnd() * NAMES_A.length)]} ${NAMES_B[Math.floor(rnd() * NAMES_B.length)]}`,
        xp: Math.round((30 + rooms * 14) * (1 + 0.3 * (tier - 1)) * (goal === 'hunt' ? 1.3 : 1) * pay),
        glint: Math.round((22 + rooms * 9) * (1 + 0.25 * (tier - 1)) * pay),
      };
    });
    if (s.first) this.offers[0] = { ...FIRST };
  }

  accept(i: number): void {
    if (!this.offers[i] || this.active) return;
    this.pending = this.offers[i];
    this.game.bus.emit('mission:taken', this.pending);
  }

  drop(): void {
    this.pending = null;
    this.game.bus.emit('mission:taken', null);
  }

  deploy(): void {
    const g = this.game;
    const offer = this.pending;
    if (!offer) return;
    const spec = offer.first ? firstSpec(offer) : missionSpec(offer);
    const rnd = mulberry32((offer.seed ^ 0x2545f491) >>> 0);
    const theme = biomeById(offer.biome);
    let need = spec.laid || !theme ? 0 : planEncounters(spec, theme, offer, rnd);
    seedSim(offer.seed);
    g.enter(spec);
    const rooms = spec.rooms;
    const pods = g.world.structures.filter((s) => s.role === 'pod');
    if (offer.goal === 'recover') {
      const main = pods.filter((p) => rooms[p.room].kind === 'fight' && !p.terrace);
      if (main.length && need > 0) {
        for (let k = 0; k < need; k++) {
          main[Math.floor(((k + 0.5) * main.length) / need)].core = true;
        }
      }
      need = main.filter((p) => p.core).length;
    }
    this.active = {
      offer,
      need,
      cores: 0,
      done: false,
      over: 0,
      kills: 0,
      time: 0,
      marks: 0,
      markNeed: g.world.structures.filter((s) => s.site === 'mark').length,
      revealed: false,
      rooms: rooms.map((r) => ({ state: r.waves.length ? 'asleep' : 'clear', wave: -1, alive: [] })),
    };
    this.pending = null;
    this.openGates(0);
    const T = (this.threat = threatOf(offer));
    if (T.hour != null) g.hour = T.hour;
    g.bus.emit('mission:begin', { offer, biome: g.biome, goal: GOALS[offer.goal], threat: T });
    if (T.rank) {
      g.bus.emit('log', {
        text: `Threat: ${T.name}.${T.list.map((c) => ` ${c.name}: ${c.text}`).join('')}`,
      });
    }
    if (!g.player.sheet.missions) {
      g.bus.emit('log', {
        text: 'A jump clears a gap, gets you onto a terrace, and takes you over a blow that runs along the ground.',
      });
    }
  }

  private openGates(room: number): void {
    const g = this.game;
    for (const gate of g.world.gates) {
      const lnk = g.world.nav.links[gate.link];
      if (!lnk || lnk.a !== room || !gate.shut) continue;
      gate.shut = false;
      if (gate.st) g.bus.emit('world:changed', g.world.setState(gate.st, 1));
    }
  }

  update(dt: number): void {
    const g = this.game;
    const p = g.player;
    const w = g.world;
    if (g.paused || p.dead) return;
    const a = this.active;
    if (!a) {
      const pad = w.structures.find((s) => s.role === 'deploy');
      const on = Boolean(pad && Math.hypot(p.x - pad.x, p.z - pad.z) < 1.9);
      if (on && this.pending) {
        this.padT += dt;
        g.bus.emit('fade', this.padT > 0.5 ? 0 : 1);
        if (this.padT > 1.15) {
          this.padT = 0;
          this.deploy();
        }
      } else {
        if (on && !this.pending && this.padT === 0) {
          this.padT = -1;
          g.bus.emit('log', {
            text: 'The pad is cold. Take a contract from Ilse, at the hall, first.',
          });
        }
        if (!on) this.padT = 0;
        g.bus.emit('fade', 1);
      }
      return;
    }

    a.time += dt;
    if (a.over > 0) {
      a.over -= dt;
      g.bus.emit('fade', a.over < 0.7 ? 0 : 1);
      if (a.over <= 0) this.home(true);
      return;
    }

    const layoutRooms = w.rooms;
    const here = w.roomAt(p.x, p.z, 1.8);
    if (
      here >= 0 &&
      a.rooms[here].state === 'asleep' &&
      (layoutRooms[here].kind !== 'boss' || w.roomAt(p.x, p.z, 6) === here)
    ) {
      a.rooms[here].state = 'awake';
      if (layoutRooms[here].kind === 'boss') this.seal(here, true);
      this.nextWave(here);
    }

    for (let i = 0; i < a.rooms.length; i++) {
      const rs = a.rooms[i] as MissionRoomState;
      if (rs.state !== 'awake') continue;
      rs.alive = rs.alive.filter((m) => !m.gone && (!m.dead || Boolean(m.def.fall)));
      if (rs.alive.length) continue;
      if (rs.wave + 1 < layoutRooms[i].waves.length) {
        rs.wait = (rs.wait ?? 0.9) - dt;
        if (rs.wait <= 0) {
          rs.wait = undefined;
          this.nextWave(i);
        }
      } else {
        rs.state = 'clear';
        this.openGates(i);
        if (a.offer.first && i === 1) {
          g.loot.dropGear(
            layoutRooms[i].x,
            w.surface(layoutRooms[i].x, layoutRooms[i].z),
            layoutRooms[i].z,
            rollItem({
              ilvl: 2,
              cls: p.sheet.cls,
              family: CLASSES[p.sheet.cls].family,
              slot: 'weapon',
              rarity: 1,
            }),
          );
        }
        g.bus.emit('room:clear', { room: i, kind: layoutRooms[i].kind });
        if (layoutRooms[i].kind === 'boss') {
          this.seal(i, false);
          this.finish();
        }
      }
    }

    for (const s of w.structures) {
      if (s.role !== 'pod' || s.pal || Math.hypot(p.x - s.x, p.z - s.z) > 1.75) continue;
      if (a.rooms[s.room] && a.rooms[s.room].state === 'awake') continue;
      g.bus.emit('world:changed', w.setState(s, 1));
      g.loot.spill(s.x, w.surface(s.x, s.z), s.z, a.offer.tier, Boolean(s.core));
      g.bus.emit('pod:open', { x: s.x, y: w.surface(s.x, s.z), z: s.z, core: Boolean(s.core) });
      if (s.core) {
        a.cores++;
        g.bus.emit('mission:progress', {
          cores: a.cores,
          need: a.need,
          marks: a.marks,
          markNeed: a.markNeed,
        });
      }
    }

    const out = w.structures.find((s) => s.role === 'leave');
    if (out && Math.hypot(p.x - out.x, p.z - out.z) < 1.9) {
      if (this.met()) {
        this.padT += dt;
        if (this.padT > 0.6) {
          this.padT = 0;
          this.finish();
        }
      } else if (this.padT === 0) {
        this.padT = -1;
        g.bus.emit('log', {
          text:
            a.offer.goal === 'recover'
              ? `Not yet: ${a.need - a.cores} of the cores are still out there.`
              : 'Not yet: an island on the way is not clear.',
        });
      }
    } else {
      this.padT = 0;
    }
  }

  private seal(room: number, shut: boolean): void {
    const g = this.game;
    for (const gate of g.world.gates) {
      const lnk = g.world.nav.links[gate.link];
      if (!lnk || lnk.b !== room || gate.shut === shut) continue;
      gate.shut = shut;
      if (gate.st) g.bus.emit('world:changed', g.world.setState(gate.st, shut ? 0 : 1));
      if (shut) {
        g.bus.emit('gate:shut', {
          x: gate.x,
          y: g.world.surface(gate.x, gate.z),
          z: gate.z,
        });
      }
    }
  }

  private nextWave(i: number): void {
    const g = this.game;
    const w = g.world;
    const a = this.active;
    if (!a) return;
    const room = w.rooms[i];
    const rs = a.rooms[i];
    const p = g.player;
    const list = room.waves[++rs.wave];
    const T = this.threat || threatOf(a.offer);
    const level = a.offer.tier + T.level;
    let led = !T.leader || room.kind !== 'fight';
    list.forEach((rawId, k) => {
      const boss = rawId[0] === '@';
      const id = (boss ? rawId.slice(1) : rawId) as CreatureId;
      let x = room.x;
      let z = room.z;
      for (let tries = 0; tries < 24; tries++) {
        const away = Math.atan2(room.x - p.x, room.z - p.z);
        const ang = boss
          ? away
          : away + (k - (list.length - 1) / 2) * 0.75 + (rand() - 0.5) * 0.5 + tries * 0.9;
        const d = (boss ? 0.2 : 0.35 + rand() * 0.3) * rimAt(room, ang);
        x = room.x + Math.sin(ang) * d;
        z = room.z + Math.cos(ang) * d;
        if (Math.hypot(x - p.x, z - p.z) > 4.5 && w.walkable(x, z)) break;
      }
      const lead = !boss && !led;
      if (lead) led = true;
      const m = g.spawner.spawnMonster(id, x, z, level + (boss ? 1 : 0), lead);
      this.temper(m);
      m.room = i;
      if (boss) m.yaw = Math.atan2(-(p.x - x), p.z - z);
      if (boss && a.offer.first) {
        m.maxHp = m.hp = Math.round(m.maxHp * 0.4);
        m.atk *= 0.7;
      }
      provokeMonster(m);
      rs.alive.push(m);
      if (boss) g.bus.emit('boss:arrive', m);
    });
    g.bus.emit('room:wave', { room: i, wave: rs.wave });
  }

  temper(m: MonsterEntity): MonsterEntity {
    const T = this.threat;
    if (!T || !this.active || (!T.rank && !T.list.length)) return m;
    m.maxHp = m.hp = Math.round(m.maxHp * T.hp);
    m.atk *= T.atk;
    m.quick = T.quick;
    m.aggro *= T.aggro;
    m.glintMul = T.glint;
    m.luck = T.luck;
    if (m.boss) {
      m.rageAt = T.rageAt;
    } else {
      if (T.burst) m.burst = T.burst;
      m.scale *= 1 + 0.02 * T.rank;
      const tint = [0.29, 0.3, 0.37];
      m.colors[0] = m.colors[0].map((c, i) => c * (1 - 0.07 * T.rank) + tint[i] * 0.07 * T.rank);
    }
    return m;
  }

  onKill(): void {
    if (this.active) this.active.kills++;
  }

  reinforce(boss: MonsterEntity, id: CreatureId, n: number): void {
    const g = this.game;
    const w = g.world;
    const a = this.active;
    if (!a || !CREATURES[id]) return;
    const rs = a.rooms[boss.room];
    if (!rs || rs.alive.filter((m) => !m.dead && !m.boss).length >= 5) return;
    for (let k = 0; k < n; k++) {
      const ang = rand() * 6.283;
      const d = 2.5 + rand() * 2.5;
      let x = boss.x + Math.sin(ang) * d;
      let z = boss.z + Math.cos(ang) * d;
      if (!w.walkable(x, z)) {
        x = boss.x;
        z = boss.z;
      }
      const m = g.spawner.spawnMonster(id, x, z, Math.max(1, boss.level - 1));
      this.temper(m);
      m.room = boss.room;
      provokeMonster(m);
      m.called = true;
      rs.alive.push(m);
    }
  }

  met(): boolean {
    const a = this.active;
    const w = this.game.world;
    if (!a) return false;
    if (a.offer.goal === 'recover') return a.cores >= a.need;
    if (a.offer.goal === 'hunt') {
      return a.rooms.some((rs, i) => w.rooms[i].kind === 'boss' && rs.state === 'clear');
    }
    return a.rooms.every((rs, i) => !w.rooms[i].main || rs.state === 'clear');
  }

  track(): string {
    const a = this.active;
    const w = this.game.world;
    if (!a) return this.pending ? `${this.pending.name}: step onto the pad` : '';
    if (a.done) return a.over > 3 ? `Done: lifting out in ${Math.ceil(a.over)}` : 'Done: lifting out';
    const side =
      a.markNeed && a.marks < a.markNeed ? ` · Survey marks ${a.marks} of ${a.markNeed}` : '';
    return this.goalLine(a, w) + side;
  }

  private goalLine(a: ActiveMission, w: WorldLike): string {
    if (a.offer.goal === 'recover') {
      return a.cores >= a.need
        ? 'Cores recovered: reach the far pad'
        : `Survey cores: ${a.cores} of ${a.need}`;
    }
    if (a.offer.goal === 'hunt') return 'Find the elder on the last island';
    const main = a.rooms.filter((_, i) => w.rooms[i].kind === 'fight');
    const left = main.filter((r) => r.state !== 'clear').length;
    return left ? `Islands to clear: ${left}` : 'All clear: reach the far pad';
  }

  private finish(): void {
    const a = this.active;
    if (!a || a.done) return;
    a.done = true;
    a.over = a.offer.goal === 'hunt' ? 10 : 2.6;
    this.game.bus.emit('mission:done', { offer: a.offer });
  }

  home(won: boolean): void {
    const g = this.game;
    const p = g.player;
    const a = this.active;
    if (!a) return;
    const s = p.sheet;
    const extra = 1 + 0.15 * a.marks;
    const all = a.markNeed > 0 && a.marks >= a.markNeed;
    this.report = {
      won,
      offer: a.offer,
      relic: a.relic || null,
      kills: a.kills,
      time: a.time,
      xp: won ? Math.round(a.offer.xp * extra) : 0,
      glint: won ? Math.round(a.offer.glint * extra) : 0,
      marks: a.marks,
      markNeed: a.markNeed,
    };
    const T = this.threat || threatOf(a.offer);
    this.threat = null;
    if (!a.offer.first) {
      s.threat = s.threat || {};
      const was = (s.threat[a.offer.biome] ?? 0) | 0;
      const now = Math.max(0, Math.min(THREAT_MAX, was + (won ? 1 : -1)));
      s.threat[a.offer.biome] = now;
      if (now !== was) this.report.threat = { was, now, name: THREATS[now].name };
    }
    s.boon = null;
    if (won) g.loot.gather();
    this.active = null;
    g.enter(hubSpec(TOWN));
    this.arrive();
    if (won) {
      s.board = (s.board || 0) + 1;
      s.missions = (s.missions || 0) + 1;
      if (a.offer.first) {
        s.first = false;
        g.loot.add('wisp_ember', 6);
      }
      s.glint += this.report.glint;
      const prize = rollItem({
        ilvl: a.offer.tier,
        cls: s.cls,
        family: CLASSES[s.cls].family,
        rarity: Math.min(3, (a.offer.goal === 'hunt' ? 2 : 1) + (all ? 1 : 0)),
        luck: 0.4 + T.luck,
      });
      if (s.gear.length < 20) {
        s.gear.push(prize);
        this.report.prize = prize;
      }
      this.refresh();
      g.combat.grantXp(this.report.xp);
    }
    derive(p);
    p.hp = p.maxHp;
    p.focus = p.maxFocus;
    g.save();
    g.bus.emit('mission:report', this.report);
  }
}
