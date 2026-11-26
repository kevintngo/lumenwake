import { useEffect, useRef } from 'preact/hooks';
import { biomeById } from '../../data/biomes';
import { THREATS } from '../../data/threat';
import type { GameContext } from '../../types/game-context';
import type { ContractOffer } from '../../types/mission';
import { TOOL_ICONS } from '../icons';

export interface DepthChoiceState {
  depth: number;
  hunt: boolean;
  picked: number;
  payGlint: number;
  payXp: number;
  pieces: number;
  relics: number;
  next: ContractOffer | null;
}

export function readDepthChoice(game: GameContext): DepthChoiceState | null {
  const ms = game.missions;
  const a = ms.active;
  const r = ms.run;
  if (!a || !a.choosing || !r) return null;
  return {
    depth: a.offer.depth || 1,
    hunt: a.offer.goal === 'hunt',
    picked: r.haul.glint,
    payGlint: r.haul.payGlint,
    payXp: r.haul.payXp,
    pieces: r.haul.items.length,
    relics: r.haul.relics.length,
    next: ms.deeperOffer(),
  };
}

interface DepthChoiceProps {
  game: GameContext;
  choice: DepthChoiceState | null;
  touch: boolean;
}

/** after the elder (or at the far pad): bank the haul and lift out, or go one depth further down */
export function DepthChoice({ game, choice, touch }: DepthChoiceProps) {
  const outRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (choice && outRef.current && !touch) outRef.current.focus({ preventScroll: true });
  }, [choice, touch]);
  const next = choice?.next || null;
  const B = next ? biomeById(next.biome) : null;
  const threat = next ? THREATS[next.threat ?? 0] : null;
  const atStake = choice ? choice.depth > 1 : false;
  return (
    <section id="depth-choice" class="plate" role="dialog" aria-labelledby="dc-title" hidden={!choice}>
      {choice && (
        <>
          <header class="dc-head">
            <small class="c-place">{choice.depth > 1 ? `Depth ${choice.depth} cleared` : 'Contract done'}</small>
            <h2 id="dc-title">{choice.hunt ? 'The elder is down' : 'The way is clear'}</h2>
          </header>
          <div class="dc-haul" aria-label="Your haul so far">
            <div>
              {TOOL_ICONS.coin()}
              <span>
                <small>Pay waiting</small>
                <b class="c-coin">{choice.payGlint}</b> <b class="c-xp">+{choice.payXp} xp</b>
              </span>
            </div>
            <div>
              {TOOL_ICONS.coin()}
              <span>
                <small>Picked up</small>
                <b class="c-coin">{choice.picked}</b>
              </span>
            </div>
            <div>
              {TOOL_ICONS.pack()}
              <span>
                <small>Pieces found</small>
                <b class="c-num">{choice.pieces}</b>
                {choice.relics > 0 && <b class="c-relic"> +{choice.relics} relic</b>}
              </span>
            </div>
          </div>
          <div class="dc-options">
            <button
              ref={outRef}
              type="button"
              class="btn primary dc-out"
              onClick={(e) => {
                if (e.detail) e.currentTarget.blur();
                game.missions.choose(false);
              }}
            >
              {TOOL_ICONS.lift()}
              <span class="dc-words">
                <strong>Lift out{!touch && <kbd>O</kbd>}</strong>
                <span>Bring the whole haul home.</span>
              </span>
            </button>
            {next && (
              <button
                type="button"
                class="btn dc-deep"
                onClick={(e) => {
                  if (e.detail) e.currentTarget.blur();
                  game.missions.choose(true);
                }}
              >
                {TOOL_ICONS.deeper()}
                <span class="dc-words">
                  <strong>Go deeper{!touch && <kbd>N</kbd>}</strong>
                  <span>
                    Depth {next.depth}: <b class="c-place">{B?.name}</b>, threat{' '}
                    <b class="c-foe">{threat?.name}</b>, a stronger elder.
                  </span>
                  <span>
                    Pays <b class="c-coin">+{next.glint}</b> <b class="c-xp">+{next.xp} xp</b> and a prize.{' '}
                    <b class="c-bad">{atStake ? 'Fall' : 'Fall down there'} and you lose half the haul.</b>
                  </span>
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
