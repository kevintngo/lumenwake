import type {
  AbilityId,
  AudioLevels,
  BoonId,
  CinematicId,
  ClassId,
  ItemId,
  LumenId,
  PeopleId,
  RelicId,
  SiteId,
  TalentId,
  TutorialChapterId,
  WeaponFamilyId,
} from './domain';
import type { Entity, MonsterEntity, NpcEntity, PlayerProjectile } from './entity';
import type { ContractOffer, GoalDef, MissionReport, ThreatProfile } from './mission';
import type { SettingsKey } from './render';
import type { GearItem } from './sheet';
import type { BiomeDef, ZoneSpec } from './world';

export interface GuideStepPayload {
  title: string;
  index: number;
  total: number;
  text: string;
  touch?: string;
  keys?: readonly string[];
  spot?: string | readonly string[];
  touchSpot?: string | readonly string[];
}

export interface GuideTipPayload {
  text: string;
  touch?: string;
  keys?: readonly string[];
  spot?: string | readonly string[];
  touchSpot?: string | readonly string[];
}

export type GuideGoalPayload = Entity | { x: number; y?: number; z: number } | null;

export interface CineCardPayload {
  kind: 'place' | 'elder' | 'contract';
  title: string;
  sub: string;
}

interface PortraitPayload {
  bust: string;
  gear?: Record<string, string>;
  elders?: Record<string, string>;
}

