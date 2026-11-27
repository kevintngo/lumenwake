import type { JSX } from '../dom';
import { FAMILIES } from '../../data/classes';
import { SLOT_KINDS } from '../../data/gear';
import { ITEMS } from '../../data/items';
import { FOODS, TEMPERS } from '../../data/lumens';
import { BAG_GEAR, compare } from '../../sim/character/stats';
import {
  baseOf,
  canUse,
  describe,
  honeBar,
  honeCost,
  itemPrice,
  rarityOf,
  salvageYield,
} from '../../sim/inventory/gear-service';
import type { EquipSlot, FoodId, ItemId, StatKey } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import type { BagStack, GearItem } from '../../types/sheet';
import { gearIcon, itemIcon, statIcon, TOOL_ICONS } from '../icons';
import { findEquippedSlot, STAT_SHORT } from '../ui-helpers';

export type PickContext = 'gear' | 'food' | 'shop';

function renderStatRow(stat: StatKey, v: string, bad: boolean, idx: number) {
  return (
    <li key={`${stat}-${idx}`}>
      {statIcon(stat)}
      <b class={bad ? 'c-bad' : 'c-good'}>{v}</b>
      <span>{STAT_SHORT[stat] || stat}</span>
    </li>
  );
}

interface ItemCardProps {
  game: GameContext;
  item: GearItem;
  versus?: JSX.Element | null;
}

export function ItemCard({ game, item, versus }: ItemCardProps) {
  const s = game.player.sheet;
  const d = describe(item);
  const R = rarityOf(item);
  const b = baseOf(item);
  const usable = canUse(s.cls, item);

  return (
    <>
      <div class="detail-head">
        <span class={`tile${item.relic ? ' relic' : ''}`} style={{ '--rc': R.color }}>
          {gearIcon(b)}
        </span>
        <div>
          <strong class="name" style={{ color: d.color }}>
            {d.name}
          </strong>
          <small>
            <span style={{ color: d.color }}>{d.rarity}</span> {SLOT_KINDS[d.slot].toLowerCase()}
            {d.family ? ` · ${FAMILIES[d.family].name}` : ''}
            {item.relic ? ` · ${d.base}` : ''}
          </small>
        </div>
        <span class="lv-badge" aria-label={`Level ${d.ilvl}`}>
          <small>Level</small>
          <b>{d.ilvl}</b>
        </span>
      </div>

      {d.relic && (
        <section class="item-sec relic-power">
          <h4 class="sec-label">
            {TOOL_ICONS.relic()}
            Relic power
          </h4>
          <p>{d.relic}</p>
        </section>
      )}

      <section class="item-sec">
        <h4 class="sec-label">Gives</h4>
        <ul class="stat-rows">{d.rows.map((r, i) => renderStatRow(r.stat, r.v, r.bad, i))}</ul>
      </section>

      {d.lends && (
        <section class="item-sec lends">
          <h4 class="sec-label">
            {TOOL_ICONS.lend()}
            Lends a talent
          </h4>
          <p>
            <b class="c-key">
              {d.lends.name}
              {d.lends.ranks > 1 ? ` +${d.lends.ranks}` : ''}
            </b>{' '}
            {d.lends.desc}
          </p>
        </section>
      )}

      {!usable && (
        <p class="item-note c-bad">
          {TOOL_ICONS.warn()}
          Not for your class.
        </p>
      )}

      {versus}
    </>
  );
}

interface GearTileProps {
  game: GameContext;
  item: GearItem;
  ctx: PickContext;
  itemKey: string;
  selected: boolean;
  onPick: (ctx: PickContext, key: string) => void;
}

export function GearTile({ game, item, ctx, itemKey, selected, onPick }: GearTileProps) {
  const s = game.player.sheet;
  const d = describe(item);
  const R = rarityOf(item);
  const cannot = !canUse(s.cls, item);
  const v =
    (itemKey.startsWith('gear:') || itemKey.startsWith('stock:')) && !cannot
      ? compare(s, item).verdict
      : 0;
  const mark = v > 0 ? 'up' : v < 0 && item.rarity < 3 ? 'down' : '';
  const says = `${d.name} · ${R.name} ${d.slot} · level ${d.ilvl}${
    mark === 'up'
      ? ' · better than what you wear'
      : mark === 'down'
        ? ' · no better than what you wear'
        : ''
  }${item.lock ? ' · locked' : ''}`;

  return (
    <button
      type="button"
      class={`tile${cannot ? ' cannot' : ''}${item.relic ? ' relic' : ''}`}
      style={{ '--rc': R.color }}
      data-act="pick"
      data-ctx={ctx}
      data-key={itemKey}
      aria-pressed={selected ? 'true' : 'false'}
      aria-label={`${says.replace(/ · /g, ', ')}${cannot ? ', not for your class' : ''}`}
      data-tip={says}
      onClick={() => {
        onPick(ctx, itemKey);
        game.bus.emit('ui:click');
      }}
    >
      {gearIcon(baseOf(item))}
      {mark && <i class={`mark ${mark}`} aria-hidden="true" />}
      {item.lock && <i class="mark lock" aria-hidden="true" />}
      <span class="lv">{d.ilvl}</span>
    </button>
  );
}

