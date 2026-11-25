import { CLASSES } from '../../data/classes';
import { GEAR_SLOTS } from '../../data/gear';
import { BAG_GEAR } from '../../sim/character/stats';
import { baseOf, describe, salvageYield } from '../../sim/inventory/gear-service';
import type { SlotKind } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import { GEAR_ICONS, gearIcon } from '../icons';
import { BagTile, GearTile, ItemDetail, type PickContext } from './item-detail';
import { LiveFigure } from './live-figure';

interface GearTabProps {
  game: GameContext;
  pickedKey: string;
  onPick: (ctx: PickContext, key: string) => void;
  onMutate: () => void;
}

const SLOT_ORDER: Readonly<Record<SlotKind, number>> = {
  weapon: 0,
  offhand: 1,
  unit: 2,
  mod: 3,
  visor: 4,
  frame: 5,
  grips: 6,
  greaves: 7,
  boots: 8,
};

export function GearTab({ game, pickedKey, onPick, onMutate }: GearTabProps) {
  const s = game.player.sheet;
  const sorted = [...s.gear].sort(
    (x, y) =>
      SLOT_ORDER[baseOf(x).slot] - SLOT_ORDER[baseOf(y).slot] ||
      y.rarity - x.rarity ||
      y.ilvl - x.ilvl ||
      x.uid - y.uid,
  );
  const spare = game.loot.spare();
  const spareParts = spare.reduce((n, it) => n + salvageYield(it), 0);

  const validKeys: string[] = [];
  for (const [slot] of GEAR_SLOTS) {
    if (s.equip[slot]) validKeys.push(`worn:${slot}`);
  }
  for (const it of sorted) validKeys.push(`gear:${it.uid}`);
  for (const b of s.bag) validKeys.push(`bag:${b.id}`);
  const activeKey = validKeys.includes(pickedKey) ? pickedKey : validKeys[0] || '';

  const emptyCarried = Math.max(0, BAG_GEAR - s.gear.length);
  const emptyBag = Math.max(0, 10 - s.bag.length);

  return (
    <div class="gearview">
      <section class="gear-worn doll" aria-label="Worn">
        <h3 class="label">Worn</h3>
        <LiveFigure game={game} what="hero" label="Your surveyor." />
        {GEAR_SLOTS.map(([slot, name], i) => {
          const it = s.equip[slot];
          const kind = slot.replace(/\d$/, '');
          const posStyle = {
            gridColumn: i < 5 ? 1 : 3,
            gridRow: (i % 5) + 2,
          };
          if (!it) {
            const iconKey =
              kind === 'weapon' || kind === 'offhand' ? CLASSES[s.cls].family : kind;
            const iconFn = GEAR_ICONS[iconKey];
            return (
              <div
                key={slot}
                class="worn-tile empty"
                style={posStyle}
                data-tip={`${name}: empty`}
                aria-label={`${name}: empty`}
              >
                <span class="worn-icon">{iconFn ? iconFn() : null}</span>
                <small>{name}</small>
              </div>
            );
          }
          const d = describe(it);
          const key = `worn:${slot}`;
          return (
            <button
              key={slot}
              type="button"
              class={`worn-tile${it.relic ? ' relic' : ''}`}
              style={{ '--rc': d.color, ...posStyle }}
              data-act="pick"
              data-ctx="gear"
              data-key={key}
              aria-pressed={activeKey === key ? 'true' : 'false'}
              aria-label={`${name}: ${d.name}, ${d.rarity}, level ${d.ilvl}`}
              data-tip={`${name} · ${d.name} · level ${d.ilvl}`}
              onClick={() => {
                onPick('gear', key);
                game.bus.emit('ui:click');
              }}
            >
              <span class="worn-icon">{gearIcon(baseOf(it))}</span>
              <span class="lv">{d.ilvl}</span>
            </button>
          );
        })}
      </section>

      <div class="gear-grids">
        <section>
          <div class="carried-head">
            <h3 class="label">
              Carried{' '}
              <span class="quiet">
                {s.gear.length} of {BAG_GEAR}
              </span>
            </h3>
            <span
              class="parts"
              data-tip="Parts: what salvaged gear comes apart into. Honing a piece spends them."
            >
              Parts <b class="c-parts">{s.parts || 0}</b>
            </span>
            <button
              type="button"
              class="btn small"
              data-act="salvagespare"
              disabled={spare.length === 0}
              data-tip={
                spare.length
                  ? `Takes apart the ${spare.length} standard and tuned ${
                      spare.length === 1 ? 'piece' : 'pieces'
                    } that are not plainly better than what you wear, for ${spareParts} parts. Locked pieces are left alone.`
                  : 'Nothing spare: every standard or tuned piece is locked, or better than what you wear.'
              }
              onClick={() => {
                game.loot.salvageSpare();
                onMutate();
              }}
            >
              Salvage spare
              {spare.length > 0 && (
                <>
                  {' '}
                  <b class="c-num">{spare.length}</b>
                </>
              )}
            </button>
          </div>
          <div class="tiles">
            {sorted.map((it) => {
              const key = `gear:${it.uid}`;
              return (
                <GearTile
                  key={it.uid}
                  game={game}
                  item={it}
                  ctx="gear"
                  itemKey={key}
                  selected={activeKey === key}
                  onPick={onPick}
                />
              );
            })}
            {Array.from({ length: emptyCarried }, (_, i) => (
              <div key={`eg-${i}`} class="tile empty" />
            ))}
          </div>
        </section>

        <section>
          <h3 class="label">Supplies and materials</h3>
          <div class="tiles">
            {s.bag.map((b) => {
              const key = `bag:${b.id}`;
              return (
                <BagTile
                  key={b.id}
                  game={game}
                  stack={b}
                  ctx="gear"
                  itemKey={key}
                  selected={activeKey === key}
                  onPick={onPick}
                />
              );
            })}
            {Array.from({ length: emptyBag }, (_, i) => (
              <div key={`eb-${i}`} class="tile empty" />
            ))}
          </div>
        </section>
      </div>

      <ItemDetail
        game={game}
        ctx="gear"
        selectedKey={activeKey}
        onPick={onPick}
        onMutate={onMutate}
      />
    </div>
  );
}