export interface GameEventMap {
  begin: void;
  frame: number;
  zone: { spec: ZoneSpec; biome: BiomeDef };
  'world:changed': [number, number][];
  feel: { hold?: number; shake?: number; hurt?: number };
  fade: number;
  lowhealth: Record<string, never>;
  people: { id: PeopleId; people: { readonly index: number; readonly name: string; readonly scale: number; readonly blurb: string } };
  class: { id: ClassId; cls: { readonly name: string; readonly family: WeaponFamilyId; readonly blurb: string } };
  portrait: PortraitPayload;
  moveclick: { x: number; y: number; z: number };
  step: { entity: Entity };
  jump: { entity: Entity; x: number; y: number; z: number };
  landed: { entity: Entity; x: number; y: number; z: number };
  fell: { entity: Entity };
  swing: { entity: Entity; radius: number; heavy?: boolean; color?: readonly [number, number, number] };
  shoot: { entity: Entity; family: WeaponFamilyId; heavy?: boolean };
  skill: { id: AbilityId; index: number };
  dash: { x: number; y: number; z: number };
  damage: {
    target: Entity;
    amount: number;
    source: Entity | null;
    crit?: boolean;
    soft?: boolean;
    indirect?: boolean;
  };
  miss: { target: Entity; text: string };
  heal: { entity: Entity; amount: number; focus?: boolean };
  drink: { id: ItemId };
  guard: { entity: Entity; t: number };
  telegraph: {
    x: number;
    y: number;
    z: number;
    r?: number;
    t: number;
    fill?: boolean;
    lane?: boolean;
    dirx?: number;
    dirz?: number;
    len?: number;
    w?: number;
  };
  slam: { x: number; y: number; z: number; r: number; heavy?: boolean };
  'lance:fire': { x: number; y: number; z: number; dirx: number; dirz: number; len: number; w: number };
  'hazard:cloud': { x: number; y: number; z: number; r: number; life: number };
  'charge:dust': { x: number; y: number; z: number };
  'shot:launch': PlayerProjectile | { x: number; y: number; z: number; size?: number; color: readonly [number, number, number]; gone: boolean };
  'shot:hit': { x: number; y: number; z: number };
  'bolt:hit': { x: number; y: number; z: number };
  'monster:alert': MonsterEntity;
  'monster:strike': MonsterEntity;
  'monster:special': MonsterEntity;
  'monster:shot': MonsterEntity;
  'monster:died': MonsterEntity;
  'boss:arrive': MonsterEntity;
  'boss:step': { entity: MonsterEntity; x?: number; y?: number; z?: number };
  'boss:rise': { x: number; y: number; z: number; entity?: Entity };
  'boss:stand': { x: number; y: number; z: number; entity?: Entity };
  'boss:roar': { x: number; y: number; z: number; entity?: MonsterEntity };
  'boss:enrage': MonsterEntity;
  'boss:fell': MonsterEntity;
  'boss:down': MonsterEntity;
  'gate:shut': { x: number; y: number; z: number };
  'room:wave': { room: number; wave: number };
  'room:clear': { room: number; kind: string };
  'pod:open': { core?: boolean; x?: number; y?: number; z?: number };
  'mission:taken': ContractOffer | null;
  'mission:begin': { offer: ContractOffer; biome: BiomeDef; goal: GoalDef; threat: ThreatProfile };
  'mission:progress': { cores?: number; need?: number; marks?: number; markNeed?: number };
  'mission:done': { offer: ContractOffer; choose: boolean };
  'run:deeper': { depth: number };
  'mission:report': MissionReport;
  'report:closed': void;
  'site:used': {
    site: SiteId;
    name: string;
    text?: string;
    x: number;
    y: number;
    z: number;
    color: readonly [number, number, number];
  };
  'site:guard': { site: SiteId; name?: string; guard: MonsterEntity };
  boon: { id: BoonId; entity: Entity };
  'drop:rare': { rarity: number; x: number; y: number; z: number };
  pickup: { item?: ItemId; gear?: GearItem; n?: number; rare?: boolean; x: number; y: number; z: number };
  equip: { slot: string; item: GearItem | null };
  salvage: { parts: number; count?: number };
  hone: { item: GearItem };
  trade: { kind: 'buy' | 'sell' | 'craft'; name?: string; glint?: number };
  'bag:changed': void;
  xp: { amount: number };
  levelup: { level: number };
  talent: { id: TalentId; name: string };
  'relic:ring': { id: RelicId; x: number; y: number; z: number; r: number; heavy?: boolean };
  'relic:leap': { x: number; y: number; z: number };
  'relic:found': { id: RelicId; item: GearItem; first?: boolean };
  'lumen:bolt': { x: number; y: number; z: number };
  'lumen:ready': void;
  'lumen:fed': { id: ItemId };
  'lumen:level': { level: number };
  'lumen:changed': { kind: LumenId; name: string; x: number; y: number; z: number; color: readonly [number, number, number] };
  'lumen:burst': { x: number; y: number; z: number; color: readonly [number, number, number]; burst: { readonly kind: string; readonly name: string; readonly r?: number; readonly seconds?: number } };
  'player:died': void;
  'player:respawn': void;
  'npc:talk': NpcEntity;
  talk: { name: string; title: string; people: PeopleId; line: string };
  log: { text: string; kind?: string };
  deny: { text?: string };
  'ui:toggle': string;
  'ui:close': void;
  'ui:escape': void;
  'ui:click': void;
  sound: boolean;
  volume: AudioLevels;
  settings: { key: SettingsKey | null; value?: unknown };
  'cine:begin': { id: CinematicId; bars: boolean; skip: boolean; blocking: boolean };
  'cine:end': { id: CinematicId; skipped: boolean };
  'cine:card': CineCardPayload | null;
  'cine:caption': string;
  'cine:open': Record<string, unknown>;
  'cine:rumble': { x: number; y: number; z: number; power?: number; entity?: Entity };
  'craft:pass': { x?: number; y?: number; z?: number; entity?: Entity };
  'craft:land': { x: number; y: number; z: number; entity?: Entity };
  'arrive:beam': { x: number; y: number; z: number; entity?: Entity };
  guide: GuideStepPayload | null;
  'guide:goal': GuideGoalPayload;
  'guide:step': { id: string };
  'guide:chapter': { id: TutorialChapterId; title: string };
  'guide:tip': GuideTipPayload | null;
  'guide:skip': { quiet?: boolean } | undefined;
  'guide:restart': void;
  'guide:done': { skipped: boolean; quiet: boolean };
}
