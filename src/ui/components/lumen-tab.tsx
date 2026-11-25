import { ITEMS } from '../../data/items';
import { FOODS, LUMENS, LUMEN_MAX, LUMEN_STAGES, LUMEN_STEP, TEMPERS } from '../../data/lumens';
import {
  lumenLevel,
  lumenMods,
  lumenStage,
  lumenToNext,
  lumenTotal,
} from '../../sim/companion/lumen-math';
import type { FoodId, ItemId } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import type { BagStack } from '../../types/sheet';
import { TEMPER_ICONS } from '../icons';
import { BagTile, ItemDetail, type PickContext } from './item-detail';
import { LiveFigure } from './live-figure';

interface LumenTabProps {
  game: GameContext;
  touch: boolean;
  pickedKey: string;
  onPick: (ctx: PickContext, key: string) => void;
  onMutate: () => void;
}

function isFood(id: ItemId): id is FoodId {
  return id in FOODS;
}

export function LumenTab({ game, touch, pickedKey, onPick, onMutate }: LumenTabProps) {
  const s = game.player.sheet;
  const l = s.lumen;
  const L = LUMENS[l.kind];
  const level = lumenLevel(l);
  const stage = lumenStage(l);
  const most = Math.max(8, l.ember, l.shell, l.tide);
  const into = level < LUMEN_MAX ? (lumenTotal(l) % LUMEN_STEP) / LUMEN_STEP : 1;

  const mods = Object.fromEntries(lumenMods(l).map((x) => [x.stat, x.value])) as Record<string, number>;
  const share = (v: number): string => `+${Math.round(v * 1000) / 10}%`;
  const lends: readonly (readonly [string, string])[] = [
    ['Attack', share(mods.attack || 0)],
    ['Armor', `+${(mods.defense || 0).toFixed(1)}`],
    ['Health', share(mods.maxHp || 0)],
    ['Technique', share(mods.power || 0)],
    ['Focus recovery', share(mods.focusRegen || 0)],
  ];

  const worth = (b: BagStack): number => {
    if (!isFood(b.id)) return 0;
    const f = FOODS[b.id];
    return TEMPERS.reduce((sum, t) => sum + (f[t.id] || 0), 0) * b.n;
  };
  const foods = s.bag
    .filter((b) => isFood(b.id) && b.n > 0)
    .sort(
      (x, y) =>
        Number(ITEMS[x.id].kind === 'use') - Number(ITEMS[y.id].kind === 'use') ||
        worth(y) - worth(x),
    );

  const validKeys = foods.map((b) => `food:${b.id}`);
  const activeKey = validKeys.includes(pickedKey) ? pickedKey : validKeys[0] || '';
  const emptyFoods = Math.max(0, 8 - foods.length);

  return (
    <div class="lumenview">
      <section class="lumen-figure" aria-label="Your lumen">
        <LiveFigure game={game} what="lumen" label="Your lumen." />
        <div class="who-card">
          <strong class="c-key">{L.name}</strong>
          <small>{L.blurb}</small>
          <div class="who-level">
            <span>
              Level <b class="c-num">{level}</b>
            </span>
            <span class="quiet">
              {level < LUMEN_MAX ? `${lumenToNext(l)} to the next` : 'Full grown'}
            </span>
          </div>
          <div class="bar lu" role="img" aria-label="Toward its next level">
            <i style={{ transform: `scaleX(${into.toFixed(3)})` }} />
          </div>
        </div>
      </section>

      <div class="lumen-main">
        <section class={`card burst${l.charge >= 100 ? ' full' : ''}`}>
          <h3 class="label">
            Burst
            {!touch && (
              <>
                {' '}
                <kbd>G</kbd>
              </>
            )}
          </h3>
          <p>
            <strong class="c-key">{L.burst.name}</strong>
            {L.burst.text}
          </p>
          <div class="charge">
            <div class="bar lu" role="img" aria-label={`Charge: ${Math.round(l.charge)} of 100`}>
              <i style={{ transform: `scaleX(${(l.charge / 100).toFixed(3)})` }} />
            </div>
            <b class="c-num">{Math.round(l.charge)}%</b>
          </div>
        </section>

        <section>
          <h3 class="label">Tempers</h3>
          <div class="tempers">
            {TEMPERS.map((t) => (
              <div key={t.id} class="temper" data-tip={`${t.name}: lends ${t.gives}`}>
                {TEMPER_ICONS[t.id]()}
                <span class={t.cls}>{t.name}</span>
                <span class="bar">
                  <i class={t.cls} style={{ transform: `scaleX(${(l[t.id] / most).toFixed(3)})` }} />
                </span>
                <b class="c-num">{l[t.id]}</b>
                <small>{t.gives}</small>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 class="label">Lends you</h3>
          <div class="stats lends">
            {lends.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <b class="c-good">{v}</b>
              </div>
            ))}
          </div>
        </section>

        <p class="quiet">
          {stage < 2 ? (
            <>
              New shape at level <b class="c-num">{LUMEN_STAGES[stage + 1]}</b>, by its strongest temper.
            </>
          ) : (
            'It has taken its last shape.'
          )}
        </p>
      </div>

      <section class="lumen-feed">
        <h3 class="label">Feed it</h3>
        <div class="tiles">
          {foods.map((b) => {
            const key = `food:${b.id}`;
            return (
              <BagTile
                key={b.id}
                game={game}
                stack={b}
                ctx="food"
                itemKey={key}
                selected={activeKey === key}
                onPick={onPick}
              />
            );
          })}
          {Array.from({ length: emptyFoods }, (_, i) => (
            <div key={`ef-${i}`} class="tile empty" />
          ))}
        </div>
        <ItemDetail
          game={game}
          ctx="food"
          selectedKey={activeKey}
          onPick={onPick}
          onMutate={onMutate}
        />
      </section>
    </div>
  );
}
