import { biomeById } from '../../data/biomes';
import { CREATURES } from '../../data/creatures';
import { SLOT_KINDS } from '../../data/gear';
import { BOONS } from '../../data/sites';
import { THREAT_MAX } from '../../data/threat';
import { relicChance, relicsOf } from '../../sim/combat/relics-system';
import { GOALS } from '../../sim/missions/missions-system';
import { threatOf } from '../../sim/missions/threat';
import type { GameContext } from '../../types/game-context';
import type { ContractOffer } from '../../types/mission';
import { art, formatDuration } from '../ui-helpers';
import { LiveFigure } from './live-figure';

export function ThreatRow({ offer, bare = false }: { offer: ContractOffer; bare?: boolean }) {
  const T = threatOf(offer);
  if (!T.rank) return null;
  return (
    <div
      class="threat"
      data-tip={`Threat ${T.rank} of ${THREAT_MAX}. A place you have surveyed is more dangerous next time, and pays more.`}
    >
      <span class="threat-pips" role="img" aria-label={`Threat ${T.rank} of ${THREAT_MAX}`}>
        {Array.from({ length: THREAT_MAX }, (_, k) => (
          <i key={k} class={k < T.rank ? 'on' : undefined} />
        ))}
      </span>
      <b>{T.name}</b>
      {!bare &&
        T.list.map((c) => (
          <span key={c.id} class="chip" data-tip={`${c.name}: ${c.text}`} title={c.text}>
            {c.name}
          </span>
        ))}
    </div>
  );
}

export function AlsoPays({ game, offer }: { game: GameContext; offer: ContractOffer }) {
  const B = biomeById(offer.biome);
  const s = game.player.sheet;
  if (offer.goal !== 'hunt' || !B?.boss || !relicsOf(B.boss).length || offer.first) {
    return (
      <div>
        <span>Also</span>
        <b>Gear</b>
      </div>
    );
  }
  const chance = Math.round(relicChance(offer.threat || 0, s.relicDry || 0) * 100);
  return (
    <div data-tip="The chance its elder leaves a relic. It rises with the place’s threat, and after every elder that leaves none.">
      <span>Relic chance</span>
      <b class="c-relic">{chance}%</b>
    </div>
  );
}

interface ContractTabProps {
  game: GameContext;
  onMutate: () => void;
}

