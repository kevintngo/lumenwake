import { BIOMES } from '../../data/biomes';
import { CREATURES } from '../../data/creatures';
import type { CreatureId } from '../../types/domain';
import type { ContractOffer } from '../../types/mission';
import type { BiomeDef, ZoneSpec } from '../../types/world';
import { threatOf } from './threat';

export function planEncounters(
  spec: ZoneSpec,
  theme: BiomeDef,
  offer: ContractOffer,
  rnd: () => number,
): number {
  const T = threatOf(offer);
  let table: readonly (readonly [CreatureId, number])[] = theme.monsters;
  if (T.strays) {
    const others = BIOMES.filter((b) => b.mission && b.id !== theme.id && b.monsters.length > 0);
    const from = others[Math.floor(rnd() * others.length)];
    const mine = new Set(table.map((r) => r[0]));
    table = [
      ...table,
      ...from.monsters
        .filter((r) => !mine.has(r[0]))
        .slice(0, T.strays)
        .map((r) => [r[0], 3] as const),
    ];
  }

  const draw = (purse: number): CreatureId | null => {
    const can = table.filter((r) => CREATURES[r[0]].cost <= purse);
    if (!can.length) return null;
    let roll = rnd() * can.reduce((n, r) => n + r[1], 0);
    for (const r of can) {
      roll -= r[1];
      if (roll <= 0) return r[0];
    }
    return can[0][0];
  };

  const wave = (purse: number): string[] => {
    const list: string[] = [];
    const lead = draw(purse);
    for (
      let id = lead;
      id && list.length < 6;
      id = rnd() < 0.6 ? (CREATURES[lead as CreatureId].cost <= purse ? lead : draw(purse)) : draw(purse)
    ) {
      list.push(id);
      purse -= CREATURES[id].cost;
    }
    return list;
  };

  const rooms = spec.rooms;
  const fights = rooms.filter((r) => r.kind === 'fight');
  for (const r of rooms) {
    r.waves = [];
    r.pods = 0;
    if (r.kind === 'fight') {
      const depth = fights.indexOf(r) / Math.max(1, fights.length - 1);
      const purse = (2.6 + offer.tier * 0.45) * (0.8 + 0.7 * depth) * T.purse;
      const waves = 1 + (rnd() < 0.3 + 0.35 * depth ? 1 : 0);
      for (let w = 0; w < waves; w++) r.waves.push(wave(purse * (w ? 0.8 : 1)));
      r.pods = rnd() < 0.45 ? 1 : 0;
    } else if (r.kind === 'cache') {
      r.pods = 1;
      if (rnd() < 0.6) r.waves.push(wave((2.4 + offer.tier * 0.3) * T.purse));
    } else if (r.kind === 'boss' && theme.boss) {
      r.waves.push(['@' + theme.boss]);
    }
  }

  let need = 0;
  if (offer.goal === 'recover') {
    need = Math.min(3, fights.length);
    for (let k = 0; k < need; k++) {
      const r = fights[Math.floor(((k + 0.5) * fights.length) / need)];
      r.pods = Math.max(1, r.pods);
    }
  }
  return need;
}
