import type {
  AffixId,
  AttrKey,
  BoonId,
  ClassId,
  EquipSlot,
  GearBaseId,
  ItemId,
  LumenId,
  MissionBiomeId,
  PeopleId,
  RelicId,
  StatKey,
  TalentId,
} from './domain';

export type AttrMap = Record<AttrKey, number>;

export type StatMap = Record<StatKey, number>;

export interface AffixRoll {
  id: AffixId;
  value: number;
}

export interface ItemPower {
  id: TalentId;
  ranks: number;
}

export interface GearItem {
  uid: number;
  base: GearBaseId;
  rarity: number;
  ilvl: number;
  affixes: AffixRoll[];
  power: ItemPower | null;
  relic?: RelicId;
  lock?: boolean;
}

export interface BagStack {
  id: ItemId;
  n: number;
}

export interface LumenState {
  kind: LumenId;
  ember: number;
  shell: number;
  tide: number;
  charge: number;
}

export interface PlayerSheet {
  cls: ClassId;
  people: PeopleId;
  level: number;
  xp: number;
  points: number;
  glint: number;
  parts: number;
  base: AttrMap;
  talents: Partial<Record<TalentId, number>>;
  bonus: Partial<Record<TalentId, number>>;
  picks: number;
  offer: TalentId[] | null;
  gear: GearItem[];
  equip: Record<EquipSlot, GearItem | null>;
  bag: BagStack[];
  lumen: LumenState;
  board: number;
  missions: number;
  first: boolean;
  threat: Partial<Record<MissionBiomeId, number>>;
  relics: Partial<Record<RelicId, number>>;
  relicDry: number;
  boon: BoonId | null;
}

interface PendingContractRef {
  seed: number;
  biome: string;
}

export interface SaveHero {
  id: string;
  version: number;
  name: string;
  created: number;
  saved: number;
  played: number;
  view: [number, number] | null;
  pending: PendingContractRef | null;
  sheet: PlayerSheet;
}

export interface SaveAccount {
  version: number;
  created: number;
  heroes: string[];
}

export interface HeroSummary {
  id: string;
  cls: ClassId;
  people: PeopleId;
  level: number;
  missions: number;
  played: number;
}