interface BagTileProps {
  game: GameContext;
  stack: BagStack;
  ctx: PickContext;
  itemKey: string;
  selected: boolean;
  onPick: (ctx: PickContext, key: string) => void;
}

export function BagTile({ game, stack, ctx, itemKey, selected, onPick }: BagTileProps) {
  const it = ITEMS[stack.id];
  return (
    <button
      type="button"
      class="tile"
      data-act="pick"
      data-ctx={ctx}
      data-key={itemKey}
      aria-pressed={selected ? 'true' : 'false'}
      aria-label={`${it.name}, ${stack.n}`}
      data-tip={`${it.name}${it.desc ? ` · ${it.desc}` : ''}`}
      onClick={() => {
        onPick(ctx, itemKey);
        game.bus.emit('ui:click');
      }}
    >
      {itemIcon(it)}
      <span class="count">{stack.n}</span>
    </button>
  );
}

interface ItemDetailProps {
  game: GameContext;
  ctx: PickContext;
  selectedKey: string;
  onPick: (ctx: PickContext, key: string) => void;
  onMutate: () => void;
}

function isFoodId(id: ItemId): id is FoodId {
  return id in FOODS;
}

export function ItemDetail({ game, ctx, selectedKey, onPick, onMutate }: ItemDetailProps) {
  const p = game.player;
  const s = p.sheet;
  const [kind, id = ''] = selectedKey.split(':');

  let gearItem: GearItem | null = null;
  let bagStack: BagStack | null = null;

  if (kind === 'worn') {
    gearItem = s.equip[id as EquipSlot] || null;
  } else if (kind === 'gear') {
    gearItem = s.gear.find((it) => String(it.uid) === id) || null;
  } else if (kind === 'stock') {
    gearItem = game.missions.stock[Number(id)] || null;
  } else if (kind === 'bag' || kind === 'food') {
    const found = s.bag.find((b) => b.id === id) || null;
    if (found && (ctx !== 'food' || isFoodId(found.id))) bagStack = found;
  }

  const label = ctx === 'food' ? 'Selected food' : 'Selected';

  if (!gearItem && !bagStack) {
    return (
      <aside class="detail" data-for={ctx} aria-label={label} aria-live="polite">
        <p class="quiet">
          {ctx === 'food'
            ? 'Nothing to feed it. It eats what creatures drop.'
            : ctx === 'shop'
              ? 'Select a piece to see it.'
              : 'Nothing carried yet. Creatures, pods and contracts pay in gear.'}
        </p>
      </aside>
    );
  }

  if (gearItem) {
    const item = gearItem;
    const worn = kind === 'worn';
    let versus: JSX.Element | null = null;
    if (!worn && canUse(s.cls, item)) {
      const c = compare(s, item);
      const now = c.worn;
      const shown = c.lines.length > 6 ? c.lines.slice(0, 5) : c.lines;
      const more = c.lines.length - shown.length;
      const lost =
        now && now.relic
          ? `You lose ${describe(now).name}’s power.`
          : now && now.power
            ? 'You lose the talent it lends.'
            : '';
      const nowDesc = now ? describe(now) : null;
      const amount = (l: (typeof c.lines)[number]): string =>
        `${l.up ? '+' : '−'}${
          Math.abs(l.by) >= 10 || l.pct ? Math.round(Math.abs(l.by)) : Math.round(Math.abs(l.by) * 10) / 10
        }${l.pct ? '%' : ''}`;

      versus = (
        <section class="item-sec versus">
          <h4 class="sec-label">
            {TOOL_ICONS.swap()}
            If worn
            {nowDesc && (
              <>
                {' '}
                <span class="quiet">
                  in place of <b style={{ color: nowDesc.color }}>{nowDesc.name}</b>
                </span>
              </>
            )}
          </h4>
          {shown.length > 0 ? (
            <ul class="stat-rows">
              {shown.map((l, i) => renderStatRow(l.stat, amount(l), !l.up, i))}
              {more > 0 && <li class="more quiet">and {more} more</li>}
            </ul>
          ) : (
            <p class="quiet">No change to your numbers.</p>
          )}
          {lost && (
            <p class="item-note c-bad">
              {TOOL_ICONS.warn()}
              {lost}
            </p>
          )}
        </section>
      );
    }

    const renderGearTools = (key: string) => {
      const c = honeCost(item);
      const bar = honeBar(s, item);
      const honeRow = (
        <div class="hone-row">
          <span class="hone-to">
            {bar ? (
              <span class="quiet">{bar}</span>
            ) : (
              <>
                Hone to <b class="c-num">{item.ilvl + 1}</b>
                <span class="cost">
                  {TOOL_ICONS.parts()}
                  <b class="c-parts">{c.parts}</b>
                </span>
                <span class="cost coin">
                  <b class="c-coin">{c.glint}</b>
                </span>
              </>
            )}
          </span>
          <button
            type="button"
            class="btn small"
            data-act="hone"
            data-arg={key}
            disabled={Boolean(bar)}
            aria-label={`Hone to level ${item.ilvl + 1} for ${c.parts} parts and ${c.glint} glint`}
            data-tip={
              bar ||
              `Raises it to level ${item.ilvl + 1}, as if it had dropped a level higher: ${c.parts} parts and ${c.glint} glint.`
            }
            onClick={() => {
              game.loot.hone(key);
              onMutate();
            }}
          >
            {TOOL_ICONS.hone()}
            Hone
          </button>
        </div>
      );

      if (worn) {
        const slot = key.slice(5) as EquipSlot;
        const full = s.gear.length >= BAG_GEAR;
        return (
          <div class="gear-tools">
            {honeRow}
            <div class="tool-row worn-row">
              <span class="tag">Worn</span>
              {slot !== 'weapon' && (
                <button
                  type="button"
                  class="btn small"
                  data-act="unequip"
                  data-arg={slot}
                  disabled={full}
                  data-tip={full ? 'Your pack is full.' : 'Takes it off, into your pack.'}
                  onClick={() => {
                    if (game.loot.unequip(slot)) {
                      const moved = s.gear[s.gear.length - 1];
                      if (moved) onPick('gear', `gear:${moved.uid}`);
                    }
                    onMutate();
                  }}
                >
                  {TOOL_ICONS.swap()}
                  Take off
                </button>
              )}
            </div>
          </div>
        );
      }

      const yieldN = salvageYield(item);
      const usable = canUse(s.cls, item);
      return (
        <div class="gear-tools">
          {honeRow}
          <div class="tool-row">
            <button
              type="button"
              class="btn small"
              data-act="lock"
              data-arg={String(item.uid)}
              aria-pressed={item.lock ? 'true' : 'false'}
              aria-label={item.lock ? 'Locked. Unlock it' : 'Lock it'}
              data-tip={
                item.lock
                  ? 'Locked: it cannot be salvaged or sold. Press to let it go.'
                  : 'Lock it, so it is never salvaged or sold by mistake.'
              }
              onClick={() => {
                game.loot.lock(item.uid);
                onMutate();
              }}
            >
              {item.lock ? TOOL_ICONS.lock() : TOOL_ICONS.open()}
              {item.lock ? 'Locked' : 'Lock'}
            </button>
            <button
              type="button"
              class="btn small"
              data-act="salvage"
              data-arg={String(item.uid)}
              disabled={Boolean(item.lock)}
              aria-label={`Salvage for ${yieldN} parts`}
              data-tip={
                item.lock
                  ? 'Locked. Unlock it first.'
                  : `Takes it apart for ${yieldN} parts. Parts hone the pieces you keep.`
              }
              onClick={() => {
                game.loot.salvage(item.uid);
                onMutate();
              }}
            >
              {TOOL_ICONS.parts()}
              Salvage <b class="c-parts">+{yieldN}</b>
            </button>
            <button
              type="button"
              class="btn primary"
              data-act="equip"
              data-arg={String(item.uid)}
              disabled={!usable}
              onClick={() => {
                if (game.loot.equip(item.uid)) {
                  const slot = findEquippedSlot(s, item.uid);
                  if (slot) onPick('gear', `worn:${slot}`);
                }
                onMutate();
              }}
            >
              Equip
            </button>
          </div>
        </div>
      );
    };

    let foot: JSX.Element;
    if (worn) {
      foot = ctx === 'gear' ? renderGearTools(selectedKey) : <span class="tag">Worn</span>;
    } else if (kind === 'gear') {
      const val = describe(item).value;
      foot =
        ctx === 'shop' ? (
          <>
            <span class="quiet">{item.lock ? 'Locked: unlock it in the Gear tab' : 'Yours'}</span>
            <button
              type="button"
              class="btn primary"
              data-act="sellgear"
              data-arg={String(item.uid)}
              disabled={Boolean(item.lock)}
              onClick={() => {
                game.loot.sellGear(item.uid);
                onMutate();
              }}
            >
              Sell · {val}
            </button>
          </>
        ) : (
          renderGearTools(selectedKey)
        );
    } else {
      const price = itemPrice(item);
      const full = s.gear.length >= BAG_GEAR;
      const stockIdx = Number(id);
      foot = (
        <>
          <span class="quiet">{full ? 'Your pack is full' : 'For sale'}</span>
          <button
            type="button"
            class="btn primary"
            data-act="buygear"
            data-arg={id}
            disabled={s.glint < price || full}
            onClick={() => {
              game.loot.buyGear(stockIdx);
              onMutate();
            }}
          >
            Buy · {price}
          </button>
        </>
      );
    }

    return (
      <aside class="detail" data-for={ctx} aria-label={label} aria-live="polite">
        <div class="detail-body item-card">
          <ItemCard game={game} item={item} versus={versus} />
        </div>
        <div class="detail-foot">{foot}</div>
      </aside>
    );
  }

  const stack = bagStack!;
  const itemDef = ITEMS[stack.id];
  const foodStats = isFoodId(stack.id) ? FOODS[stack.id] : null;
  const foodParts = foodStats
    ? TEMPERS.filter((t) => Boolean(foodStats[t.id]))
    : [];

  let foot: JSX.Element;
  if (ctx === 'shop') {
    foot = itemDef.value ? (
      <>
        <button
          type="button"
          class="btn"
          data-act="sellall"
          data-arg={stack.id}
          onClick={() => {
            game.loot.sell(stack.id, game.loot.count(stack.id));
            onMutate();
          }}
        >
          Sell all · {itemDef.value * stack.n}
        </button>
        <button
          type="button"
          class="btn primary"
          data-act="sell"
          data-arg={stack.id}
          onClick={() => {
            game.loot.sell(stack.id, 1);
            onMutate();
          }}
        >
          Sell one · {itemDef.value}
        </button>
      </>
    ) : (
      <span class="quiet">Bram has no use for it.</span>
    );
  } else if (ctx === 'food') {
    foot = (
      <>
        {stack.n > 1 ? (
          <button
            type="button"
            class="btn"
            data-act="feedall"
            data-arg={stack.id}
            onClick={() => {
              for (let i = game.loot.count(stack.id); i > 0 && game.companion.feed(stack.id); i--);
              onMutate();
            }}
          >
            Feed all {stack.n}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          class="btn primary"
          data-act="feed"
          data-arg={stack.id}
          aria-label={`Feed it one ${itemDef.name}`}
          onClick={() => {
            game.companion.feed(stack.id);
            onMutate();
          }}
        >
          Feed
        </button>
      </>
    );
  } else {
    const full =
      itemDef.kind === 'use' &&
      (itemDef.effect === 'heal' ? p.hp >= p.maxHp : p.focus >= p.maxFocus);
    foot = (
      <>
        {foodParts.length > 0 ? (
          <button
            type="button"
            class="btn"
            data-act="feed"
            data-arg={stack.id}
            aria-label={`Feed one ${itemDef.name} to your lumen`}
            onClick={() => {
              game.companion.feed(stack.id);
              onMutate();
            }}
          >
            Feed lumen
          </button>
        ) : (
          <span />
        )}
        {itemDef.kind === 'use' && (
          <button
            type="button"
            class="btn primary"
            data-act="use"
            data-arg={stack.id}
            disabled={full}
            title={full ? 'Nothing to restore' : undefined}
            onClick={() => {
              game.loot.use(stack.id);
              onMutate();
            }}
          >
            Drink
          </button>
        )}
      </>
    );
  }

  return (
    <aside class="detail" data-for={ctx} aria-label={label} aria-live="polite">
      <div class="detail-head">
        <span class="tile">{itemIcon(itemDef)}</span>
        <div>
          <strong class="name c-item">{itemDef.name}</strong>
          <small>
            {itemDef.kind === 'use' ? 'Flask' : 'Material'} · <b class="c-num">×{stack.n}</b>
          </small>
        </div>
      </div>
      {itemDef.desc && <p>{itemDef.desc}</p>}
      <ul class="lines">
        {foodParts.length > 0 && (
          <li>
            Lumen:{' '}
            {foodParts.map((t, idx) => (
              <span key={t.id}>
                {idx > 0 ? ' · ' : ''}
                <b class={t.cls}>
                  +{foodStats![t.id]} {t.name}
                </b>
              </span>
            ))}
          </li>
        )}
        {itemDef.value && (
          <li>
            <span class="coin">Sells for {itemDef.value}</span>
          </li>
        )}
      </ul>
      <div class="detail-foot">{foot}</div>
    </aside>
  );
}
