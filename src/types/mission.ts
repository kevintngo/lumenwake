import type { ConditionId, GoalId, MissionBiomeId } from './domain';
import type { MonsterEntity } from './entity';
import type { GearItem } from './sheet';

export interface GoalDef {
  readonly name: string;
  readonly brief: string;
}

export interface ThreatRow {
  readonly rank: number;
  readonly name: string;
  readonly level: number;
  readonly hp: number;
  readonly atk: number;
  readonly purse: number;
  readonly pay: number;
  readonly luck: number;
  readonly conditions: number;
}

interface ConditionSummary {
  id: ConditionId;
  name: string;
  text: string;
}

export interface ThreatProfile {
  rank: number;
  name: string;
  level: number;
  hp: number;
  atk: number;
  purse: number;
  pay: number;
  luck: number;
  conditions: number;
  quick: number;
  aggro: number;
  glint: number;
  leader: boolean;
  burst: readonly [number, number, number] | null;
  strays: number;
  hour: number | null;
  rageAt: number;
  list: ConditionSummary[];
}

export interface ContractOffer {
  seed: number;
  biome: MissionBiomeId;
  goal: GoalId;
  tier: number;
  rooms: number;
  threat?: number;
  conditions?: ConditionId[];
  name: string;
  xp: number;
  glint: number;
  first?: boolean;
  /** 1 for the contract itself; 2 and on are the islands below it, reached by going deeper */
  depth?: number;
}

/** what a run has gathered and not yet brought home: a fall below the first depth costs half of it */
export interface RunHaul {
  /** glint picked up on the islands */
  glint: number;
  /** contract pay earned at each cleared depth, paid on lifting out */
  payGlint: number;
  payXp: number;
  /** gear found or paid on the way (by uid) */
  items: number[];
  relics: GearItem[];
}

export interface RunState {
  base: ContractOffer;
  depth: number;
  /** depths whose elder (or far pad) was reached */
  cleared: number;
  haul: RunHaul;
  kills: number;
  time: number;
  marks: number;
  markNeed: number;
  prizes: GearItem[];
}

export interface RoomRuntimeState {
  state: 'asleep' | 'awake' | 'clear';
  wave: number;
  alive: MonsterEntity[];
}

export interface ActiveMission {
  offer: ContractOffer;
  need: number;
  cores: number;
  done: boolean;
  over: number;
  kills: number;
  time: number;
  marks: number;
  markNeed: number;
  revealed: boolean;
  relic?: GearItem;
  rooms: RoomRuntimeState[];
  /** set when the depth is done and the hero has to choose: lift out or go deeper */
  choosing?: boolean;
}

export interface MissionReport {
  won: boolean;
  offer: ContractOffer;
  relic: GearItem | null;
  kills: number;
  time: number;
  xp: number;
  glint: number;
  marks: number;
  markNeed: number;
  threat?: {
    was: number;
    now: number;
    name: string;
  };
  prize?: GearItem;
  /** the deepest depth reached on this run, and whether it beat the hero's record */
  depth?: number;
  cleared?: number;
  record?: boolean;
  /** pieces found on the run; on a fall below the first depth, the ones lost */
  found?: number;
  lost?: { glint: number; xp: number; items: GearItem[] };
}
