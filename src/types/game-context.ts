import type { EventBus } from '../core/event-bus';
import type { Input } from '../core/input';
import type { Entities } from '../sim/entities';
import type {
  AbilityId,
  AttrKey,
  ClassId,
  CreatureId,
  EquipSlot,
  FxTypeId,
  ItemId,
  LumenId,
  PeopleId,
  RelicId,
  TalentId,
} from './domain';
import type {
  DropEntity,
  Entity,
  MonsterEntity,
  MonsterSpecialDef,
  NpcEntity,
  PetEntity,
  PlayerEntity,
  PlayerProjectile,
} from './entity';
import type { GameEventMap } from './events';
import type { ActiveMission, ContractOffer, MissionReport, RunState, ThreatProfile } from './mission';
import type {
  CameraLike,
  FxRenderSource,
  LookState,
  RenderEnv,
  RenderFrame,
  RendererLike,
  UiSettings,
} from './render';
import type { GearItem, HeroSummary, PlayerSheet, SaveAccount, SaveHero } from './sheet';
import type { BiomeDef, WorldLike, ZoneSpec } from './world';

export interface SimSystem {
  update(dt: number): void;
}

export interface FxSpawnOptions {
  size?: number;
  life?: number;
  color?: readonly [number, number, number];
  alpha?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  grow?: number;
  gravity?: number;
  drag?: number;
  rot?: number;
  spin?: number;
  ground?: boolean;
  flat?: boolean;
  aspect?: number;
  follow?: { x: number; y: number; z: number; gone?: boolean } | null;
  dy?: number;
  hold?: boolean;
  trail?: boolean;
  sway?: number;
}

export interface FxParticleLike {
  follow: { x: number; y: number; z: number; gone?: boolean } | null;
  hold: boolean;
  life: number;
}

export interface FxLight {
  x: number;
  y: number;
  z: number;
  r: number;
  life: number;
  max: number;
}

export interface FxSystemLike extends FxRenderSource {
  readonly lights: FxLight[];
  spawn(type: FxTypeId, x: number, y: number, z: number, opts?: FxSpawnOptions): FxParticleLike | null;
  clear(): void;
  click(x: number, y: number, z: number): void;
  update(dt: number): void;
  write(): void;
}

export interface ControlsLike {
  hover: Entity | null;
  ground: { x: number; z: number } | null;
  release(): void;
  update(dt: number): void;
  jump(): void;
  clearTarget(): boolean;
  actTarget(): Entity | null;
  act(): Entity | null;
  setTarget(e: Entity, pursue: boolean): void;
  cycleTarget(): void;
}

export interface CinemaLike {
  readonly active: boolean;
  pace: number;
  blocking: boolean;
  quiet: boolean;
  focus: [number, number] | null;
  play(id: string, ctx?: Record<string, unknown>, key?: string): void;
  askSkip(): void;
  update(dt: number): void;
  frameStage(now?: boolean): void;
}

export interface PortraitsLike {
  bust: string;
  gear: Record<string, string>;
  elders: Record<string, string>;
  update(): void;
  mount(box: HTMLElement, what: string): void;
  turn(box: HTMLElement, by: number): void;
}

export interface TutorialLike {
  readonly running: boolean;
  time: number;
  goal: Entity | { x: number; y?: number; z: number } | null;
  count: Record<string, number>;
  target(name: string): Entity | { x: number; y?: number; z: number } | null;
  near(d: number): boolean;
  turned(): boolean;
  update(dt: number): void;
}

export interface SaveStoreLike {
  failed: boolean;
  loadAccount(): SaveAccount;
  saveAccount(a: SaveAccount): void;
  newHero(sheet: PlayerSheet, name?: string): SaveHero;
  loadHero(id: string): SaveHero | null;
  saveHero(h: SaveHero, account: SaveAccount): void;
  deleteHero(id: string, account: SaveAccount): void;
  summaries(account: SaveAccount): HeroSummary[];
  exportAll(account: SaveAccount): string;
  importAll(text: string): boolean;
}

export interface CombatLike {
  strike(target: Entity, mult?: number, flat?: number, canCrit?: boolean, indirect?: boolean): number;
  maul(monster: MonsterEntity): void;
  hurt(monster: MonsterEntity, mult?: number, quiet?: boolean, ground?: boolean): void;
  damage(
    target: Entity,
    amount: number,
    source: Entity | null,
    crit: boolean,
    soft?: boolean,
    indirect?: boolean,
  ): number;
  slay(m: MonsterEntity): void;
  grantXp(n: number): void;
  fall(p: PlayerEntity): void;
}

export interface RelicsLike extends SimSystem {
  has(id: RelicId): boolean;
  more(m: MonsterEntity): number;
  landedOn(m: MonsterEntity): void;
  quake(x: number, y: number, z: number): void;
  felled(m: MonsterEntity): void;
  struck(m: MonsterEntity): void;
  vigil(): boolean;
  leap(m: MonsterEntity, mult: number): void;
  drop(m: MonsterEntity): void;
}