export function ContractTab({ game, onMutate }: ContractTabProps) {
  const ms = game.missions;
  const a = ms.active;
  const o = a ? a.offer : ms.pending;
  const s = game.player.sheet;
  const w = game.world;

  if (!o) {
    return (
      <div class="contract-none">
        <img src={art('place-town')} alt="" />
        <div>
          <h3>No contract</h3>
          <p>Ilse, the dispatcher, has three. She stands before the hall.</p>
          <p class="quiet">
            Contracts run: <b class="c-num">{s.missions || 0}</b>
          </p>
        </div>
      </div>
    );
  }

  const B = biomeById(o.biome);
  const goal = GOALS[o.goal];
  const bossId = o.goal === 'hunt' && B?.boss ? B.boss : null;
  const elder = bossId ? CREATURES[bossId] : null;
  const T = threatOf(o);
  const boon = s.boon && BOONS[s.boon] ? BOONS[s.boon] : null;
  const stateLabel = a ? (a.done ? 'Done: lifting out' : 'On contract') : 'Contract taken';
  const elderRelics = bossId && !o.first ? relicsOf(bossId) : [];

  const fights = a ? a.rooms.filter((_, i) => w.rooms[i]?.kind === 'fight') : [];
  const clearedFights = fights.filter((r) => r.state === 'clear').length;

  const renderProgressRow = (name: string, now: number, of: number) => (
    <div key={name} class={`prog${now >= of ? ' done' : ''}`}>
      <span>{name}</span>
      <b class="c-num">
        {now} of {of}
      </b>
      <div class="bar">
        <i style={{ transform: `scaleX(${(of ? Math.min(1, now / of) : 0).toFixed(3)})` }} />
      </div>
    </div>
  );

  return (
    <div class={`contractview${elder ? ' has-elder' : ''}`}>
      <header class="contract-banner">
        <img src={art(`place-${o.biome}`)} alt="" />
        <div class="banner-words">
          <span class={`chip${a && !a.done ? ' hot' : ''}`}>{stateLabel}</span>
          <h3>{o.name}</h3>
          <p>
            <b class="c-place">{B?.name || o.biome}</b> ·{' '}
            <b class={`c-goal-${o.goal}`}>{goal.name}</b> · Level <b class="c-num">{o.tier}</b>
          </p>
        </div>
      </header>

      <section class="contract-progress">
        {a ? (
          <>
            <h3 class="label">Progress</h3>
            <div class="progs">
              {fights.length > 0 && renderProgressRow('Islands cleared', clearedFights, fights.length)}
              {o.goal === 'recover' && renderProgressRow('Survey cores', a.cores, a.need)}
              {o.goal === 'hunt' && (
                <div class={`prog${a.done ? ' done' : ''}`}>
                  <span>{elder ? elder.name : 'The elder'}</span>
                  <b class={a.done ? 'c-good' : 'c-foe'}>
                    {a.done ? 'Down' : 'On the last island'}
                  </b>
                </div>
              )}
              {a.markNeed > 0 && renderProgressRow('Survey marks', a.marks, a.markNeed)}
              <div class="prog">
                <span>Beacon</span>
                <b class={a.revealed ? 'c-good' : 'quiet'}>
                  {a.revealed ? 'Found: the rest is on your map' : 'Not found'}
                </b>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 class="label">The job</h3>
            <p>{goal.brief}</p>
            <p class="quiet">Step onto the pad at the south gate to go down.</p>
          </>
        )}

        {T.rank > 0 && (
          <>
            <div class="threat-head">
              <h3 class="label">This time</h3>
              <ThreatRow offer={o} bare />
            </div>
            {T.list.length > 0 && (
              <ul class="conds">
                {T.list.map((c) => (
                  <li key={c.id}>
                    <b>{c.name}</b>
                    {c.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {boon && (
          <div class="card boon-card">
            <div class="label">Boon</div>
            <p>
              <strong class="c-good">{boon.name}</strong> {boon.desc}
            </p>
          </div>
        )}

        <div class="contract-pay">
          <h3 class="label">Pays</h3>
          <div class="stats pay">
            <div>
              <span>Experience</span>
              <b class="c-xp">{o.xp}</b>
            </div>
            <div>
              <span>Glint</span>
              <b class="c-coin">{o.glint}</b>
            </div>
            {a ? (
              <>
                <div>
                  <span>Time</span>
                  <b>{formatDuration(a.time)}</b>
                </div>
                <div>
                  <span>Felled</span>
                  <b class="c-foe">{a.kills}</b>
                </div>
              </>
            ) : (
              <AlsoPays game={game} offer={o} />
            )}
          </div>
          {!a && (
            <button
              type="button"
              class="btn"
              data-act="abandon"
              onClick={() => {
                game.missions.drop();
                onMutate();
              }}
            >
              Hand it back
            </button>
          )}
        </div>
      </section>

      {elder && bossId && (
        <aside class="contract-elder" aria-label="The elder">
          <LiveFigure game={game} what={`elder:${bossId}`} label={`${elder.name}.`} />
          <div class="who-card">
            <strong class="c-foe">{elder.name}</strong>
            <small>{elder.epithet || 'An elder'}</small>
            <div class="who-level">
              <span class="quiet">{a ? 'Holds the last island' : 'Waits on the last island'}</span>
              <span class={a && a.done ? 'c-good' : 'c-foe'}>
                {a && a.done ? 'Down' : 'Standing'}
              </span>
            </div>
            {elderRelics.length > 0 && (
              <div class="relic-row">
                <span class="label">Carries</span>
                {elderRelics.map((r) => {
                  const found = Boolean(s.relics && s.relics[r.id]);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      class={`chip relic-chip${found ? ' found' : ''}`}
                      data-act="note"
                      data-tip={`${r.name} (${SLOT_KINDS[r.slot].toLowerCase()})${
                        found ? ', found' : ''
                      }: ${r.text}`}
                      title={r.text}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
