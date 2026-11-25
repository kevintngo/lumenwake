import { biomeById } from '../../data/biomes';
import { CONDITIONS, THREATS, THREAT_MAX } from '../../data/threat';
import type { BiomeId, ConditionId, GoalId } from '../../types/domain';
import type { ContractOffer, ThreatProfile } from '../../types/mission';

const CONDITION_IDS = Object.keys(CONDITIONS) as ConditionId[];

export function rollConditions(
  rank: number,
  offer: { readonly biome: BiomeId; readonly goal: GoalId },
  rnd: () => number,
): ConditionId[] {
  const B = biomeById(offer.biome);
  const want = THREATS[Math.min(THREAT_MAX, Math.max(0, rank | 0))].conditions;
  const pool = CONDITION_IDS.filter((id) => {
    const cond = CONDITIONS[id];
    return !cond.only || (B !== undefined && cond.only(offer, B));
  });
  const out: ConditionId[] = [];
  while (out.length < want && pool.length) {
    out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  }
  return out;
}

export function threatOf(
  offer?: Pick<ContractOffer, 'threat' | 'conditions'> | null,
): ThreatProfile {
  const rank = Math.min(THREAT_MAX, Math.max(0, (offer?.threat ?? 0) | 0));
  const row = THREATS[rank];
  const T: ThreatProfile = {
    ...row,
    quick: 1,
    aggro: 1,
    glint: 1,
    leader: false,
    burst: null,
    strays: 0,
    hour: null,
    rageAt: 0.5,
    list: [],
  };
  for (const id of offer?.conditions ?? []) {
    const c = CONDITIONS[id];
    if (!c) continue;
    T.list.push({ id, name: c.name, text: c.text });
    if (c.hp) T.hp *= c.hp;
    if (c.atk) T.atk *= c.atk;
    if (c.purse) T.purse *= c.purse;
    if (c.quick) T.quick *= c.quick;
    if (c.aggro) T.aggro *= c.aggro;
    if (c.glint) T.glint *= c.glint;
    if (c.leader) T.leader = true;
    if (c.burst) T.burst = c.burst;
    if (c.strays) T.strays = c.strays;
    if (c.hour) T.hour = c.hour;
    if (c.rageAt) T.rageAt = c.rageAt;
  }
  return T;
}