export interface SkillSlotEntry {
  id: AbilityId;
  name: string;
  icon: string;
  cooldown: number;
  focus: number;
  desc: string;
  key?: string;
  unlock?: number;
}

export interface SkillsLike extends SimSystem {
  cooldowns: number[];
  list(): SkillSlotEntry[];
  unlocked(i: number): boolean;
  cast(i: number): boolean;
  later(seconds: number, fn: () => void): void;
  launch(shot: Omit<PlayerProjectile, 'gone'> & { gone?: boolean }): void;
}

export interface LootLike extends SimSystem {
  drops: DropEntity[];
  dropFrom(m: MonsterEntity): void;
  dropGear(x: number, y: number, z: number, item: GearItem): DropEntity;
  drop(x: number, y: number, z: number, id: ItemId, n?: number): DropEntity;
  spill(x: number, y: number, z: number, tier: number, core?: boolean): void;
  gather(): void;
  add(id: ItemId, n: number): boolean;
  count(id: ItemId): number;
  remove(id: ItemId, n?: number): boolean;
  use(id: ItemId): boolean;
  equip(uid: number, slot?: EquipSlot | null): boolean;
  unequip(slot: EquipSlot): boolean;
  salvage(uid: number): boolean;
  spare(): GearItem[];
  salvageSpare(): number;
  lock(uid: number): boolean;
  hone(key: string): boolean;
  sellGear(uid: number): boolean;
  buyGear(i: number): boolean;
  sell(id: ItemId, n?: number): boolean;
  sellMaterials(): number;
  craft(i: number): boolean;
  buy(id: ItemId): boolean;
}

export interface SpawnerLike extends SimSystem {
  spawnMonster(id: CreatureId, x: number, z: number, level: number, elite?: boolean): MonsterEntity;
  spawnNpc(n: {
    readonly role: 'bounty' | 'shop' | 'crew';
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
  }): NpcEntity;
}

export interface MissionsLike extends SimSystem {
  offers: ContractOffer[];
  pending: ContractOffer | null;
  active: ActiveMission | null;
  report: MissionReport | null;
  threat: ThreatProfile | null;
  stock: GearItem[];
  arrive(): void;
  refresh(): void;
  accept(i: number): void;
  drop(): void;
  deploy(): void;
  temper(m: MonsterEntity): MonsterEntity;
  onKill(): void;
  reinforce(boss: MonsterEntity, id: CreatureId, n: number): void;
  met(): boolean;
  track(): string;
  home(won: boolean): void;
  run: RunState | null;
  choose(deeper: boolean): void;
  deeperOffer(): ContractOffer | null;
}

export interface HazardsLike extends SimSystem {
  cloud(m: MonsterEntity, r: number, life: number, mult: number, tick: number): void;
  shot(m: MonsterEntity, dirx: number, dirz: number, sp: MonsterSpecialDef): void;
  fall(m: MonsterEntity, x: number, z: number, r: number, delay: number, mult: number): void;
  burst(m: MonsterEntity, r: number, delay: number, mult: number): void;
  clear(): void;
}

export interface CompanionLike extends SimSystem {
  e: PetEntity | null;
  kind(): LumenId;
  arrive(): void;
  bolt(t: MonsterEntity, mult: number, size?: number): void;
  burst(): boolean;
  feed(id: ItemId): boolean;
}

export interface ViewLike {
  only: Entity | null;
  build(time: number): RenderFrame;
}

export interface GameContext {
  readonly canvas: HTMLCanvasElement;
  touch: boolean;
  readonly bus: EventBus<GameEventMap>;
  readonly input: Input;
  readonly store: SaveStoreLike;
  account: SaveAccount;
  hero: SaveHero | null;
  fresh: boolean;
  started: boolean;
  paused: boolean;
  halt: boolean;
  reducedMotion: boolean;
  low: boolean;
  time: number;
  hour: number;
  biome: BiomeDef;
  world: WorldLike;
  readonly renderer: RendererLike;
  readonly camera: CameraLike;
  readonly env: RenderEnv;
  readonly look: LookState;
  savedView: [number, number] | null;
  settings: UiSettings | null;
  readonly entities: Entities;
  readonly player: PlayerEntity;
  monsters: MonsterEntity[];
  readonly fx: FxSystemLike;
  readonly view: ViewLike;
  readonly controls: ControlsLike;
  readonly cinema: CinemaLike;
  readonly portraits: PortraitsLike;
  readonly tutorial: TutorialLike;
  readonly combat: CombatLike;
  readonly relics: RelicsLike;
  readonly skills: SkillsLike;
  readonly loot: LootLike;
  readonly spawner: SpawnerLike;
  readonly missions: MissionsLike;
  readonly hazards: HazardsLike;
  readonly companion: CompanionLike;
  enter(spec: ZoneSpec): void;
  save(): void;
  load(hero: SaveHero): void;
  begin(): void;
  resize(): void;
  hold(seconds: number): void;
  choosePeople(id: PeopleId): void;
  chooseClass(id: ClassId): void;
  spendAttribute(attr: AttrKey): boolean;
  chooseTalent(id: TalentId): boolean;
}
