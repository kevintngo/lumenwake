import { CLASSES } from '../../data/classes';
import { PEOPLES } from '../../data/peoples';
import { TALENTS } from '../../data/talents';
import { ATTRIBUTES, xpToNext } from '../../sim/character/stats';
import { rank } from '../../sim/character/talents';
import type { TalentId } from '../../types/domain';
import type { GameContext } from '../../types/game-context';
import { ATTR_ICONS, SKILL_ICONS } from '../icons';
import { getSkillList, NUMERAL, pct } from '../ui-helpers';
import { LiveFigure } from './live-figure';

interface CharacterTabProps {
  game: GameContext;
  touch: boolean;
  onMutate: () => void;
}

export function CharacterTab({ game, touch, onMutate }: CharacterTabProps) {
  const p = game.player;
  const s = p.sheet;
  const need = xpToNext(s.level);
  const hasOffer = s.picks > 0 && Boolean(s.offer && s.offer.length > 0);
  const skills = getSkillList(game);

  const stats: readonly (readonly [string, string | number, string])[] = [
    ['Health', p.maxHp, 'Health'],
    ['Focus', p.maxFocus, 'Focus: what abilities cost'],
    ['Attack', p.attack.toFixed(0), 'Attack: what a blow does'],
    ['Haste', p.attackSpeed.toFixed(2), 'Haste: attacks a second'],
    ['Armor', p.defense.toFixed(0), 'Armor: taken off every blow'],
    ['Critical', pct(p.crit), 'The chance a blow is critical'],
    ['Crit hit', pct(p.critDamage), 'What a critical blow does, beside a plain one'],
    ['Dodge', pct(p.dodge), 'The chance a blow misses you'],
    ['Power', pct(p.power), 'Technique power: how hard abilities hit'],
    ['Speed', pct(p.speedMul), 'How fast you run'],
  ];

  const talentIds = Array.from(
    new Set([
      ...(Object.keys(s.talents || {}) as TalentId[]),
      ...(Object.keys(s.bonus || {}) as TalentId[]),
    ]),
  ).filter((id) => rank(s, id) > 0);

  return (
    <div class={`char${hasOffer ? ' has-offer' : ''}`}>
      <section class="char-figure" aria-label="Who you are">
        <LiveFigure game={game} what="hero" label="Your surveyor." />
        <div class="who-card">
          <strong class={`c-${s.cls}`}>{p.name || 'Surveyor'}</strong>
          <small>
            {PEOPLES[s.people || 'unit'].name} · {CLASSES[s.cls].name}
          </small>
          <div class="who-level">
            <span>
              Level <b class="c-num">{s.level}</b>
            </span>
            <span class="c-xp">
              {s.xp} / {need}
            </span>
          </div>
          <div class="bar xp" role="img" aria-label={`Experience: ${s.xp} of ${need}`}>
            <i style={{ transform: `scaleX(${Math.min(1, s.xp / need).toFixed(3)})` }} />
          </div>
        </div>
      </section>

      {hasOffer && s.offer && (
        <section class="char-offer" aria-label="A talent to choose">
          <h3 class="label">
            Choose a talent
            {s.picks > 1 && <span class="chip hot">{s.picks} to choose</span>}
          </h3>
          <div class="offer-row">
            {s.offer.map((id) => {
              const t = TALENTS[id];
              const r = rank(s, id);
              return (
                <div key={id} class="pickcard">
                  <div>
                    <strong class="c-key">
                      {t.name}
                      {t.max > 1 ? ` ${NUMERAL[r + 1]}` : ''}
                    </strong>
                    <small>{t.desc}</small>
                  </div>
                  <button
                    type="button"
                    class="btn primary"
                    data-act="talent"
                    data-arg={id}
                    aria-label={`Choose ${t.name}: ${t.desc}`}
                    onClick={() => {
                      if (game.chooseTalent(id)) onMutate();
                    }}
                  >
                    Choose
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div class="char-main">
        <section>
          <h3 class="label">
            Attributes{' '}
            {s.points > 0 && (
              <span class="chip hot">
                {s.points} {s.points === 1 ? 'point' : 'points'} to spend
              </span>
            )}
          </h3>
          <div class="attr-grid">
            {ATTRIBUTES.map((a) => {
              const bonus = p.attr[a.id] - s.base[a.id];
              return (
                <div key={a.id} class="attr-tile" data-tip={`${a.name}: ${a.hint}`} title={a.hint}>
                  {ATTR_ICONS[a.id]()}
                  <span class="attr-name">{a.name}</span>
                  <span class="attr-val">
                    {s.base[a.id]}
                    {bonus !== 0 && <u>+{bonus}</u>}
                  </span>
                  <button
                    type="button"
                    class="plus"
                    data-act="attr"
                    data-arg={a.id}
                    disabled={!s.points}
                    aria-label={`Raise ${a.name}: ${a.hint}`}
                    data-tip={`${a.name}: ${a.hint}`}
                    onClick={() => {
                      if (game.spendAttribute(a.id)) onMutate();
                    }}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        <section>
          <h3 class="label">Numbers</h3>
          <div class="stats">
            {stats.map(([label, val, tip]) => (
              <div key={label} data-tip={tip} title={tip}>
                <span>{label}</span>
                <b>{val}</b>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section class="char-side">
        <h3 class="label">Abilities</h3>
        <div class="abilities">
          {skills.map((k) => {
            const open = s.level >= k.unlock;
            const cost = `${k.focus} focus · ready every ${k.cooldown} s`;
            const iconFn = SKILL_ICONS[k.icon];
            return (
              <div
                key={k.id}
                class={`ability${open ? '' : ' locked'}`}
                data-tip={`${k.name}: ${cost}`}
                title={cost}
              >
                {iconFn ? iconFn() : null}
                <div>
                  <strong>{k.name}</strong>
                  <small>{k.desc}</small>
                </div>
                {open ? (
                  touch ? null : (
                    <kbd>{k.key}</kbd>
                  )
                ) : (
                  <span class="chip">Level {k.unlock}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section class="char-talents">
        <h3 class="label">Talents</h3>
        <div class="chips">
          {talentIds.length > 0 ? (
            talentIds.map((id) => {
              const t = TALENTS[id];
              const r = rank(s, id);
              return (
                <button
                  key={id}
                  type="button"
                  class="chip"
                  data-act="note"
                  data-tip={`${t.name}: ${t.desc}`}
                  title={t.desc}
                >
                  {t.name}
                  {(t.max > 1 || r > 1) && (
                    <>
                      {' '}
                      <b>{NUMERAL[r] || r}</b>
                    </>
                  )}
                </button>
              );
            })
          ) : (
            <span class="quiet">Each level brings a choice of three.</span>
          )}
        </div>
      </section>
    </div>
  );
}
