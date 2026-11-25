import type {
  ArchetypeId,
  CreatureId,
  ItemId,
  NpcRole,
  PeopleId,
  RelicId,
  SiteId,
  WeaponFamilyId,
} from './domain';
import type { AttrMap, GearItem, PlayerSheet } from './sheet';

export type EntityKind = 'player' | 'monster' | 'npc' | 'drop' | 'site' | 'pet' | 'set';

interface MovePoint {
  x: number;
  z: number;
}

interface PlayerIntent {
  moveX: number;
  moveZ: number;
  aim: { x: number; z: number } | null;
  jump?: boolean;
}

interface DashState {
  dirx: number;
  dirz: number;
  speed: number;
  t: number;
  hit: Set<number>;
}

interface MendState {
  t: number;
  rate: number;
}

export interface PendingAttack {
  t: number;
  target: Entity | null;
  chain: number;
}

export interface Entity {
  id: number;
  kind: EntityKind;
  archetype: ArchetypeId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  grow: number;
  radius: number;
  height: number;
  move: number;
  walk: number;
  action: number;
  actionT: number;
  actionDur: number;
  flash: number;
  shade: number;
  seed: number;
  colors: number[][];
  extra: number;
  lift: number;
  ghost: boolean;
  hover: boolean;
  dead: boolean;
  gone: boolean;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  far?: boolean;
  hidden?: boolean;
  kit?: number;
  wears?: number;
  build?: number;
  hitY?: number;
  pose?: [number, number, number, number];
}

export interface PlayerEntity extends Entity {
  kind: 'player';
  sheet: PlayerSheet;
  intent: PlayerIntent;
  target: Entity | null;
  pursue: boolean;
  moveTo: MovePoint | null;
  attackCd: number;
  calm: number;
  invuln: number;
  potionCd: number;
  pending: PendingAttack | null;
  dash: DashState | null;
  mend: MendState | null;
  safe: boolean;
  focus: number;
  maxFocus: number;
  attr: AttrMap;
  relic: Partial<Record<RelicId, boolean>>;
  attack: number;
  attackSpeed: number;
  crit: number;
  critDamage: number;
  power: number;
  defense: number;
  hpRegen: number;
  focusRegen: number;
  speedMul: number;
  dodge: number;
  find: number;
  lifeOnKill: number;
  family: WeaponFamilyId;
  chain: number;
  chainT: number;
  aloft: boolean;
  air: number;
  vy: number;
  safeX: number;
  safeZ: number;
  respawnT: number;
  rush: number;
  vigilUsed: boolean;
  ward: number;
}

export interface MonsterSpecialDef {
  readonly kind:
    | 'leap'
    | 'cloud'
    | 'charge'
    | 'shot'
    | 'slam'
    | 'guard'
    | 'burrow'
    | 'lance'
    | 'fuse'
    | 'barrage'
    | 'summon';
  readonly every: number;
  readonly min: number;
  readonly max: number;
  readonly windup: number;
  readonly air?: number;
  readonly r?: number;
  readonly mult?: number;
  readonly life?: number;
  readonly tick?: number;
  readonly speed?: number;
  readonly dist?: number;
  readonly winded?: number;
  readonly recover?: number;
  readonly below?: number;
  readonly hold?: number;
  readonly under?: number;
  readonly len?: number;
  readonly w?: number;
  readonly count?: number;
  readonly gap?: number;
  readonly drop?: number;
  readonly adds?: CreatureId;
}

export interface CreatureDef {
  readonly cost: number;
  readonly name: string;
  readonly archetype: ArchetypeId;
  readonly scale: number;
  readonly radius: number;
  readonly height: number;
  readonly hp: number;
  readonly atk: number;
  readonly speed: number;
  readonly range: number;
  readonly attackTime: number;
  readonly cooldown: number;
  readonly aggro: number;
  readonly xp: number;
  readonly stride: number;
  readonly specials: readonly MonsterSpecialDef[];
  readonly colors: readonly (readonly [number, number, number])[];
  readonly loot: readonly (readonly [ItemId, number, readonly [number, number]])[];
  readonly glow?: boolean;
  readonly keep?: readonly [number, number];
  readonly boss?: boolean;
  readonly giant?: boolean;
  readonly epithet?: string;
  readonly sit?: readonly [number, number, number];
  readonly hitY?: number;
  readonly turn?: number;
  readonly fall?: number;
  readonly lamp?: readonly [number, number];
}

interface MonsterAiState {
  state: 'idle' | 'chase' | 'attack' | 'special' | 'home';
  timer: number;
  cd: number;
  specCd: number[];
  homeX: number;
  homeZ: number;
  wanderX: number;
  wanderZ: number;
  hitDone: boolean;
  sp: MonsterSpecialDef | null;
  spIdx: number;
}

export interface MonsterEntity extends Entity {
  kind: 'monster';
  defId: CreatureId;
  def: CreatureDef;
  atk: number;
  xp: number;
  speed: number;
  aggro: number;
  boss: boolean;
  elite: boolean;
  enraged: boolean;
  guard: boolean;
  slow: number;
  slowT: number;
  rot: number;
  rotT: number;
  deathT: number;
  spilled: boolean;
  room: number;
  quick: number;
  glintMul: number;
  luck: number;
  rageAt: number;
  burst: readonly [number, number, number] | null;
  called?: boolean;
  ai: MonsterAiState;
}

export interface NpcEntity extends Entity {
  kind: 'npc';
  role: NpcRole;
  title: string;
  people: PeopleId;
  says: readonly string[];
  sayIdx: number;
  path: readonly (readonly [number, number])[] | null;
  pathIdx: number;
  pauseT: number;
}

export interface DropEntity extends Entity {
  kind: 'drop';
  item: ItemId | null;
  gear: GearItem | null;
  n: number;
  age: number;
}

export interface SiteEntity extends Entity {
  kind: 'site';
  site: SiteId;
}

export interface PetEntity extends Entity {
  kind: 'pet';
}

export interface PlayerProjectile {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  life: number;
  color: readonly [number, number, number];
  size: number;
  mult: number;
  flat: number;
  splash: number;
  splashMult: number;
  quiet: boolean;
  gone: boolean;
}
