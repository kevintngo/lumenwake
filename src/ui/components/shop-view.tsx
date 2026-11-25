import { ITEMS, RECIPES, SHOP_STOCK } from '../../data/items';
import { BAG_GEAR } from '../../sim/character/stats';
import type { ItemId } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import { itemIcon } from '../icons';
import { BagTile, GearTile, ItemDetail, type PickContext } from './item-detail';

interface ShopViewProps {
  game: GameContext;
  pickedKey: string;
  onPick: (ctx: PickContext, key: string) => void;
  onMutate: () => void;
}

export function ShopView({ game, pickedKey, onPick, onMutate }: ShopViewProps) {
  const s = game.player.sheet;
  const stock = game.missions.stock;
  const matsValue = s.bag
    .filter((b) => ITEMS[b.id].kind === 'mat')
    .reduce((n, b) => n + (ITEMS[b.id].value || 0) * b.n, 0);

  const validKeys: string[] = [];
  for (let i = 0; i < stock.length; i++) validKeys.push(`stock:${i}`);
  for (const it of s.gear) validKeys.push(`gear:${it.uid}`);
  for (const b of s.bag) validKeys.push(`bag:${b.id}`);
  const activeKey = validKeys.includes(pickedKey) ? pickedKey : validKeys[0] || '';

  const emptyStock = Math.max(0, 8 - stock.length);
  const emptyGear = Math.max(0, BAG_GEAR - s.gear.length);
  const emptyBag = Math.max(0, 10 - s.bag.length);

  return (
    <div class="shopview">
      <div class="shop-buy">
        <section>
          <h3 class="label">Supplies</h3>
          {SHOP_STOCK.map((id) => {
            const it = ITEMS[id];
            const price = it.price || 0;
            return (
              <div key={id} class="buyrow" data-tip={`${it.name} · ${it.desc || ''}`}>
                {itemIcon(it)}
                <div>
                  <strong>{it.name}</strong>
                  <small>{it.desc}</small>
                </div>
                <button
                  type="button"
                  class="btn"
                  data-act="buy"
                  data-arg={id}
                  disabled={s.glint < price}
                  aria-label={`Buy ${it.name} for ${price} glint`}
                  onClick={() => {
                    game.loot.buy(id);
                    onMutate();
                  }}
                >
                  Buy · {price}
                </button>
              </div>
            );
          })}
        </section>

        <section>
          <h3 class="label">Made from materials</h3>
          {RECIPES.map((r, i) => {
            const needIds = Object.keys(r.needs) as ItemId[];
            const can =
              s.glint >= r.glint &&
              needIds.every((id) => game.loot.count(id) >= (r.needs[id] || 0));
            const outItem = ITEMS[r.id];
            return (
              <div key={r.id} class="buyrow">
                {itemIcon(outItem)}
                <div>
                  <strong>{outItem.name}</strong>
                  <small>
                    {needIds.map((id, idx) => {
                      const req = r.needs[id] || 0;
                      const have = game.loot.count(id);
                      return (
                        <span key={id}>
                          {idx > 0 ? ', ' : ''}
                          {ITEMS[id].name}{' '}
                          <b class={have >= req ? 'c-good' : 'c-bad'}>
                            {Math.min(have, req)}/{req}
                          </b>
                        </span>
                      );
                    })}
                  </small>
                </div>
                <button
                  type="button"
                  class="btn"
                  data-act="craft"
                  data-arg={String(i)}
                  disabled={!can}
                  aria-label={`Make ${outItem.name} for ${r.glint} glint`}
                  onClick={() => {
                    game.loot.craft(i);
                    onMutate();
                  }}
                >
                  Make · {r.glint}
                </button>
              </div>
            );
          })}
        </section>
      </div>

      <div class="shop-grids">
        <section>
          <h3 class="label">For sale</h3>
          <div class="tiles">
            {stock.map((it, i) => {
              const key = `stock:${i}`;
              return (
                <GearTile
                  key={it.uid}
                  game={game}
                  item={it}
                  ctx="shop"
                  itemKey={key}
                  selected={activeKey === key}
                  onPick={onPick}
                />
              );
            })}
            {Array.from({ length: emptyStock }, (_, i) => (
              <div key={`es-${i}`} class="tile empty" />
            ))}
          </div>
        </section>

        <section>
          <h3 class="label">
            Your gear{' '}
            <span class="quiet">
              {s.gear.length} of {BAG_GEAR}
            </span>
          </h3>
          <div class="tiles">
            {s.gear.map((it) => {
              const key = `gear:${it.uid}`;
              return (
                <GearTile
                  key={it.uid}
                  game={game}
                  item={it}
                  ctx="shop"
                  itemKey={key}
                  selected={activeKey === key}
                  onPick={onPick}
                />
              );
            })}
            {Array.from({ length: emptyGear }, (_, i) => (
              <div key={`eg-${i}`} class="tile empty" />
            ))}
          </div>
        </section>

        <section>
          <h3 class="label">
            Your bag{' '}
            <button
              type="button"
              class="btn small"
              data-act="sellmats"
              disabled={matsValue === 0}
              onClick={() => {
                game.loot.sellMaterials();
                onMutate();
              }}
            >
              Sell all materials · {matsValue}
            </button>
          </h3>
          <div class="tiles">
            {s.bag.map((b) => {
              const key = `bag:${b.id}`;
              return (
                <BagTile
                  key={b.id}
                  game={game}
                  stack={b}
                  ctx="shop"
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
        ctx="shop"
        selectedKey={activeKey}
        onPick={onPick}
        onMutate={onMutate}
      />
    </div>
  );
}
