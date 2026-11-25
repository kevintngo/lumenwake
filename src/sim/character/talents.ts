import { CLASSES, SLOT_UNLOCK } from '../../data/classes';
import { TALENTS } from '../../data/talents';
import type { TalentId } from '../../types/domain';
import type { PlayerSheet } from '../../types/sheet';
import { rand } from '../sim-rng';

const TALENT_IDS = Object.keys(TALENTS) as TalentId[];

const taken = (sheet: PlayerSheet, id: TalentId): number =>
  (sheet.talents && sheet.talents[id]) || 0;

export const rank = (sheet: PlayerSheet, id: TalentId): number =>
  taken(sheet, id) + ((sheet.bonus && sheet.bonus[id]) || 0);

export function rollOffer(sheet: PlayerSheet): TalentId[] | null {
  const abilities = CLASSES[sheet.cls].abilities;
  const open = TALENT_IDS.filter((id) => {
    const t = TALENTS[id];
    if (taken(sheet, id) >= t.max) return false;
    if (!t.skill) return true;
    const slot = abilities.indexOf(t.skill);
    return slot >= 0 && sheet.level >= SLOT_UNLOCK[slot];
  });
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [open[i], open[j]] = [open[j], open[i]];
  }
  return open.length ? open.slice(0, 3) : null;
}

export function takeTalent(sheet: PlayerSheet, id: TalentId): boolean {
  if (!sheet.picks || !sheet.offer || !sheet.offer.includes(id)) return false;
  sheet.talents = sheet.talents || {};
  sheet.talents[id] = taken(sheet, id) + 1;
  sheet.picks--;
  sheet.offer = sheet.picks > 0 ? rollOffer(sheet) : null;
  if (!sheet.offer) sheet.picks = 0;
  return true;
}
